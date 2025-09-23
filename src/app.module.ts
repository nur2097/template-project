import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigurationModule, ConfigurationService } from "./config";
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
import { SecurityModule } from "./modules/security/security.module";
import { QueueModule } from "./queue/queue.module";
import { DatabaseModule } from "./shared/database/database.module";
import { CacheModule } from "./shared/cache/cache.module";
import { TracingModule } from "./common/tracing/tracing.module";
import { CasbinModule } from "./common/casbin/casbin.module";
import { RateLimitingModule } from "./common/rate-limiting/rate-limiting.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { CorrelationInterceptor } from "./common/interceptors/correlation.interceptor";
import { PerformanceInterceptor } from "./common/interceptors/performance.interceptor";
import { TracingInterceptor } from "./common/interceptors/tracing.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { UnifiedAuthGuard } from "./common/guards/unified-auth.guard";
import { AppController } from "./app.controller";

@Module({
  imports: [
    // Core configuration and database
    ConfigurationModule,
    DatabaseModule,

    // JWT authentication
    JwtModule.registerAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => config.jwtConfig,
      global: true,
    }),

    // Core business modules
    AuthModule,
    UsersModule,
    CompaniesModule,
    RolesModule,

    // Infrastructure modules
    CacheModule,
    LoggerModule.forRoot(),
    HealthModule,

    // Enterprise features
    CasbinModule,
    TracingModule,
    SecurityModule,
    RateLimitingModule,
    EmailModule,
    UploadModule,

    // Background processing
    BullModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => ({
        redis: config.redisConfig,
      }),
    }),
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    // Global exception handling
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Authentication guard
    {
      provide: APP_GUARD,
      useClass: UnifiedAuthGuard,
    },

    // Interceptor chain (order matters: first registered runs first)
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationInterceptor, // Must be first to set correlation ID
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor, // Second for tracing context
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor, // Third for timing
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Fourth for logging
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor, // Last to transform final response
    },
  ],
})
export class AppModule {}
