import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, tap, catchError } from "rxjs";
import { LoggerService } from "../logger/logger.service";
import { SanitizerUtil } from "../utils/sanitizer.util";
import { getCorrelationContext } from "./correlation.interceptor";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  constructor(private loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const method = req.method;
    const url = req.url;
    const userAgent = req.get("User-Agent") || "";
    const ip = req.ip || req.socket.remoteAddress;
    const userId = req.user?.id || req.user?.sub;

    // Get correlation context
    const correlationContext = getCorrelationContext();
    const correlationId =
      correlationContext?.correlationId || req.correlationId;
    const requestId = correlationContext?.requestId || req.requestId;

    const startTime = Date.now();

    // Log request with sensitive data masked
    this.loggerService
      .logRequest({
        method,
        url,
        headers: SanitizerUtil.sanitizeHeaders(req.headers),
        body: SanitizerUtil.sanitizeBody(req.body),
        userAgent,
        ip,
        userId,
        correlationId,
      })
      .catch((err) => this.logger.error("Failed to log request", err.stack));

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log response
        this.loggerService
          .logResponse({
            method,
            url,
            statusCode,
            responseTime,
            userId,
            correlationId,
          })
          .catch((err) =>
            this.logger.error("Failed to log response", err.stack)
          );

        // Log performance
        this.loggerService
          .logPerformance({
            operation: `${method} ${url}`,
            duration: responseTime,
            correlationId,
            metadata: {
              context: "HTTP_REQUEST",
              statusCode,
              userId,
              requestId,
            },
          })
          .catch((err) =>
            this.logger.error("Failed to log performance", err.stack)
          );

        // Console log for development with correlation ID
        this.logger.log(
          `${method} ${url} ${statusCode} ${responseTime}ms [${correlationId}]`
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;

        // Log error
        this.loggerService
          .logError(
            `HTTP Error: ${method} ${url}`,
            error.stack,
            "HTTP_REQUEST",
            userId,
            { correlationId, requestId, statusCode: error.status || 500 }
          )
          .catch((err) => this.logger.error("Failed to log error", err.stack));

        this.logger.error(
          `${method} ${url} ERROR ${responseTime}ms - ${error.message} [${correlationId}]`
        );
        throw error;
      })
    );
  }
}
