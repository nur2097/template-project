import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModuleOptions } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
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
