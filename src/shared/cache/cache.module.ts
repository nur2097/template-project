import { Module } from "@nestjs/common";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisService } from "./redis.service";
import { CacheService } from "./cache.service";
import { redisStore } from "cache-manager-redis-yet";

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get("REDIS_HOST", "localhost"),
        port: configService.get("REDIS_PORT", 6379),
        password: configService.get("REDIS_PASSWORD"),
        ttl: parseInt(configService.get("CACHE_TTL", "300")), // 5 minutes default
        max: parseInt(configService.get("CACHE_MAX_ITEMS", "100")),
      }),
    }),
  ],
  providers: [RedisService, CacheService],
  exports: [RedisService, CacheService, NestCacheModule],
})
export class CacheModule {}
