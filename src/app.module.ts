import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { HealthModule } from "./modules/health/health.module";
import { EmailModule } from "./modules/email/email.module";
import { UploadModule } from "./modules/upload/upload.module";
import { SecurityModule } from "./modules/security/security.module";
import { RedisCacheModule } from "./cache/cache.module";
import { QueueModule } from "./queue/queue.module";
import { DatabaseModule } from "./shared/database/database.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.development", ".env"],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get("REDIS_HOST") || "localhost",
          port: parseInt(config.get("REDIS_PORT")) || 6379,
          password: config.get("REDIS_PASSWORD"),
        },
      }),
    }),
    SecurityModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    LoggerModule,
    HealthModule,
    EmailModule,
    UploadModule,
    RedisCacheModule,
    QueueModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
