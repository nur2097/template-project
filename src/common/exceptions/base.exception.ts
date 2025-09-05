import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Base exception class for all custom business exceptions
 * Provides consistent error structure and logging
 */
export abstract class BaseException extends HttpException {
  public readonly errorCode: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: HttpStatus,
    errorCode: string,
    context?: Record<string, any>
  ) {
    super(
      {
        message,
        errorCode,
        statusCode,
        timestamp: new Date().toISOString(),
        context: context || undefined,
      },
      statusCode
    );

    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
    this.context = context;

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, BaseException.prototype);

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get structured error response for API
   */
  getErrorResponse() {
    return {
      success: false,
      error: {
        code: this.errorCode,
        message: this.message,
        statusCode: this.getStatus(),
        timestamp: this.timestamp,
        ...(this.context && { context: this.context }),
      },
    };
  }

  /**
   * Get error for logging (includes sensitive context if needed)
   */
  getLogContext() {
    return {
      errorCode: this.errorCode,
      message: this.message,
      statusCode: this.getStatus(),
      timestamp: this.timestamp,
      stack: this.stack,
      context: this.context,
    };
  }
}
