import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ["query", "info", "warn", "error"],
      errorFormat: "pretty",
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("✅ Connected to PostgreSQL via Prisma");
    } catch (error) {
      this.logger.error("❌ Failed to connect to PostgreSQL:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log("🔌 Disconnected from PostgreSQL");
    } catch (error) {
      this.logger.error("❌ Error disconnecting from PostgreSQL:", error);
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // Clear database for testing
  async clearDatabase() {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Database clearing is only allowed in test environment");
    }

    const models = Object.keys(this).filter(
      (key) => !key.startsWith("$") && !key.startsWith("_")
    );

    for (const model of models) {
      try {
        await (this as any)[model].deleteMany();
      } catch (error) {
        this.logger.warn(`Failed to clear ${model}:`, error);
      }
    }
  }
}
