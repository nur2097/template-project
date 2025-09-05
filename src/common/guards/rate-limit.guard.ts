import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CacheService } from "../../shared/cache/cache.service";
import { Request } from "express";
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from "../decorators/rate-limit.decorator";

@Injectable()
export class EnhancedRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(EnhancedRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Get rate limit options from decorator
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    // Check if request should be skipped
    if (rateLimitOptions.skip && rateLimitOptions.skip(request)) {
      return true;
    }

    // Generate cache key
    const key = this.generateKey(request, rateLimitOptions);

    try {
      // Get current request count
      const currentCount = await this.getCurrentCount(key);

      // Check if limit exceeded
      if (currentCount >= rateLimitOptions.max) {
        // Call custom handler if provided
        if (rateLimitOptions.onLimitReached) {
          rateLimitOptions.onLimitReached(request, key);
        }

        this.logger.warn(
          `Rate limit exceeded for key: ${key}, count: ${currentCount}`
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              rateLimitOptions.message ||
              "Too many requests, please try again later.",
            error: "Too Many Requests",
            retryAfter: Math.ceil(rateLimitOptions.windowMs / 1000),
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Increment counter
      await this.incrementCounter(key, rateLimitOptions.windowMs);

      // Set response headers
      this.setRateLimitHeaders(
        context,
        currentCount + 1,
        rateLimitOptions.max,
        rateLimitOptions.windowMs
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Rate limiting error: ${error.message}`, error.stack);
      return true; // Allow request on cache errors
    }
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }

    // Default key generation based on IP and endpoint
    const ip = this.getClientIp(request);
    const endpoint = `${request.method}:${request.route?.path || request.path}`;

    return `rate_limit:${ip}:${endpoint}`;
  }

  private getClientIp(request: Request): string {
    return ((request.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      request.headers["x-real-ip"] ||
      request.connection?.remoteAddress ||
      (request.socket as any)?.remoteAddress ||
      "unknown") as string;
  }

  private async getCurrentCount(key: string): Promise<number> {
    const count = await this.cacheService.get<number>(key);
    return count || 0;
  }

  private async incrementCounter(key: string, windowMs: number): Promise<void> {
    const current = await this.getCurrentCount(key);
    await this.cacheService.set(key, current + 1, Math.ceil(windowMs / 1000));
  }

  private setRateLimitHeaders(
    context: ExecutionContext,
    current: number,
    max: number,
    windowMs: number
  ): void {
    const response = context.switchToHttp().getResponse();

    response.setHeader("X-RateLimit-Limit", max);
    response.setHeader("X-RateLimit-Remaining", Math.max(0, max - current));
    response.setHeader(
      "X-RateLimit-Reset",
      new Date(Date.now() + windowMs).getTime()
    );
    response.setHeader("X-RateLimit-Window", windowMs);
  }
}

// Keep the existing ThrottlerGuard for backward compatibility
import { ThrottlerGuard, ThrottlerModuleOptions } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { ThrottlerStorage } from "@nestjs/throttler/dist/throttler-storage.interface";

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService
  ) {
    super(options, storageService, reflector);
  }

  protected async generateKeys(
    context: ExecutionContext,
    suffix: string
  ): Promise<string[]> {
    const request = context.switchToHttp().getRequest();

    // Use user ID if authenticated, otherwise use IP
    const userId = request.user?.sub || request.user?.id;
    const ip = request.ip || request.socket.remoteAddress;

    const identifier = userId ? `user:${userId}` : `ip:${ip}`;

    return [`${identifier}:${suffix}`];
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Custom tracker for different rate limiting strategies
    const userId = req.user?.sub || req.user?.id;
    const ip = req.ip || req.socket.remoteAddress;

    // Authenticated users get higher limits
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Skip rate limiting for health checks and metrics endpoints
    const skipPaths = ["/api/health", "/api/metrics", "/api/docs"];
    const path = request.url;

    return skipPaths.some((skipPath) => path.startsWith(skipPath));
  }
}
