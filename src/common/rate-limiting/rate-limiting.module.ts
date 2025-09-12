import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ConfigurationModule } from "../../config/configuration.module";
import { ConfigurationService } from "../../config/configuration.service";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (configurationService: ConfigurationService) => ({
        throttlers: [
          {
            name: "default",
            ttl: configurationService.throttleTtl * 1000, // Convert seconds to milliseconds
            limit: configurationService.throttleLimit,
          },
          {
            name: "short",
            ttl: parseInt(process.env.THROTTLE_TTL_SHORT) || 60000, // 1 minute
            limit: parseInt(process.env.THROTTLE_LIMIT_SHORT) || 20, // 20 requests per minute
          },
          {
            name: "medium",
            ttl: parseInt(process.env.THROTTLE_TTL_MEDIUM) || 300000, // 5 minutes
            limit: parseInt(process.env.THROTTLE_LIMIT_MEDIUM) || 100, // 100 requests per 5 minutes
          },
          {
            name: "long",
            ttl: parseInt(process.env.THROTTLE_TTL_LONG) || 3600000, // 1 hour
            limit: parseInt(process.env.THROTTLE_LIMIT_LONG) || 500, // 500 requests per hour
          },
        ],
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class RateLimitingModule {}
