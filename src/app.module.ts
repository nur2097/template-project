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
// import { CacheTestModule } from "./modules/cache/cache.module"; // Only for development
import { SecurityModule } from "./modules/security/security.module";
import { QueueModule } from "./queue/queue.module";
import { DatabaseModule } from "./shared/database/database.module";
import { CacheModule } from "./shared/cache/cache.module";
import { TracingModule } from "./common/tracing/tracing.module";
import { CasbinModule } from "./common/casbin/casbin.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { CorrelationInterceptor } from "./common/interceptors/correlation.interceptor";
import { PerformanceInterceptor } from "./common/interceptors/performance.interceptor";
import { TracingInterceptor } from "./common/interceptors/tracing.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { UnifiedAuthGuard } from "./common/guards/unified-auth.guard";

@Module({
  imports: [
    ConfigurationModule,
    JwtModule.registerAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => config.jwtConfig,
      global: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => ({
        redis: config.redisConfig,
      }),
    }),
    TracingModule,
    CasbinModule,
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
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
