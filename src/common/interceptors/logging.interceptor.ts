import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, tap, catchError } from "rxjs";
import { LoggerService } from "../../modules/logger/logger.service";

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
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.userId;

    const startTime = Date.now();

    // Log request
    this.loggerService
      .logRequest({
        method,
        url,
        headers: req.headers,
        body: req.body,
        userAgent,
        ip,
        userId,
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
          })
          .catch((err) =>
            this.logger.error("Failed to log response", err.stack),
          );

        // Log performance
        this.loggerService
          .logPerformance({
            operation: `${method} ${url}`,
            duration: responseTime,
            context: "HTTP_REQUEST",
            metadata: { statusCode, userId },
          })
          .catch((err) =>
            this.logger.error("Failed to log performance", err.stack),
          );

        // Console log for development
        this.logger.log(`${method} ${url} ${statusCode} ${responseTime}ms`);
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
          )
          .catch((err) => this.logger.error("Failed to log error", err.stack));

        this.logger.error(
          `${method} ${url} ERROR ${responseTime}ms - ${error.message}`,
        );
        throw error;
      }),
    );
  }
}
