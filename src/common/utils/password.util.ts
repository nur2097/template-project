import * as bcrypt from "bcrypt";
import {
  PasswordPolicyUtil,
  PasswordPolicyOptions,
  PasswordValidationResult,
  PersonalInfo,
} from "./password-policy.util";
import { BadRequestException } from "@nestjs/common";

export class PasswordUtil {
  private static readonly SALT_ROUNDS = 10;

  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async compare(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async isValidPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return this.compare(password, hashedPassword);
  }

  /**
   * Validate password against policy and throw exception if invalid
   */
  static validatePassword(
    password: string,
    policy?: PasswordPolicyOptions,
    personalInfo?: PersonalInfo
  ): PasswordValidationResult {
    const result = PasswordPolicyUtil.validate(password, policy, personalInfo);

    if (!result.isValid) {
      const recommendations = PasswordPolicyUtil.getRecommendations(result);

      throw new BadRequestException({
        message: "Password does not meet security requirements",
        errors: result.errors,
        recommendations,
        score: result.score,
        strength: PasswordPolicyUtil.getStrengthLevel(result.score),
      });
    }

    return result;
  }

  /**
   * Check password strength without throwing exception
   */
  static checkPasswordStrength(
    password: string,
    policy?: PasswordPolicyOptions,
    personalInfo?: PersonalInfo
  ): PasswordValidationResult & { strength: string } {
    const result = PasswordPolicyUtil.validate(password, policy, personalInfo);

    return {
      ...result,
      strength: PasswordPolicyUtil.getStrengthLevel(result.score),
    };
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(
    length?: number,
    policy?: PasswordPolicyOptions
  ): string {
    return PasswordPolicyUtil.generate(length, policy);
  }
}
