import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service";
import { EmailQueueProcessor, GeneralQueueProcessor } from "./queue.processor";
import { EmailModule } from "../modules/email/email.module";
import { LoggerModule } from "../common/logger/logger.module";

@Module({
  imports: [
    EmailModule,
    LoggerModule,
    BullModule.registerQueueAsync({
      name: "email",
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get("REDIS_HOST") || "localhost",
          port: parseInt(config.get("REDIS_PORT")) || 6379,
        },
      }),
    }),
    BullModule.registerQueueAsync({
      name: "general",
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get("REDIS_HOST") || "localhost",
          port: parseInt(config.get("REDIS_PORT")) || 6379,
        },
      }),
    }),
  ],
  providers: [QueueService, EmailQueueProcessor, GeneralQueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
