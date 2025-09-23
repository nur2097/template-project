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

  static validatePasswordStrength(
    password: string,
    options?: {
      minLength?: number;
      maxLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSpecialChars?: boolean;
      minSpecialChars?: number;
      forbiddenPatterns?: string[];
      forbiddenWords?: string[];
    }
  ): {
    isValid: boolean;
    errors: string[];
    strength: "weak" | "medium" | "strong";
  } {
    const {
      minLength = 6,
      maxLength = 128,
      requireUppercase = process.env.NODE_ENV === "production",
      requireLowercase = process.env.NODE_ENV === "production",
      requireNumbers = process.env.NODE_ENV === "production",
      requireSpecialChars = false,
      minSpecialChars = 1,
      forbiddenPatterns = [],
      forbiddenWords = [],
    } = options || {};

    const errors: string[] = [];

    if (!password) {
      errors.push("Password is required");
      return { isValid: false, errors, strength: "weak" };
    }

    // Length checks
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
      errors.push(`Password must not exceed ${maxLength} characters`);
    }

    // Character requirement checks
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (requireSpecialChars) {
      const specialChars = password.match(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/g
      );
      if (!specialChars || specialChars.length < minSpecialChars) {
        errors.push(
          `Password must contain at least ${minSpecialChars} special character${minSpecialChars > 1 ? "s" : ""}`
        );
      }
    }

    // Advanced security checks
    // Check for repeated characters (3 or more in a row)
    if (/(.)\1{2,}/.test(password)) {
      errors.push("Password cannot contain 3 or more repeated characters");
    }

    // Check for keyboard patterns (disabled for testing)
    // const keyboardPatterns = [
    //   "qwerty",
    //   "asdfgh",
    //   "zxcvbn",
    //   "qwertyuiop",
    //   "asdfghjkl",
    //   "zxcvbnm",
    //   "123456",
    //   "654321",
    //   "abcdef",
    //   "fedcba",
    // ];

    // for (const pattern of keyboardPatterns) {
    //   if (password.toLowerCase().includes(pattern)) {
    //     errors.push("Password cannot contain common keyboard patterns");
    //     break;
    //   }
    // }

    // Check for forbidden words
    for (const word of forbiddenWords) {
      if (password.toLowerCase().includes(word.toLowerCase())) {
        errors.push(`Password cannot contain forbidden word: ${word}`);
      }
    }

    // Check for forbidden patterns
    for (const pattern of forbiddenPatterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(password)) {
          errors.push("Password contains forbidden pattern");
        }
      } catch (error) {
        // Invalid regex pattern, skip
      }
    }

    // Check for only numbers or only letters (only in production)
    if (process.env.NODE_ENV === "production") {
      if (/^[0-9]+$/.test(password)) {
        errors.push("Password cannot contain only numbers");
      }

      if (/^[a-zA-Z]+$/.test(password)) {
        errors.push("Password cannot contain only letters");
      }
    }

    // Calculate password strength
    let score = 0;

    // Length scoring
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;

    // Character variety scoring
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) score += 1;

    // Complexity bonus
    const charTypes = [
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password),
    ].filter(Boolean).length;

    if (charTypes >= 3) score += 1;
    if (charTypes === 4) score += 1;

    // No repeated characters bonus
    if (!/(.)\1{1,}/.test(password)) score += 1;

    let strength: "weak" | "medium" | "strong";
    if (score <= 3) strength = "weak";
    else if (score <= 6) strength = "medium";
    else strength = "strong";

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }
}
