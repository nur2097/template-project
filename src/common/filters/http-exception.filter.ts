import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { LoggerService } from "../logger/logger.service";
import { SanitizerUtil } from "../utils/sanitizer.util";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly loggerService?: LoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.message
      : "Internal server error";

    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const userAgent = request.get("User-Agent") || "";
    const ip = request.ip || request.socket.remoteAddress || "";
    const userId = (request as any).user?.id || null;
    const correlationId = request.headers["x-correlation-id"] || null;

    const errorResponse = {
      errorId,
      statusCode: status,
      message,
      timestamp,
      path,
      method,
      correlationId,
    };

    const errorDetails = {
      errorId,
      message,
      stack: exception.stack,
      status,
      path,
      method,
      userAgent,
      ip,
      userId,
      correlationId,
      timestamp: new Date(),
      metadata: {
        headers: request.headers,
        query: request.query,
        params: request.params,
        body: SanitizerUtil.sanitizeBody(request.body),
      },
    };

    // Log the error
    this.logger.error(`${method} ${path} - ${message}`, {
      ...errorDetails,
      stack: exception.stack,
    });

    // Log to MongoDB if service is available
    if (this.loggerService) {
      this.loggerService.logError(
        message,
        exception.stack,
        GlobalExceptionFilter.name,
        userId,
        errorDetails.metadata
      );
    }

    response.status(status).json(errorResponse);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
