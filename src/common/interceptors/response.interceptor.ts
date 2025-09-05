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
    return (
      data &&
      typeof data === "object" &&
      "statusCode" in data &&
      "timestamp" in data &&
      "message" in data
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

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 12);
    return `${timestamp}-${random.substr(0, 8)}-${random.substr(8)}`;
  }
}
