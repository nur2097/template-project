import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from "class-validator";

// Company domain validator
@ValidatorConstraint({ name: "isValidCompanyDomain", async: false })
export class CompanyDomainValidator implements ValidatorConstraintInterface {
  validate(domain: string) {
    if (!domain || typeof domain !== "string") {
      return false;
    }

    // Basic domain format validation
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return false;
    }

    // Must have at least one dot (TLD required)
    const parts = domain.split(".");
    if (parts.length < 2) {
      return false;
    }

    // TLD must be at least 2 characters
    const tld = parts[parts.length - 1];
    if (tld.length < 2) {
      return false;
    }

    // Check against common patterns that shouldn't be allowed
    const forbiddenPatterns = [
      /^localhost/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /\.local$/i,
      /\.test$/i,
      /\.example$/i,
      /\.invalid$/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(domain)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage() {
    return "Invalid company domain format";
  }
}

export function IsValidCompanyDomain(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: CompanyDomainValidator,
    });
  };
}

// Phone number validator with country support
@ValidatorConstraint({ name: "isValidPhoneNumber", async: false })
export class PhoneNumberValidator implements ValidatorConstraintInterface {
  validate(phone: string) {
    if (!phone || typeof phone !== "string") {
      return false;
    }

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, "");

    // Must start with + for international format
    if (!cleaned.startsWith("+")) {
      return false;
    }

    // Remove the + for further validation
    const digits = cleaned.substring(1);

    // Must be between 7 and 15 digits (ITU-T E.164 standard)
    if (digits.length < 7 || digits.length > 15) {
      return false;
    }

    // Must contain only digits after +
    if (!/^\d+$/.test(digits)) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return "Phone number must be in international format (e.g., +1234567890)";
  }
}

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: PhoneNumberValidator,
    });
  };
}

// Role name validator
@ValidatorConstraint({ name: "isValidRoleName", async: false })
export class RoleNameValidator implements ValidatorConstraintInterface {
  validate(roleName: string) {
    if (!roleName || typeof roleName !== "string") {
      return false;
    }

    // Must be 2-50 characters
    if (roleName.length < 2 || roleName.length > 50) {
      return false;
    }

    // Must start and end with alphanumeric character
    if (!/^[a-zA-Z0-9]/.test(roleName) || !/[a-zA-Z0-9]$/.test(roleName)) {
      return false;
    }

    // Can contain letters, numbers, spaces, hyphens, underscores
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(roleName)) {
      return false;
    }

    // Cannot contain consecutive spaces or special characters
    if (/[\s\-_]{2,}/.test(roleName)) {
      return false;
    }

    // Reserved role names (case-insensitive)
    const reservedNames = [
      "system",
      "root",
      "admin",
      "administrator",
      "superadmin",
      "super_admin",
      "user",
      "guest",
      "anonymous",
      "public",
      "api",
      "service",
      "daemon",
    ];

    const lowerRoleName = roleName.toLowerCase().trim();
    if (reservedNames.includes(lowerRoleName)) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return "Role name must be 2-50 characters, alphanumeric with spaces/hyphens/underscores, and not be a reserved name";
  }
}

export function IsValidRoleName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: RoleNameValidator,
    });
  };
}

// File upload validator
@ValidatorConstraint({ name: "isValidFileUpload", async: false })
export class FileUploadValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) {
      return false;
    }

    const options = args.constraints[0] || {};
    const {
      allowedMimeTypes = [],
      maxSize = 10 * 1024 * 1024, // 10MB default
      minSize = 0,
      allowedExtensions = [],
    } = options;

    // For Express.Multer.File
    if (value.mimetype && value.size !== undefined) {
      // Check mime type
      if (
        allowedMimeTypes.length > 0 &&
        !allowedMimeTypes.includes(value.mimetype)
      ) {
        return false;
      }

      // Check file size
      if (value.size > maxSize || value.size < minSize) {
        return false;
      }

      // Check extension if original name is available
      if (allowedExtensions.length > 0 && value.originalname) {
        const ext = value.originalname.split(".").pop()?.toLowerCase();
        if (!ext || !allowedExtensions.includes(ext)) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const options = args.constraints[0] || {};
    const {
      allowedMimeTypes = [],
      maxSize = 10 * 1024 * 1024,
      allowedExtensions = [],
    } = options;

    const requirements = [];

    if (allowedMimeTypes.length > 0) {
      requirements.push(`allowed types: ${allowedMimeTypes.join(", ")}`);
    }

    if (allowedExtensions.length > 0) {
      requirements.push(`allowed extensions: ${allowedExtensions.join(", ")}`);
    }

    requirements.push(`max size: ${Math.round(maxSize / 1024 / 1024)}MB`);

    return `Invalid file upload. Requirements: ${requirements.join("; ")}`;
  }
}

export function IsValidFileUpload(
  options?: {
    allowedMimeTypes?: string[];
    maxSize?: number;
    minSize?: number;
    allowedExtensions?: string[];
  },
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: FileUploadValidator,
    });
  };
}
