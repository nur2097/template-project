import { Module, Global, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { Logger } from "@nestjs/common";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prismaService.$connect();
      this.logger.log("Database connection established successfully");
    } catch (error) {
      this.logger.error("Failed to connect to database:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.prismaService.$disconnect();
      this.logger.log("Database connection closed successfully");
    } catch (error) {
      this.logger.error("Error closing database connection:", error);
    }
  }
}
