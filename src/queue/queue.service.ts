import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue("email") private emailQueue: Queue,
    @InjectQueue("general") private generalQueue: Queue,
  ) {}

  async addEmailJob(name: string, data: any) {
    return await this.emailQueue.add(name, data);
  }

  async addGeneralJob(name: string, data: any) {
    return await this.generalQueue.add(name, data);
  }

  // Legacy method for backward compatibility
  async addJob(name: string, data: any) {
    // Route to appropriate queue based on job name
    if (name === "send-email") {
      return this.addEmailJob(name, data);
    }
    return this.addGeneralJob(name, data);
  }

  async getEmailQueueStats() {
    const waiting = await this.emailQueue.getWaiting();
    const active = await this.emailQueue.getActive();
    const completed = await this.emailQueue.getCompleted();
    const failed = await this.emailQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async getGeneralQueueStats() {
    const waiting = await this.generalQueue.getWaiting();
    const active = await this.generalQueue.getActive();
    const completed = await this.generalQueue.getCompleted();
    const failed = await this.generalQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
