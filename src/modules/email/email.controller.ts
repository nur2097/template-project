import { Controller, Post, Body, Get } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RequireAuth } from "../../common/decorators/require-auth.decorator";
import { ResponseUtil } from "../../common/utils/response.util";
import { EmailService, SendEmailDto } from "./email.service";

@ApiTags("Email")
@Controller("email")
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send")
  @RequireAuth("ADMIN")
  @ApiOperation({ summary: "Send custom email" })
  @ApiResponse({ status: 200, description: "Email sent successfully" })
  @ApiResponse({ status: 400, description: "Invalid email data" })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const result = await this.emailService.sendEmail(sendEmailDto);

    if (!result.success) {
      return ResponseUtil.warning(null, "Failed to send email", [result.error]);
    }

    return ResponseUtil.success(
      { messageId: result.messageId },
      "Email sent successfully"
    );
  }

  @Get("test-connection")
  @RequireAuth("ADMIN")
  @ApiOperation({ summary: "Test email service connection" })
  @ApiResponse({ status: 200, description: "Email service connection status" })
  async testConnection() {
    const isConnected = await this.emailService.testEmailConnection();

    return ResponseUtil.success(
      {
        connected: isConnected,
        timestamp: new Date().toISOString(),
      },
      isConnected
        ? "Email service is connected"
        : "Email service connection failed"
    );
  }

  @Post("welcome")
  @RequireAuth("ADMIN")
  @ApiOperation({ summary: "Send welcome email to user" })
  @ApiResponse({ status: 200, description: "Welcome email sent" })
  async sendWelcomeEmail(@Body() data: { email: string; name: string }) {
    const result = await this.emailService.sendWelcomeEmail(
      data.email,
      data.name
    );

    if (!result.success) {
      return ResponseUtil.warning(null, "Failed to send welcome email", [
        result.error,
      ]);
    }

    return ResponseUtil.success(
      { messageId: result.messageId },
      "Welcome email sent"
    );
  }

  @Post("password-reset")
  @RequireAuth("ADMIN")
  @ApiOperation({ summary: "Send password reset email" })
  @ApiResponse({ status: 200, description: "Password reset email sent" })
  async sendPasswordResetEmail(
    @Body() data: { email: string; resetToken: string }
  ) {
    const result = await this.emailService.sendPasswordResetEmail(
      data.email,
      data.resetToken
    );

    if (!result.success) {
      return ResponseUtil.warning(null, "Failed to send password reset email", [
        result.error,
      ]);
    }

    return ResponseUtil.success(
      { messageId: result.messageId },
      "Password reset email sent"
    );
  }

  @Post("verify-email")
  @RequireAuth("ADMIN")
  @ApiOperation({ summary: "Send email verification" })
  @ApiResponse({ status: 200, description: "Verification email sent" })
  async sendVerificationEmail(
    @Body() data: { email: string; verificationToken: string }
  ) {
    const result = await this.emailService.sendVerificationEmail(
      data.email,
      data.verificationToken
    );

    if (!result.success) {
      return ResponseUtil.warning(null, "Failed to send verification email", [
        result.error,
      ]);
    }

    return ResponseUtil.success(
      { messageId: result.messageId },
      "Verification email sent"
    );
  }
}
