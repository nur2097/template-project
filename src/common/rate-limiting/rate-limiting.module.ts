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
            ttl: configurationService.throttleTtlShort,
            limit: configurationService.throttleLimitShort,
          },
          {
            name: "medium",
            ttl: configurationService.throttleTtlMedium,
            limit: configurationService.throttleLimitMedium,
          },
          {
            name: "long",
            ttl: configurationService.throttleTtlLong,
            limit: configurationService.throttleLimitLong,
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
