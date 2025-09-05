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
import { BaseException } from "../exceptions/base.exception";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly loggerService?: LoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine if this is our custom exception or standard HTTP exception
    const isBaseException = exception instanceof BaseException;
    const isHttpException = exception instanceof HttpException;

    const status =
      isBaseException || isHttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = "Internal server error";
    let errorCode = "INTERNAL_SERVER_ERROR";

    if (isBaseException) {
      message = exception.message;
      errorCode = exception.errorCode;
    } else if (isHttpException) {
      const response = exception.getResponse();
      message =
        typeof response === "string"
          ? response
          : (response as any).message || exception.message;
      errorCode = this.getHttpStatusName(status);
    }

    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = this.generateRequestId();
    const userId = (request as any).user?.id || null;
    const correlationId = request.headers["x-correlation-id"] || requestId;

    // Standardized error response format
    const errorResponse = {
      statusCode: status,
      timestamp,
      path,
      method,
      message,
      error: errorCode,
      requestId: correlationId as string,
    };

    // Detailed error information for logging
    const errorDetails = {
      statusCode: status,
      message,
      error: errorCode,
      stack: exception.stack,
      path,
      method,
      requestId: correlationId,
      timestamp,
      userId,
      userAgent: request.get("User-Agent") || "",
      ip: request.ip || request.socket.remoteAddress || "",
      metadata: {
        headers: SanitizerUtil.sanitizeHeaders(request.headers),
        query: request.query,
        params: request.params,
        body: SanitizerUtil.sanitizeBody(request.body),
      },
    };

    // Log the error with proper level
    const logLevel = status >= 500 ? "error" : "warn";
    this.logger[logLevel](`${method} ${path} - ${message}`, {
      ...errorDetails,
      stack: status >= 500 ? exception.stack : undefined, // Only include stack for server errors
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

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 12);
    return `${timestamp}-${random.substr(0, 8)}-${random.substr(8)}`;
  }

  private getHttpStatusName(status: number): string {
    const statusMap: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      405: "METHOD_NOT_ALLOWED",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
      501: "NOT_IMPLEMENTED",
      502: "BAD_GATEWAY",
      503: "SERVICE_UNAVAILABLE",
      504: "GATEWAY_TIMEOUT",
    };

    return statusMap[status] || "HTTP_ERROR";
  }
}
