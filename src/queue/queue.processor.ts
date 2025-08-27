import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Logger } from "@nestjs/common";

@Processor("email")
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  @Process("send-email")
  async handleSendEmail(job: Job) {
    this.logger.log(`Processing send-email job with ID: ${job.id}`);

    const { to, subject, body } = job.data;

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.logger.log(`Email sent to ${to} with subject: ${subject}`);
    return { success: true, sentAt: new Date() };
  }

}

@Processor("general")
export class GeneralQueueProcessor {
  private readonly logger = new Logger(GeneralQueueProcessor.name);

  @Process("generate-report")
  async handleGenerateReport(job: Job) {
    this.logger.log(`Processing generate-report job with ID: ${job.id}`);

    const { reportType, userId } = job.data;

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 5000));

    this.logger.log(`Report ${reportType} generated for user ${userId}`);
    return { success: true, reportUrl: `/reports/${job.id}.pdf` };
  }

  @Process("cleanup-logs")
  async handleCleanupLogs(job: Job) {
    this.logger.log(`Processing cleanup-logs job with ID: ${job.id}`);

    const { olderThanDays } = job.data;

    // Simulate log cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.log(`Cleaned up logs older than ${olderThanDays} days`);
    return { success: true, deletedCount: Math.floor(Math.random() * 100) };
  }
}
