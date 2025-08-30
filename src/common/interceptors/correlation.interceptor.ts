import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AsyncLocalStorage } from "async_hooks";
import { SanitizerUtil } from "../utils/sanitizer.util";

// Global correlation context storage
export const correlationStorage = new AsyncLocalStorage<{
  correlationId: string;
  userId?: number;
  companyId?: number;
  requestId: string;
  userAgent?: string;
  ip?: string;
  startTime: number;
}>();

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CorrelationInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate unique request ID
    const requestId = uuidv4();
    const startTime = Date.now();

    // Generate or use existing correlation ID
    const correlationId =
      (request.headers["x-correlation-id"] as string) ||
      (request.headers["correlation-id"] as string) ||
      uuidv4();

    // Extract user info if available
    const user = (request as any).user;
    const userId = user?.id || user?.sub;
    const companyId = user?.companyId;
    const userAgent = request.get("User-Agent");
    const ip = request.ip || request.socket.remoteAddress;

    // Set correlation ID in request headers for downstream services
    request.headers["x-correlation-id"] = correlationId;
    request.headers["x-request-id"] = requestId;

    // Set correlation data in request object
    (request as any).correlationId = correlationId;
    (request as any).requestId = requestId;

    // Set correlation ID in response headers
    response.setHeader("X-Correlation-ID", correlationId);
    response.setHeader("X-Request-ID", requestId);

    // Create context for async local storage
    const context_data = {
      correlationId,
      userId,
      companyId,
      requestId,
      userAgent,
      ip,
      startTime,
    };

    // Run the request within correlation context
    return new Observable((observer) => {
      correlationStorage.run(context_data, () => {
        // Log request start
        this.logger.debug(`Request started: ${request.method} ${request.url}`, {
          correlationId,
          requestId,
          userId,
          companyId,
          userAgent,
          ip,
          headers: SanitizerUtil.sanitizeHeaders(request.headers),
        });

        next
          .handle()
          .pipe(
            tap((data) => {
              const duration = Date.now() - startTime;

              // Log successful response
              this.logger.debug(
                `Request completed: ${request.method} ${request.url} - ${response.statusCode}`,
                {
                  correlationId,
                  requestId,
                  userId,
                  companyId,
                  statusCode: response.statusCode,
                  duration,
                  responseSize: JSON.stringify(data).length,
                }
              );

              observer.next(data);
              observer.complete();
            }),
            catchError((error) => {
              const duration = Date.now() - startTime;

              // Log error response
              this.logger.error(
                `Request failed: ${request.method} ${request.url}`,
                {
                  correlationId,
                  requestId,
                  userId,
                  companyId,
                  error: error.message,
                  stack: error.stack,
                  duration,
                  statusCode: error.status || 500,
                }
              );

              observer.error(error);
              return throwError(() => error);
            })
          )
          .subscribe();
      });
    });
  }
}

// Utility function to get current correlation context
export function getCorrelationContext() {
  return correlationStorage.getStore();
}

// Utility function to get correlation ID
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}
