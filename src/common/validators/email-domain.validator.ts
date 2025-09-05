import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from "class-validator";

@ValidatorConstraint({ name: "isAllowedEmailDomain", async: false })
export class EmailDomainValidator implements ValidatorConstraintInterface {
  validate(email: string, args: ValidationArguments) {
    if (!email || typeof email !== "string") {
      return false;
    }

    const allowedDomains: string[] = args.constraints[0] || [];
    const blockedDomains: string[] = args.constraints[1] || [];

    const domain = email.split("@")[1];
    if (!domain) {
      return false;
    }

    const normalizedDomain = domain.toLowerCase();

    // If blocked domains list is provided, check against it
    if (blockedDomains.length > 0) {
      const isBlocked = blockedDomains.some((blockedDomain) => {
        const normalizedBlocked = blockedDomain.toLowerCase();
        // Support wildcard domains (e.g., *.temp-mail.org)
        if (normalizedBlocked.startsWith("*.")) {
          const wildcardDomain = normalizedBlocked.substring(2);
          return normalizedDomain.endsWith(wildcardDomain);
        }
        return normalizedDomain === normalizedBlocked;
      });

      if (isBlocked) {
        return false;
      }
    }

    // If allowed domains list is provided, only allow those
    if (allowedDomains.length > 0) {
      return allowedDomains.some((allowedDomain) => {
        const normalizedAllowed = allowedDomain.toLowerCase();
        // Support wildcard domains
        if (normalizedAllowed.startsWith("*.")) {
          const wildcardDomain = normalizedAllowed.substring(2);
          return normalizedDomain.endsWith(wildcardDomain);
        }
        return normalizedDomain === normalizedAllowed;
      });
    }

    // If no restrictions, allow all valid domains
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const allowedDomains: string[] = args.constraints[0] || [];
    const blockedDomains: string[] = args.constraints[1] || [];

    if (allowedDomains.length > 0) {
      return `Email domain must be one of: ${allowedDomains.join(", ")}`;
    }

    if (blockedDomains.length > 0) {
      return `Email domain is not allowed`;
    }

    return "Invalid email domain";
  }
}

export function IsAllowedEmailDomain(
  allowedDomains?: string[],
  blockedDomains?: string[],
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [allowedDomains || [], blockedDomains || []],
      validator: EmailDomainValidator,
    });
  };
}
