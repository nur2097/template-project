import { HttpStatus } from "@nestjs/common";

export interface StandardResponse<T = any> {
  statusCode: number;
  timestamp: string;
  path?: string;
  method?: string;
  message: string;
  data?: T;
  meta?: any;
  requestId?: string;
  _isStandardResponse?: boolean; // Internal marker to prevent false positives
}

export class ResponseUtil {
  /**
   * Create success response with standard format
   */
  static success<T>(
    data: T,
    message = "Operation completed successfully",
    meta?: any,
    statusCode = HttpStatus.OK
  ): StandardResponse<T> {
    return {
      statusCode,
      timestamp: new Date().toISOString(),
      message,
      data,
      ...(meta && { meta }),
      _isStandardResponse: true,
    };
  }

  /**
   * Create paginated response with standard format
   */
  static paginated<T>(
    data: T[],
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    },
    message = "Data retrieved successfully"
  ): StandardResponse<T[]> {
    return {
      statusCode: HttpStatus.OK,
      timestamp: new Date().toISOString(),
      message,
      data,
      meta,
      _isStandardResponse: true,
    };
  }

  /**
   * Create created response with standard format
   */
  static created<T>(
    data: T,
    message = "Resource created successfully"
  ): StandardResponse<T> {
    return {
      statusCode: HttpStatus.CREATED,
      timestamp: new Date().toISOString(),
      message,
      data,
      _isStandardResponse: true,
    };
  }

  /**
   * Create no content response with standard format
   */
  static noContent(
    message = "Operation completed successfully"
  ): StandardResponse {
    return {
      statusCode: HttpStatus.NO_CONTENT,
      timestamp: new Date().toISOString(),
      message,
      _isStandardResponse: true,
    };
  }

  /**
   * Create warning response with standard format (still success but with warning)
   */
  static warning<T>(
    data: T,
    message: string,
    warnings: string[],
    statusCode = HttpStatus.OK
  ): StandardResponse<T> {
    return {
      statusCode,
      timestamp: new Date().toISOString(),
      message,
      data,
      meta: {
        warnings,
      },
      _isStandardResponse: true,
    };
  }
}
