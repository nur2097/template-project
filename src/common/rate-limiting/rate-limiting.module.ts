import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: parseInt(config.get('THROTTLE_TTL_SHORT')) || 60000, // 1 minute
            limit: parseInt(config.get('THROTTLE_LIMIT_SHORT')) || 20, // 20 requests per minute
          },
          {
            name: 'medium', 
            ttl: parseInt(config.get('THROTTLE_TTL_MEDIUM')) || 300000, // 5 minutes
            limit: parseInt(config.get('THROTTLE_LIMIT_MEDIUM')) || 100, // 100 requests per 5 minutes
          },
          {
            name: 'long',
            ttl: parseInt(config.get('THROTTLE_TTL_LONG')) || 3600000, // 1 hour
            limit: parseInt(config.get('THROTTLE_LIMIT_LONG')) || 500, // 500 requests per hour
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