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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { AuthService } from "./services/auth.service";
import { PasswordResetService } from "./services/password-reset.service";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { CompaniesService } from "../companies/companies.service";
import { RegisterDto } from "./dto/register.dto";
import { UserResponseDto } from "../users/dto/user-response.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly companiesService: CompaniesService
  ) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register new user" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 409, description: "User already exists" })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: any
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, req);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, req);
  }

  @Public()
  @Post("refresh")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  @ApiBody({ type: RefreshTokenDto })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: any
  ): Promise<AuthResponseDto> {
    const userId = req.user.sub;
    return this.authService.refreshTokens(userId, refreshTokenDto.refreshToken);
  }

  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile retrieved successfully",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getProfile(@CurrentUser() user: any): Promise<UserResponseDto> {
    return this.authService.validateUserById(user.sub);
  }

  @Post("logout")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User logout" })
  @ApiResponse({ status: 200, description: "Logout successful" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logout(
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<{ message: string }> {
    await this.authService.logout(user.sub, req, user.token);
    return { message: "Logout successful" };
  }

  @Post("logout-all")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout from all devices" })
  @ApiResponse({
    status: 200,
    description: "Logged out from all devices successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logoutAll(@CurrentUser() user: any): Promise<{ message: string }> {
    await this.authService.logoutAll(user.sub);
    return { message: "Logged out from all devices successfully" };
  }

  @Post("logout-other-devices")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout from all other devices except current" })
  @ApiResponse({
    status: 200,
    description: "Logged out from other devices successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logoutOtherDevices(
    @CurrentUser() user: any
  ): Promise<{ message: string }> {
    const currentDeviceId = user.deviceId;
    await this.authService.logoutOtherDevices(user.sub, currentDeviceId);
    return { message: "Logged out from other devices successfully" };
  }

  @Get("devices")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user active devices and sessions" })
  @ApiResponse({ status: 200, description: "Devices retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getDevices(@CurrentUser() user: any): Promise<any> {
    const devices = await this.authService.getUserActiveSessions(user.sub);
    return { devices };
  }

  @Post("revoke-device")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke access from specific device" })
  @ApiResponse({
    status: 200,
    description: "Device access revoked successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async revokeDevice(
    @CurrentUser() user: any,
    @Body() body: { deviceId: string }
  ): Promise<{ message: string }> {
    await this.authService.revokeDeviceAccess(user.sub, body.deviceId);
    return { message: "Device access revoked successfully" };
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset" })
  @ApiResponse({ status: 200, description: "Password reset email sent" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBody({
    schema: { type: "object", properties: { email: { type: "string" } } },
  })
  async forgotPassword(
    @Body() body: { email: string }
  ): Promise<{ message: string }> {
    const resetToken = await this.passwordResetService.generateResetToken(
      body.email
    );

    // Here you would normally send an email with the reset token
    // For development, you can log it or return it in the response

    const response: { message: string; resetToken?: string } = {
      message: "Password reset instructions sent to email",
    };

    // Remove this in production
    if (process.env.NODE_ENV === "development") {
      response.resetToken = resetToken;
    }

    return response;
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
  async resetPassword(
    @Body() body: { token: string; newPassword: string }
  ): Promise<{ message: string }> {
    await this.passwordResetService.resetPassword(body.token, body.newPassword);
    return { message: "Password reset successfully" };
  }

  @Post("change-password")
  @ApiBearerAuth()
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
  ): Promise<{ message: string }> {
    await this.passwordResetService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword
    );
    return { message: "Password changed successfully" };
  }

  @Public()
  @Post("send-verification")
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
  ): Promise<{ message: string; verificationToken?: string }> {
    // Find user by email
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.emailVerified) {
      return { message: "Email already verified" };
    }

    // Optional: Verify company slug matches (additional security)
    if (body.companySlug) {
      const company = await this.companiesService.findBySlug(body.companySlug);
      if (company.id !== user.companyId) {
        throw new BadRequestException("Invalid company association");
      }
    }

    // Generate verification token (simple approach - in production use JWT or crypto)
    const verificationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Store token in database (you might want to create a separate table for this)
    // For now, we'll just send the email
    await this.emailService.sendVerificationEmail(
      body.email,
      verificationToken
    );

    const response: { message: string; verificationToken?: string } = {
      message: "Verification email sent",
    };

    // Remove this in production
    if (process.env.NODE_ENV === "development") {
      response.verificationToken = verificationToken;
    }

    return response;
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
  ): Promise<{ message: string }> {
    // Find user by email
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.emailVerified) {
      return { message: "Email already verified" };
    }

    // Optional: Verify company slug matches (additional security)
    if (body.companySlug) {
      const company = await this.companiesService.findBySlug(body.companySlug);
      if (company.id !== user.companyId) {
        throw new BadRequestException("Invalid company association");
      }
    }

    // TODO: Validate token from database
    // For now, we'll accept any token for development
    if (process.env.NODE_ENV !== "development" && !body.token) {
      throw new BadRequestException("Invalid verification token");
    }

    // Verify the email
    await this.usersService.verifyEmail(user.id);

    return { message: "Email verified successfully" };
  }
}
