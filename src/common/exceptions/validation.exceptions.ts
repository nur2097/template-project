import { HttpStatus } from "@nestjs/common";
import { BaseException } from "./base.exception";

/**
 * Validation and input-related exceptions
 */

export class ValidationException extends BaseException {
  constructor(field: string, value: any, constraint: string) {
    super(
      `Validation failed for field '${field}': ${constraint}`,
      HttpStatus.BAD_REQUEST,
      "VALIDATION_ERROR",
      { field, value, constraint }
    );
  }
}

export class InvalidEmailFormatException extends BaseException {
  constructor(email: string) {
    super(
      `Email format is invalid: ${email}`,
      HttpStatus.BAD_REQUEST,
      "INVALID_EMAIL_FORMAT",
      { email }
    );
  }
}

export class InvalidPhoneNumberException extends BaseException {
  constructor(phoneNumber: string) {
    super(
      `Phone number format is invalid: ${phoneNumber}`,
      HttpStatus.BAD_REQUEST,
      "INVALID_PHONE_NUMBER",
      { phoneNumber }
    );
  }
}

export class InvalidDateRangeException extends BaseException {
  constructor(startDate: Date, endDate: Date) {
    super(
      "Start date must be before end date",
      HttpStatus.BAD_REQUEST,
      "INVALID_DATE_RANGE",
      { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
    );
  }
}

export class InvalidSlugException extends BaseException {
  constructor(slug: string, entityType: string) {
    super(
      `Invalid ${entityType} slug format: ${slug}. Must contain only lowercase letters, numbers, and hyphens.`,
      HttpStatus.BAD_REQUEST,
      "INVALID_SLUG_FORMAT",
      { slug, entityType }
    );
  }
}

export class InvalidDomainException extends BaseException {
  constructor(domain: string) {
    super(
      `Invalid domain format: ${domain}`,
      HttpStatus.BAD_REQUEST,
      "INVALID_DOMAIN_FORMAT",
      { domain }
    );
  }
}

export class InvalidUUIDException extends BaseException {
  constructor(uuid: string, field?: string) {
    super(
      `Invalid UUID format${field ? ` for ${field}` : ""}: ${uuid}`,
      HttpStatus.BAD_REQUEST,
      "INVALID_UUID_FORMAT",
      { uuid, field }
    );
  }
}

export class FileSizeExceededException extends BaseException {
  constructor(
    filename: string,
    actualSize: number,
    maxSize: number,
    sizeUnit: string = "bytes"
  ) {
    super(
      `File '${filename}' exceeds maximum size limit`,
      HttpStatus.BAD_REQUEST,
      "FILE_SIZE_EXCEEDED",
      {
        filename,
        actualSize,
        maxSize,
        sizeUnit,
        actualSizeMB: Math.round(actualSize / 1024 / 1024),
        maxSizeMB: Math.round(maxSize / 1024 / 1024),
      }
    );
  }
}

export class UnsupportedFileTypeException extends BaseException {
  constructor(filename: string, fileType: string, supportedTypes: string[]) {
    super(
      `Unsupported file type for '${filename}': ${fileType}`,
      HttpStatus.BAD_REQUEST,
      "UNSUPPORTED_FILE_TYPE",
      { filename, fileType, supportedTypes }
    );
  }
}

export class InvalidFileException extends BaseException {
  constructor(filename: string, reason: string) {
    super(
      `Invalid file '${filename}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      "INVALID_FILE",
      { filename, reason }
    );
  }
}

export class MissingRequiredFieldException extends BaseException {
  constructor(fields: string[], context?: string) {
    super(
      `Missing required fields: ${fields.join(", ")}${context ? ` (${context})` : ""}`,
      HttpStatus.BAD_REQUEST,
      "MISSING_REQUIRED_FIELDS",
      { fields, context }
    );
  }
}

export class InvalidFieldCombinationException extends BaseException {
  constructor(fields: string[], rule: string) {
    super(
      `Invalid field combination: ${fields.join(", ")} - ${rule}`,
      HttpStatus.BAD_REQUEST,
      "INVALID_FIELD_COMBINATION",
      { fields, rule }
    );
  }
}

export class ValueOutOfRangeException extends BaseException {
  constructor(field: string, value: number, min?: number, max?: number) {
    let message = `Value for '${field}' is out of range: ${value}`;
    if (min !== undefined && max !== undefined) {
      message += ` (allowed: ${min}-${max})`;
    } else if (min !== undefined) {
      message += ` (minimum: ${min})`;
    } else if (max !== undefined) {
      message += ` (maximum: ${max})`;
    }

    super(message, HttpStatus.BAD_REQUEST, "VALUE_OUT_OF_RANGE", {
      field,
      value,
      min,
      max,
    });
  }
}

export class DuplicateValueException extends BaseException {
  constructor(field: string, value: any, entityType?: string) {
    super(
      `Duplicate value for '${field}': ${value}${entityType ? ` in ${entityType}` : ""}`,
      HttpStatus.CONFLICT,
      "DUPLICATE_VALUE",
      { field, value, entityType }
    );
  }
}

export class InvalidQueryParameterException extends BaseException {
  constructor(parameter: string, value: any, expectedFormat: string) {
    super(
      `Invalid query parameter '${parameter}': ${value}. Expected: ${expectedFormat}`,
      HttpStatus.BAD_REQUEST,
      "INVALID_QUERY_PARAMETER",
      { parameter, value, expectedFormat }
    );
  }
}

export class PaginationException extends BaseException {
  constructor(page?: number, limit?: number, maxLimit?: number) {
    let message = "Invalid pagination parameters";
    const context: any = {};

    if (page !== undefined && page < 1) {
      message = "Page number must be greater than 0";
      context.page = page;
    }

    if (limit !== undefined && limit < 1) {
      message = "Limit must be greater than 0";
      context.limit = limit;
    }

    if (maxLimit && limit && limit > maxLimit) {
      message = `Limit cannot exceed ${maxLimit}`;
      context.limit = limit;
      context.maxLimit = maxLimit;
    }

    super(message, HttpStatus.BAD_REQUEST, "PAGINATION_ERROR", context);
  }
}
