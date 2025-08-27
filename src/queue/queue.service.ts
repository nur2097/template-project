import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue("email") private emailQueue: Queue,
    @InjectQueue("general") private generalQueue: Queue,
  ) {}

  // Email queue operations
  async addEmailJob(type: string, data: any, options?: any) {
    try {
      const job = await this.emailQueue.add(type, data, {
        delay: options?.delay || 0,
        attempts: options?.attempts || 3,
        removeOnComplete: true,
        removeOnFail: false,
        ...options,
      });
      
      this.logger.log(`Email job added: ${type} - Job ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add email job: ${type}`, error.stack);
      throw error;
    }
  }

  // General queue operations
  async addGeneralJob(type: string, data: any, options?: any) {
    try {
      const job = await this.generalQueue.add(type, data, {
        delay: options?.delay || 0,
        attempts: options?.attempts || 3,
        removeOnComplete: true,
        removeOnFail: false,
        ...options,
      });
      
      this.logger.log(`General job added: ${type} - Job ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add general job: ${type}`, error.stack);
      throw error;
    }
  }

  // Queue statistics
  async getEmailQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.emailQueue.getActive(),
        this.emailQueue.getCompleted(),
        this.emailQueue.getFailed(),
        this.emailQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      this.logger.error("Failed to get email queue stats", error.stack);
      throw error;
    }
  }

  async getGeneralQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.generalQueue.getWaiting(),
        this.generalQueue.getActive(),
        this.generalQueue.getCompleted(),
        this.generalQueue.getFailed(),
        this.generalQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      this.logger.error("Failed to get general queue stats", error.stack);
      throw error;
    }
  }

  // Clean up completed jobs
  async cleanEmailQueue() {
    try {
      await this.emailQueue.clean(24 * 60 * 60 * 1000, "completed"); // 24 hours
      await this.emailQueue.clean(48 * 60 * 60 * 1000, "failed"); // 48 hours
      this.logger.log("Email queue cleaned successfully");
    } catch (error) {
      this.logger.error("Failed to clean email queue", error.stack);
    }
  }

  async cleanGeneralQueue() {
    try {
      await this.generalQueue.clean(24 * 60 * 60 * 1000, "completed"); // 24 hours
      await this.generalQueue.clean(48 * 60 * 60 * 1000, "failed"); // 48 hours
      this.logger.log("General queue cleaned successfully");
    } catch (error) {
      this.logger.error("Failed to clean general queue", error.stack);
    }
  }
}