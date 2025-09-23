export interface PasswordPolicyOptions {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  forbidCommonPasswords?: boolean;
  forbidPersonalInfo?: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
}

export interface PersonalInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

export class PasswordPolicyUtil {
  private static readonly COMMON_PASSWORDS = [
    "password",
    "123456",
    "123456789",
    "12345678",
    "12345",
    "qwerty",
    "abc123",
    "password123",
    "admin",
    "letmein",
    "welcome",
    "monkey",
    "1234567890",
    "dragon",
    "football",
    "baseball",
    "mustang",
    "access",
    "master",
    "michael",
    "shadow",
    "superman",
    "1234567",
    "trustno1",
    "princess",
    "passw0rd",
  ];

  private static readonly SPECIAL_CHARS =
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

  static readonly DEFAULT_POLICY: PasswordPolicyOptions = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    forbidCommonPasswords: false,
    forbidPersonalInfo: false,
  };

  /**
   * Validate password against policy
   */
  static validate(
    password: string,
    policy: PasswordPolicyOptions = this.DEFAULT_POLICY,
    personalInfo?: PersonalInfo
  ): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length validation
    if (policy.minLength && password.length < policy.minLength) {
      errors.push(
        `Password must be at least ${policy.minLength} characters long`
      );
    } else if (policy.minLength && password.length >= policy.minLength) {
      score += 20;
    }

    if (policy.maxLength && password.length > policy.maxLength) {
      errors.push(`Password must not exceed ${policy.maxLength} characters`);
    }

    // Character requirements
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    } else if (policy.requireUppercase && /[A-Z]/.test(password)) {
      score += 15;
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    } else if (policy.requireLowercase && /[a-z]/.test(password)) {
      score += 15;
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    } else if (policy.requireNumbers && /\d/.test(password)) {
      score += 15;
    }

    if (policy.requireSpecialChars && !this.SPECIAL_CHARS.test(password)) {
      errors.push("Password must contain at least one special character");
    } else if (
      policy.requireSpecialChars &&
      this.SPECIAL_CHARS.test(password)
    ) {
      score += 15;
    }

    // Common passwords check
    if (policy.forbidCommonPasswords && this.isCommonPassword(password)) {
      errors.push(
        "Password is too common, please choose a more secure password"
      );
    } else if (
      policy.forbidCommonPasswords &&
      !this.isCommonPassword(password)
    ) {
      score += 10;
    }

    // Personal information check
    if (
      policy.forbidPersonalInfo &&
      personalInfo &&
      this.containsPersonalInfo(password, personalInfo)
    ) {
      errors.push("Password should not contain personal information");
    } else if (
      policy.forbidPersonalInfo &&
      personalInfo &&
      !this.containsPersonalInfo(password, personalInfo)
    ) {
      score += 10;
    }

    // Additional scoring for complexity
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars >= 8) score += 10;

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(100, score),
    };
  }

  /**
   * Get password strength level
   */
  static getStrengthLevel(
    score: number
  ): "very-weak" | "weak" | "fair" | "good" | "strong" {
    if (score < 20) return "very-weak";
    if (score < 40) return "weak";
    if (score < 60) return "fair";
    if (score < 80) return "good";
    return "strong";
  }

  /**
   * Generate secure password
   */
  static generate(
    length: number = 12,
    policy: PasswordPolicyOptions = this.DEFAULT_POLICY
  ): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let charset = "";
    let requiredChars = "";

    if (policy.requireLowercase !== false) {
      charset += lowercase;
      requiredChars += lowercase[Math.floor(Math.random() * lowercase.length)];
    }

    if (policy.requireUppercase !== false) {
      charset += uppercase;
      requiredChars += uppercase[Math.floor(Math.random() * uppercase.length)];
    }

    if (policy.requireNumbers !== false) {
      charset += numbers;
      requiredChars += numbers[Math.floor(Math.random() * numbers.length)];
    }

    if (policy.requireSpecialChars !== false) {
      charset += specialChars;
      requiredChars +=
        specialChars[Math.floor(Math.random() * specialChars.length)];
    }

    // Fill remaining length
    let password = requiredChars;
    for (let i = requiredChars.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Check if password is in common passwords list
   */
  private static isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return this.COMMON_PASSWORDS.some(
      (common) =>
        lowerPassword === common ||
        lowerPassword.includes(common) ||
        common.includes(lowerPassword)
    );
  }

  /**
   * Check if password contains personal information
   */
  private static containsPersonalInfo(
    password: string,
    personalInfo: PersonalInfo
  ): boolean {
    const lowerPassword = password.toLowerCase();

    const checkFields = [
      personalInfo.firstName,
      personalInfo.lastName,
      personalInfo.email?.split("@")[0], // Username part of email
      personalInfo.phoneNumber?.replace(/\D/g, ""), // Phone without special chars
    ];

    return checkFields.some((field) => {
      if (!field || field.length < 3) return false;
      const lowerField = field.toLowerCase();
      return (
        lowerPassword.includes(lowerField) || lowerField.includes(lowerPassword)
      );
    });
  }

  /**
   * Get policy recommendations based on validation results
   */
  static getRecommendations(result: PasswordValidationResult): string[] {
    if (result.isValid) return ["Password meets all requirements"];

    const recommendations: string[] = [];

    if (result.score < 40) {
      recommendations.push(
        "Consider using a longer password with mixed character types"
      );
    }

    if (result.errors.some((e) => e.includes("uppercase"))) {
      recommendations.push("Add uppercase letters (A-Z)");
    }

    if (result.errors.some((e) => e.includes("lowercase"))) {
      recommendations.push("Add lowercase letters (a-z)");
    }

    if (result.errors.some((e) => e.includes("number"))) {
      recommendations.push("Add numbers (0-9)");
    }

    if (result.errors.some((e) => e.includes("special character"))) {
      recommendations.push("Add special characters (!@#$%^&*)");
    }

    if (result.errors.some((e) => e.includes("common"))) {
      recommendations.push("Avoid common passwords");
    }

    if (result.errors.some((e) => e.includes("personal"))) {
      recommendations.push("Avoid using personal information");
    }

    return recommendations;
  }
}
