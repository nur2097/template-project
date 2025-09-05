import { SetMetadata } from "@nestjs/common";
import { Request } from "express";

export interface RateLimitOptions {
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Maximum number of requests per window
   */
  max: number;
  /**
   * Message to send when rate limit is exceeded
   */
  message?: string;
  /**
   * Skip function to bypass rate limiting
   */
  skip?: (req: Request) => boolean;
  /**
   * Key generator function
   */
  keyGenerator?: (req: Request) => string;
  /**
   * Custom handler for rate limit exceeded
   */
  onLimitReached?: (req: Request, key: string) => void;
}

export const RATE_LIMIT_KEY = "rate_limit";

/**
 * Enhanced rate limiting decorator with custom options
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Common rate limiting presets
 */
export class RateLimitPresets {
  /**
   * Strict rate limiting for login attempts
   * 5 attempts per 15 minutes
   */
  static readonly LOGIN = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: "Too many login attempts, please try again in 15 minutes",
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const email = req.body?.email || "unknown";
      return `login:${ip}:${email}`;
    },
  };

  /**
   * Medium rate limiting for registration
   * 3 attempts per hour
   */
  static readonly REGISTER = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: "Too many registration attempts, please try again later",
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      return `register:${ip}`;
    },
  };

  /**
   * Strict rate limiting for password reset
   * 3 attempts per hour
   */
  static readonly PASSWORD_RESET = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: "Too many password reset attempts, please try again later",
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const email = req.body?.email || "unknown";
      return `password_reset:${ip}:${email}`;
    },
  };

  /**
   * Medium rate limiting for email verification
   * 5 attempts per hour
   */
  static readonly EMAIL_VERIFICATION = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: "Too many email verification attempts, please try again later",
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const email = req.body?.email || "unknown";
      return `email_verification:${ip}:${email}`;
    },
  };

  /**
   * Strict rate limiting for company registration
   * 2 attempts per day
   */
  static readonly COMPANY_REGISTRATION = {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 2,
    message:
      "Too many company registration attempts, please try again tomorrow",
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      return `company_register:${ip}`;
    },
  };

  /**
   * General API rate limiting
   * 1000 requests per hour
   */
  static readonly API_GENERAL = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000,
    message: "API rate limit exceeded, please try again later",
  };

  /**
   * File upload rate limiting
   * 10 uploads per hour
   */
  static readonly FILE_UPLOAD = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: "Upload rate limit exceeded, please try again later",
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.sub || (req as any).user?.id;
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      return userId ? `upload:user:${userId}` : `upload:ip:${ip}`;
    },
  };
}

/**
 * Quick decorators for common scenarios
 */
export const LoginRateLimit = () => RateLimit(RateLimitPresets.LOGIN);
export const RegisterRateLimit = () => RateLimit(RateLimitPresets.REGISTER);
export const PasswordResetRateLimit = () =>
  RateLimit(RateLimitPresets.PASSWORD_RESET);
export const EmailVerificationRateLimit = () =>
  RateLimit(RateLimitPresets.EMAIL_VERIFICATION);
export const CompanyRegistrationRateLimit = () =>
  RateLimit(RateLimitPresets.COMPANY_REGISTRATION);
export const FileUploadRateLimit = () =>
  RateLimit(RateLimitPresets.FILE_UPLOAD);
