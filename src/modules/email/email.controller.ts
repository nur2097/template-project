import { Controller, Post, Body, Get } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { EmailService, SendEmailDto } from "./email.service";

@ApiTags("Email")
@Controller("email")
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send")
  @ApiOperation({ summary: "Send custom email" })
  @ApiResponse({ status: 200, description: "Email sent successfully" })
  @ApiResponse({ status: 400, description: "Invalid email data" })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const result = await this.emailService.sendEmail(sendEmailDto);

    if (!result.success) {
      return {
        success: false,
        message: "Failed to send email",
        error: result.error,
      };
    }

    return {
      success: true,
      message: "Email sent successfully",
      messageId: result.messageId,
    };
  }

  @Get("test-connection")
  @ApiOperation({ summary: "Test email service connection" })
  @ApiResponse({ status: 200, description: "Email service connection status" })
  async testConnection() {
    const isConnected = await this.emailService.testEmailConnection();

    return {
      success: isConnected,
      connected: isConnected,
      message: isConnected
        ? "Email service is connected"
        : "Email service connection failed",
      timestamp: new Date().toISOString(),
    };
  }

  @Post("welcome")
  @ApiOperation({ summary: "Send welcome email to user" })
  @ApiResponse({ status: 200, description: "Welcome email sent" })
  async sendWelcomeEmail(@Body() data: { email: string; name: string }) {
    const result = await this.emailService.sendWelcomeEmail(
      data.email,
      data.name
    );

    return {
      success: result.success,
      message: result.success
        ? "Welcome email sent"
        : "Failed to send welcome email",
      messageId: result.messageId,
      error: result.error,
    };
  }

  @Post("password-reset")
  @ApiOperation({ summary: "Send password reset email" })
  @ApiResponse({ status: 200, description: "Password reset email sent" })
  async sendPasswordResetEmail(
    @Body() data: { email: string; resetToken: string }
  ) {
    const result = await this.emailService.sendPasswordResetEmail(
      data.email,
      data.resetToken
    );

    return {
      success: result.success,
      message: result.success
        ? "Password reset email sent"
        : "Failed to send password reset email",
      messageId: result.messageId,
      error: result.error,
    };
  }

  @Post("verify-email")
  @ApiOperation({ summary: "Send email verification" })
  @ApiResponse({ status: 200, description: "Verification email sent" })
  async sendVerificationEmail(
    @Body() data: { email: string; verificationToken: string }
  ) {
    const result = await this.emailService.sendVerificationEmail(
      data.email,
      data.verificationToken
    );

    return {
      success: result.success,
      message: result.success
        ? "Verification email sent"
        : "Failed to send verification email",
      messageId: result.messageId,
      error: result.error,
    };
  }
}
