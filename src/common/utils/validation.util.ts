export class ValidationUtil {
  static isValidDomain(domain: string): boolean {
    if (!domain || domain.length > 253) {
      return false;
    }

    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!domainRegex.test(domain)) {
      return false;
    }

    const parts = domain.split(".");
    if (parts.length < 2) {
      return false;
    }

    return parts.every(
      (part) =>
        part.length > 0 &&
        part.length <= 63 &&
        !part.startsWith("-") &&
        !part.endsWith("-")
    );
  }

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    if (password.length > 128) {
      errors.push("Password must not exceed 128 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
