import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Logger, Injectable } from "@nestjs/common";
import { EmailService } from "../modules/email/email.service";

@Processor("email")
@Injectable()
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process("send-email")
  async handleSendEmail(job: Job) {
    this.logger.log(`Processing send-email job with ID: ${job.id}`);

    const { to, subject, text, html } = job.data;

    try {
      const result = await this.emailService.sendEmail({
        to,
        subject,
        text,
        html,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      this.logger.log(
        `Email sent to ${to} with subject: ${subject}, messageId: ${result.messageId}`
      );
      return {
        success: true,
        sentAt: new Date(),
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email in queue: ${error.message}`);
      throw error;
    }
  }
}

@Processor("general")
@Injectable()
export class GeneralQueueProcessor {
  private readonly logger = new Logger(GeneralQueueProcessor.name);

  @Process("generate-report")
  async handleGenerateReport(job: Job) {
    this.logger.log(`Processing generate-report job with ID: ${job.id}`);

    const { reportType, userId, data } = job.data;

    try {
      // Simple report generation - create text report
      const timestamp = new Date().toISOString();
      const reportContent = `Report: ${reportType}\nUser: ${userId}\nGenerated: ${timestamp}\nData: ${JSON.stringify(data, null, 2)}`;

      this.logger.log(`Report ${reportType} generated for user ${userId}`);
      return {
        success: true,
        reportUrl: `/reports/generated_${job.id}.txt`,
        content: reportContent,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`);
      throw error;
    }
  }

  @Process("cleanup-logs")
  async handleCleanupLogs(job: Job) {
    this.logger.log(`Processing cleanup-logs job with ID: ${job.id}`);

    const { olderThanDays } = job.data;

    try {
      // Simple cleanup simulation - in real implementation would clean MongoDB
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Simulate cleanup count
      const deletedCount = Math.floor(Math.random() * 100) + 10;

      this.logger.log(
        `Cleanup completed: ${deletedCount} items deleted (logs older than ${olderThanDays} days)`
      );
      return {
        success: true,
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup logs: ${error.message}`);
      throw error;
    }
  }
}
