import { ApiProperty } from "@nestjs/swagger";

export class StandardResponseDto<T = any> {
  @ApiProperty({
    description: "HTTP status code",
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: "Response timestamp in ISO format",
    example: "2024-01-01T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Response message",
    example: "Operation completed successfully",
  })
  message: string;

  @ApiProperty({
    description: "Response data",
    type: "object",
  })
  data: T;

  @ApiProperty({
    description: "Additional metadata (optional)",
    required: false,
    type: "object",
  })
  meta?: any;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: "HTTP status code",
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: "Error timestamp in ISO format",
    example: "2024-01-01T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Error message",
    example: "Validation failed",
  })
  message: string;

  @ApiProperty({
    description: "Specific error code for identification",
    example: "VALIDATION_ERROR",
  })
  errorCode: string;

  @ApiProperty({
    description: "Additional error context (optional)",
    required: false,
    type: "object",
  })
  context?: Record<string, any>;
}
