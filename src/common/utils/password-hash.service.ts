import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { ConfigurationService } from "../../config/configuration.service";
import {
  PasswordPolicyUtil,
  PasswordPolicyOptions,
  PasswordValidationResult,
  PersonalInfo,
} from "./password-policy.util";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class PasswordHashService {
  constructor(private readonly configService: ConfigurationService) {}

  private getSaltRounds(): number {
    return this.configService.bcryptRounds || 12; // Default to 12 for production security
  }

  async hash(password: string): Promise<string> {
    const saltRounds = this.getSaltRounds();
    return bcrypt.hash(password, saltRounds);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async isValidPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return this.compare(password, hashedPassword);
  }

  /**
   * Validate password against policy and throw exception if invalid
   */
  validatePassword(
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
  checkPasswordStrength(
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
  generateSecurePassword(
    length?: number,
    policy?: PasswordPolicyOptions
  ): string {
    return PasswordPolicyUtil.generate(length, policy);
  }

  /**
   * Hash password with validation
   */
  async hashPasswordWithValidation(
    password: string,
    policy?: PasswordPolicyOptions,
    personalInfo?: PersonalInfo
  ): Promise<string> {
    // Validate password first
    this.validatePassword(password, policy, personalInfo);

    // Hash the password
    return this.hash(password);
  }
}
