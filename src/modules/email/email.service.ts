import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailDto {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = process.env.FROM_EMAIL || "noreply@example.com";
  private readonly fromName = process.env.FROM_NAME || "API Service";
  private readonly resend: Resend;

  constructor() {
    // Only initialize Resend if API key is provided
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      // Create a mock Resend object for development/testing
      this.resend = null as any;
    }
  }

  async sendEmail(emailData: SendEmailDto): Promise<EmailResult> {
    try {
      this.logger.log(`Sending email to: ${emailData.to}`);

      // In development without Resend API key, just log the email
      if (
        process.env.NODE_ENV === "development" &&
        !process.env.RESEND_API_KEY
      ) {
        this.logger.log({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: emailData.to,
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
        });

        return {
          success: true,
          messageId: `dev-${Date.now()}`,
        };
      }

      // Send real email using Resend
      if (!process.env.RESEND_API_KEY || !this.resend) {
        throw new Error("RESEND_API_KEY is not configured");
      }

      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      });

      if (result.error) {
        throw new Error(`Resend API error: ${result.error.message}`);
      }

      this.logger.log(`Email sent successfully with ID: ${result.data?.id}`);

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: "Welcome to Our Platform!",
      html: this.getWelcomeTemplate(userName),
      text: `Welcome ${userName}! Thank you for joining our platform.`,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string
  ): Promise<EmailResult> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: "Password Reset Request",
      html: this.getPasswordResetTemplate(resetUrl),
      text: `Reset your password by clicking this link: ${resetUrl}`,
    });
  }

  async sendVerificationEmail(
    to: string,
    verificationToken: string
  ): Promise<EmailResult> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    return this.sendEmail({
      to,
      subject: "Verify Your Email Address",
      html: this.getVerificationTemplate(verificationUrl),
      text: `Verify your email by clicking this link: ${verificationUrl}`,
    });
  }

  private getWelcomeTemplate(userName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome ${userName}!</h1>
        <p>Thank you for joining our platform. We're excited to have you on board.</p>
        <p>Get started by exploring our features and setting up your profile.</p>
        <p>If you have any questions, don't hesitate to reach out to our support team.</p>
        <br>
        <p>Best regards,<br>The Team</p>
      </div>
    `;
  }

  private getPasswordResetTemplate(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>You have requested to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      </div>
    `;
  }

  private getVerificationTemplate(verificationUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Verify Your Email Address</h1>
        <p>Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This verification link will expire in 24 hours.</p>
      </div>
    `;
  }

  async testEmailConnection(): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY || !this.resend) {
        this.logger.warn(
          "RESEND_API_KEY not configured - using development mode"
        );
        // In development mode, consider email service as "working" since it logs emails
        return process.env.NODE_ENV === "development";
      }

      // Test Resend connection by sending a test request
      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [this.fromEmail], // Send test email to self
        subject: "API Health Check - Email Service Test",
        text: "This is a test email to verify email service connectivity.",
        html: "<p>This is a test email to verify email service connectivity.</p>",
      });

      if (result.error) {
        this.logger.error(`Email service test failed: ${result.error.message}`);
        return false;
      }

      this.logger.log("Email service connection test successful");
      return true;
    } catch (error) {
      this.logger.error(
        `Email service connection test failed: ${error.message}`
      );
      return false;
    }
  }
}
