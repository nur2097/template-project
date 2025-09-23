import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { AuthService } from "./services/auth.service";
import { PasswordResetService } from "./services/password-reset.service";
import { EmailVerificationService } from "./services/email-verification.service";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { CompaniesService } from "../companies/companies.service";
import { ConfigurationService } from "../../config/configuration.service";
import { RegisterDto } from "./dto/register.dto";
import { UserResponseDto } from "../users/dto/user-response.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import {
  LoginResponseDto,
  RefreshTokenResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  AuthErrorResponseDto,
} from "../../common/dto/auth-response.dto";
import { ErrorResponseDto } from "../../common/dto/standard-response.dto";
import { ResponseUtil } from "../../common/utils/response.util";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { EnhancedRateLimitGuard } from "../../common/guards/rate-limit.guard";
import {
  LoginRateLimit,
  RegisterRateLimit,
  PasswordResetRateLimit,
  EmailVerificationRateLimit,
  InvitationValidationRateLimit,
} from "../../common/decorators/rate-limit.decorator";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly companiesService: CompaniesService,
    private readonly configService: ConfigurationService
  ) {}

  @Public()
  @Post("register")
  @UseGuards(EnhancedRateLimitGuard)
  @RegisterRateLimit()
  @InvitationValidationRateLimit()
  @ApiOperation({ summary: "Register new user" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input",
    type: AuthErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "User already exists",
    type: AuthErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "Too many requests",
    type: ErrorResponseDto,
  })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: ExpressRequest
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, req);
  }

  @Public()
  @Post("login")
  @UseGuards(EnhancedRateLimitGuard)
  @LoginRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
    type: AuthErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "Too many requests",
    type: ErrorResponseDto,
  })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, req);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully",
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid refresh token",
    type: AuthErrorResponseDto,
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Get("profile")
  @ApiBearerAuth("JWT-Auth")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile retrieved successfully",
    type: MeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: AuthErrorResponseDto,
  })
  async getProfile(
    @CurrentUser() user: CurrentUserPayload
  ): Promise<UserResponseDto> {
    return this.authService.validateUserById(user.sub);
  }

  @Post("logout")
  @ApiBearerAuth("JWT-Auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User logout" })
  @ApiResponse({
    status: 200,
    description: "Logout successful",
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: AuthErrorResponseDto,
  })
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Request() req: ExpressRequest
  ) {
    await this.authService.logout(user.sub, req, user.token);
    return ResponseUtil.success(null, "Logout successful");
  }

  @Post("logout-all")
  @ApiBearerAuth("JWT-Auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout from all devices" })
  @ApiResponse({
    status: 200,
    description: "Logged out from all devices successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logoutAll(@CurrentUser() user: CurrentUserPayload) {
    await this.authService.logoutAll(user.sub);
    return ResponseUtil.success(
      null,
      "Logged out from all devices successfully"
    );
  }

  @Post("logout-other-devices")
  @ApiBearerAuth("JWT-Auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout from all other devices except current" })
  @ApiResponse({
    status: 200,
    description: "Logged out from other devices successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logoutOtherDevices(@CurrentUser() user: CurrentUserPayload) {
    const currentDeviceId = user.deviceId;
    await this.authService.logoutOtherDevices(user.sub, currentDeviceId);
    return ResponseUtil.success(
      null,
      "Logged out from other devices successfully"
    );
  }

  @Get("devices")
  @ApiBearerAuth("JWT-Auth")
  @ApiOperation({ summary: "Get user active devices and sessions" })
  @ApiResponse({ status: 200, description: "Devices retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getDevices(@CurrentUser() user: CurrentUserPayload) {
    const devices = await this.authService.getUserActiveSessions(user.sub);
    return { devices };
  }

  @Post("revoke-device")
  @ApiBearerAuth("JWT-Auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke access from specific device" })
  @ApiResponse({
    status: 200,
    description: "Device access revoked successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async revokeDevice(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { deviceId: string }
  ) {
    await this.authService.revokeDeviceAccess(user.sub, body.deviceId);
    return ResponseUtil.success(null, "Device access revoked successfully");
  }

  @Public()
  @Post("forgot-password")
  @UseGuards(EnhancedRateLimitGuard)
  @PasswordResetRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset" })
  @ApiResponse({ status: 200, description: "Password reset email sent" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBody({
    schema: { type: "object", properties: { email: { type: "string" } } },
  })
  async forgotPassword(@Body() body: { email: string }) {
    const resetToken = await this.passwordResetService.generateResetToken(
      body.email
    );

    // Send reset token via email to user
    try {
      await this.emailService.sendPasswordResetEmail(body.email, resetToken);
    } catch (error) {
      // Log error but don't expose it to user for security
      console.error("Failed to send password reset email:", error);
      // Still return success to prevent email enumeration attacks
    }

    // For development: log token to console (remove in production)
    if (this.configService.isDevelopment) {
      // Use logger instead of console for better control
      this.logger.debug(
        `🔑 Password reset token for ${body.email}: ${resetToken}`
      );
    }

    // SECURITY: Never return the reset token in response (even in development)
    return ResponseUtil.success(
      null,
      "If the email exists, password reset instructions have been sent"
    );
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with token" })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        token: { type: "string" },
        newPassword: { type: "string" },
      },
    },
  })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.passwordResetService.resetPassword(body.token, body.newPassword);
    return ResponseUtil.success(null, "Password reset successfully");
  }

  @Post("change-password")
  @ApiBearerAuth("JWT-Auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change current password" })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 400, description: "Invalid current password" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        currentPassword: { type: "string" },
        newPassword: { type: "string" },
      },
    },
  })
  async changePassword(
    @CurrentUser("id") userId: number,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    await this.passwordResetService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword
    );
    return ResponseUtil.success(null, "Password changed successfully");
  }

  @Public()
  @Post("send-verification")
  @UseGuards(EnhancedRateLimitGuard)
  @EmailVerificationRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send email verification" })
  @ApiResponse({ status: 200, description: "Verification email sent" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        companySlug: { type: "string" },
      },
    },
  })
  async sendVerificationEmail(
    @Body() body: { email: string; companySlug?: string }
  ) {
    // Find user by email
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.emailVerified) {
      return ResponseUtil.success(null, "Email already verified");
    }

    // Optional: Verify company slug matches (additional security)
    if (body.companySlug) {
      const company = await this.companiesService.findBySlug(body.companySlug);
      if (company.id !== user.companyId) {
        throw new BadRequestException("Invalid company association");
      }
    }

    // Generate and store verification token
    const verificationToken =
      await this.emailVerificationService.generateVerificationToken(body.email);

    // Send verification email
    await this.emailService.sendVerificationEmail(
      body.email,
      verificationToken
    );

    // SECURITY: Never return verification token in response (even in development)
    return ResponseUtil.success(
      null,
      "If the email is valid, a verification link has been sent"
    );
  }

  @Public()
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email with token" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid verification token" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string" },
        token: { type: "string" },
        companySlug: { type: "string" },
      },
    },
  })
  async verifyEmail(
    @Body() body: { email: string; token: string; companySlug?: string }
  ) {
    // Find user by email
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.emailVerified) {
      return ResponseUtil.success(null, "Email already verified");
    }

    // Optional: Verify company slug matches (additional security)
    if (body.companySlug) {
      const company = await this.companiesService.findBySlug(body.companySlug);
      if (company.id !== user.companyId) {
        throw new BadRequestException("Invalid company association");
      }
    }

    // Verify token and email
    await this.emailVerificationService.verifyToken(body.token, body.email);

    return ResponseUtil.success(null, "Email verified successfully");
  }
}
