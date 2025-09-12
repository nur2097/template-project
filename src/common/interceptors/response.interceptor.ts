import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";
import { StandardResponse } from "../utils/response.util";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // Skip transformation for 204 No Content responses
        if (response.statusCode === 204) {
          return; // Return undefined for no content
        }

        // Skip transformation for binary/stream responses
        if (this.isBinaryOrStreamResponse(response, data)) {
          return data; // Return as-is for binary/file responses
        }

        // Skip transformation if headers already sent (SSE, chunked responses)
        if (response.headersSent) {
          return data;
        }

        // Skip transformation if data is already in standard format
        if (this.isStandardResponse(data)) {
          // Add request context if missing
          if (!data.path) {
            data.path = request.url;
            data.method = request.method;
            data.requestId =
              request.headers["x-correlation-id"] || this.generateRequestId();
          }
          return data;
        }

        // Transform to standard response format
        const statusCode = response.statusCode || 200;
        const timestamp = new Date().toISOString();
        const requestId =
          request.headers["x-correlation-id"] || this.generateRequestId();

        const standardResponse: StandardResponse = {
          statusCode,
          timestamp,
          path: request.url,
          method: request.method,
          message: this.getSuccessMessage(request.method, statusCode),
          requestId: requestId as string,
          _isStandardResponse: true, // Internal marker to prevent false positives
        };

        // Add data if exists
        if (data !== undefined && data !== null) {
          // Handle paginated responses
          if (
            data &&
            typeof data === "object" &&
            "data" in data &&
            "meta" in data
          ) {
            standardResponse.data = data.data;
            standardResponse.meta = data.meta;
            standardResponse.message = "Data retrieved successfully";
          } else {
            standardResponse.data = data;
          }
        }

        return standardResponse;
      })
    );
  }

  private isStandardResponse(data: any): boolean {
    // More comprehensive check to avoid false positives
    return (
      data &&
      typeof data === "object" &&
      "statusCode" in data &&
      "timestamp" in data &&
      "message" in data &&
      "path" in data &&
      "requestId" in data &&
      // Ensure statusCode is a number (HTTP status code)
      typeof data.statusCode === "number" &&
      // Ensure timestamp is a string (ISO format)
      typeof data.timestamp === "string" &&
      // Additional marker to confirm it's our standard response
      data._isStandardResponse !== false
    );
  }

  private getSuccessMessage(method: string, statusCode: number): string {
    if (statusCode === 201) return "Resource created successfully";
    if (statusCode === 204) return "Operation completed successfully";

    switch (method.toUpperCase()) {
      case "GET":
        return "Data retrieved successfully";
      case "POST":
        return "Resource created successfully";
      case "PUT":
        return "Resource updated successfully";
      case "PATCH":
        return "Resource updated successfully";
      case "DELETE":
        return "Resource deleted successfully";
      default:
        return "Operation completed successfully";
    }
  }

  private isBinaryOrStreamResponse(response: any, data: any): boolean {
    // Check if response has binary content type
    const contentType = response.getHeader("content-type") || "";
    const binaryTypes = [
      "application/octet-stream",
      "application/pdf",
      "image/",
      "video/",
      "audio/",
      "application/zip",
      "application/x-",
    ];

    if (binaryTypes.some((type) => contentType.toLowerCase().includes(type))) {
      return true;
    }

    // Check if data is a Buffer or Stream
    if (Buffer.isBuffer(data)) {
      return true;
    }

    // Check if data is a stream-like object
    if (
      data &&
      typeof data === "object" &&
      (typeof data.pipe === "function" || typeof data.read === "function")
    ) {
      return true;
    }

    return false;
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 12);
    return `${timestamp}-${random.substr(0, 8)}-${random.substr(8)}`;
  }
}
