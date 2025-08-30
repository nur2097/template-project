import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { tap, catchError, finalize } from "rxjs/operators";
import { Request, Response } from "express";
import { LoggerService } from "../logger/logger.service";
import { getCorrelationContext } from "./correlation.interceptor";

interface PerformanceMetrics {
  operation: string;
  duration: number;
  method: string;
  url: string;
  statusCode: number;
  userId?: string;
  companyId?: number;
  userAgent?: string;
  ip?: string;
  correlationId?: string;
  requestId?: string;
  timestamp: Date;
  memoryUsage?: NodeJS.MemoryUsage & {
    rssAbsolute?: number;
    heapUsedAbsolute?: number;
  };
  cpuUsage?: NodeJS.CpuUsage;
  responseSize?: number;
  requestSize?: number;
  metadata?: any;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private readonly VERY_SLOW_REQUEST_THRESHOLD = 5000; // 5 seconds

  constructor(@Optional() private readonly loggerService?: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get performance baseline
    const startTime = process.hrtime.bigint();
    const startCpuUsage = process.cpuUsage();
    const startMemory = process.memoryUsage();

    const method = request.method;
    const url = request.url;
    const userAgent = request.get("User-Agent") || "";
    const ip = request.ip || request.socket.remoteAddress || "";

    // Get user info from correlation context or request
    const correlationContext = getCorrelationContext();
    const userId =
      correlationContext?.userId || (request as any).user?.id || null;
    const companyId =
      correlationContext?.companyId || (request as any).user?.companyId || null;
    const correlationId =
      correlationContext?.correlationId ||
      (request as any).correlationId ||
      null;
    const requestId =
      correlationContext?.requestId || (request as any).requestId || null;

    // Calculate request size
    const requestSize = this.calculateRequestSize(request);

    let responseSize = 0;

    return next.handle().pipe(
      tap((data) => {
        // Calculate response size
        responseSize = this.calculateResponseSize(data);
      }),
      catchError((error) => {
        // Handle errors but still log performance
        return throwError(() => error);
      }),
      finalize(() => {
        // Calculate performance metrics
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const endMemory = process.memoryUsage();
        const statusCode = response.statusCode;

        // Determine if request is slow
        const isSlowRequest = duration > this.SLOW_REQUEST_THRESHOLD;
        const isVerySlowRequest = duration > this.VERY_SLOW_REQUEST_THRESHOLD;

        // Create performance metrics object
        const metrics: PerformanceMetrics = {
          operation: `${method} ${url}`,
          duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
          method,
          url,
          statusCode,
          userId: userId?.toString(),
          companyId,
          userAgent,
          ip,
          correlationId,
          requestId,
          timestamp: new Date(),
          memoryUsage: {
            // CRITICAL FIX: Handle negative memory deltas due to garbage collection
            rss: Math.max(0, endMemory.rss - startMemory.rss),
            heapUsed: Math.max(0, endMemory.heapUsed - startMemory.heapUsed),
            heapTotal: Math.max(0, endMemory.heapTotal - startMemory.heapTotal),
            external: Math.max(0, endMemory.external - startMemory.external),
            arrayBuffers: Math.max(
              0,
              endMemory.arrayBuffers - startMemory.arrayBuffers
            ),
            // Also include absolute values for reference
            rssAbsolute: endMemory.rss,
            heapUsedAbsolute: endMemory.heapUsed,
          },
          cpuUsage: endCpuUsage,
          responseSize,
          requestSize,
          metadata: {
            query: request.query,
            params: request.params,
            isSlowRequest,
            isVerySlowRequest,
            route: request.route?.path,
            controller: context.getClass()?.name,
            handler: context.getHandler()?.name,
          },
        };

        // Log performance based on duration
        if (isVerySlowRequest) {
          this.logger.error(
            `VERY SLOW REQUEST: ${method} ${url} - ${statusCode} - ${duration.toFixed(2)}ms`,
            { correlationId, requestId, userId }
          );
        } else if (isSlowRequest) {
          this.logger.warn(
            `SLOW REQUEST: ${method} ${url} - ${statusCode} - ${duration.toFixed(2)}ms`,
            { correlationId, requestId, userId }
          );
        } else {
          this.logger.log(
            `${method} ${url} - ${statusCode} - ${duration.toFixed(2)}ms`,
            { correlationId, requestId, userId }
          );
        }

        // Log detailed performance to MongoDB if available
        if (this.loggerService) {
          this.loggerService.logPerformance(metrics).catch((err) =>
            this.logger.error("Failed to log performance data", {
              error: err.message,
              correlationId,
              requestId,
            })
          );
        }

        // Add performance headers
        response.setHeader("X-Response-Time", `${duration.toFixed(2)}ms`);
        response.setHeader("X-CPU-Usage-User", `${endCpuUsage.user}`);
        response.setHeader("X-CPU-Usage-System", `${endCpuUsage.system}`);
        response.setHeader(
          "X-Memory-Delta",
          `${Math.round(metrics.memoryUsage.heapUsed / 1024)}KB`
        );

        if (responseSize > 0) {
          response.setHeader(
            "X-Response-Size",
            `${Math.round(responseSize / 1024)}KB`
          );
        }
      })
    );
  }

  private calculateRequestSize(request: Request): number {
    let size = 0;

    // Calculate size of headers
    for (const [key, value] of Object.entries(request.headers)) {
      size +=
        key.length +
        (Array.isArray(value) ? value.join("").length : String(value).length);
    }

    // Calculate size of query parameters
    size += JSON.stringify(request.query).length;

    // Calculate size of body if present
    if (request.body) {
      size += JSON.stringify(request.body).length;
    }

    return size;
  }

  private calculateResponseSize(data: any): number {
    if (!data) return 0;

    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }
}
