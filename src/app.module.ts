import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { BullModule } from "@nestjs/bull";
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { RolesModule } from "./modules/roles/roles.module";
import { LoggerModule } from "./common/logger/logger.module";
import { HealthModule } from "./modules/health/health.module";
import { EmailModule } from "./modules/email/email.module";
import { UploadModule } from "./modules/upload/upload.module";
// import { CacheTestModule } from "./modules/cache/cache.module"; // Only for development
import { SecurityModule } from "./modules/security/security.module";
import { QueueModule } from "./queue/queue.module";
import { DatabaseModule } from "./shared/database/database.module";
import { CacheModule } from "./shared/cache/cache.module";
import { TracingModule } from "./common/tracing/tracing.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { CorrelationInterceptor } from "./common/interceptors/correlation.interceptor";
import { PerformanceInterceptor } from "./common/interceptors/performance.interceptor";
import { TracingInterceptor } from "./common/interceptors/tracing.interceptor";
import { UnifiedAuthGuard } from "./common/guards/unified-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.development", ".env"],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET") || "dev-jwt-secret",
        signOptions: { expiresIn: config.get("JWT_EXPIRES_IN") || "1d" },
      }),
      global: true,
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
    TracingModule,
    SecurityModule,
    DatabaseModule,
    CacheModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    RolesModule,
    LoggerModule,
    HealthModule,
    EmailModule,
    UploadModule,
    // CacheTestModule, // Only enable for cache testing
    QueueModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: UnifiedAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
