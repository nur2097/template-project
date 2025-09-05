import { HttpStatus } from "@nestjs/common";
import { BaseException } from "./base.exception";

/**
 * Authentication and Authorization related exceptions
 */

export class InvalidCredentialsException extends BaseException {
  constructor(email?: string) {
    super(
      "Invalid email or password provided",
      HttpStatus.UNAUTHORIZED,
      "AUTH_INVALID_CREDENTIALS",
      email ? { email } : undefined
    );
  }
}

export class TokenExpiredException extends BaseException {
  constructor(tokenType: "access_token" | "refresh_token" | "reset_token") {
    super(
      `${tokenType} has expired`,
      HttpStatus.UNAUTHORIZED,
      "AUTH_TOKEN_EXPIRED",
      { tokenType }
    );
  }
}

export class TokenBlacklistedException extends BaseException {
  constructor(reason: string = "Token has been revoked") {
    super(reason, HttpStatus.UNAUTHORIZED, "AUTH_TOKEN_BLACKLISTED", {
      reason,
    });
  }
}

export class RefreshTokenNotFoundException extends BaseException {
  constructor() {
    super(
      "Refresh token not found or invalid",
      HttpStatus.UNAUTHORIZED,
      "AUTH_REFRESH_TOKEN_NOT_FOUND"
    );
  }
}

export class RefreshTokenReusedException extends BaseException {
  constructor(deviceId: string) {
    super(
      "Refresh token reuse detected - security breach",
      HttpStatus.UNAUTHORIZED,
      "AUTH_REFRESH_TOKEN_REUSED",
      { deviceId }
    );
  }
}

export class MaximumDeviceLimitExceededException extends BaseException {
  constructor(maxDevices: number = 5) {
    super(
      `Maximum device limit of ${maxDevices} exceeded`,
      HttpStatus.FORBIDDEN,
      "AUTH_MAX_DEVICES_EXCEEDED",
      { maxDevices }
    );
  }
}

export class AccountSuspendedException extends BaseException {
  constructor(reason?: string) {
    super(
      "Account has been suspended",
      HttpStatus.FORBIDDEN,
      "AUTH_ACCOUNT_SUSPENDED",
      reason ? { reason } : undefined
    );
  }
}

export class AccountNotVerifiedException extends BaseException {
  constructor(email: string) {
    super(
      "Email address has not been verified",
      HttpStatus.FORBIDDEN,
      "AUTH_EMAIL_NOT_VERIFIED",
      { email }
    );
  }
}

export class InsufficientPermissionsException extends BaseException {
  constructor(requiredPermission: string, currentPermissions?: string[]) {
    super(
      `Insufficient permissions. Required: ${requiredPermission}`,
      HttpStatus.FORBIDDEN,
      "AUTH_INSUFFICIENT_PERMISSIONS",
      {
        required: requiredPermission,
        current: currentPermissions || [],
      }
    );
  }
}

export class InvalidSystemRoleException extends BaseException {
  constructor(requiredRole: string, currentRole: string) {
    super(
      `Insufficient system role. Required: ${requiredRole}, Current: ${currentRole}`,
      HttpStatus.FORBIDDEN,
      "AUTH_INVALID_SYSTEM_ROLE",
      { required: requiredRole, current: currentRole }
    );
  }
}

export class PasswordPolicyViolationException extends BaseException {
  constructor(violations: string[]) {
    super(
      "Password does not meet security requirements",
      HttpStatus.BAD_REQUEST,
      "AUTH_PASSWORD_POLICY_VIOLATION",
      { violations }
    );
  }
}

export class WeakPasswordException extends BaseException {
  constructor(personalInfo?: any) {
    super(
      "Password is too weak or contains personal information",
      HttpStatus.BAD_REQUEST,
      "AUTH_WEAK_PASSWORD",
      personalInfo ? { personalInfo } : undefined
    );
  }
}

export class RecentPasswordException extends BaseException {
  constructor() {
    super(
      "Cannot reuse recent passwords",
      HttpStatus.BAD_REQUEST,
      "AUTH_RECENT_PASSWORD"
    );
  }
}

export class InvalidPasswordResetTokenException extends BaseException {
  constructor() {
    super(
      "Password reset token is invalid or expired",
      HttpStatus.BAD_REQUEST,
      "AUTH_INVALID_RESET_TOKEN"
    );
  }
}

export class PasswordResetTokenExpiredException extends BaseException {
  constructor() {
    super(
      "Password reset token has expired",
      HttpStatus.BAD_REQUEST,
      "AUTH_RESET_TOKEN_EXPIRED"
    );
  }
}
