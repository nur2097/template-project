import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigService, ConfigModule } from "@nestjs/config";
import { redisStore } from "cache-manager-redis-yet";

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<any> => {
        // Use Redis if available, fallback to memory cache
        const redisHost = config.get("REDIS_HOST");
        const redisPort = config.get("REDIS_PORT");

        if (redisHost && redisPort) {
          try {
            const store = await redisStore({
              socket: {
                host: redisHost,
                port: parseInt(redisPort, 10) || 6379,
              },
              ttl: 60 * 1000, // milliseconds
            });
            return {
              store,
              ttl: 60 * 1000,
              max: 100,
            };
          } catch (error) {
            console.warn(
              "Failed to connect to Redis for caching, falling back to memory store:",
              error.message,
            );
          }
        }

        // Fallback to memory store
        return {
          store: "memory",
          ttl: 60 * 1000, // milliseconds
          max: 100, // maximum number of items in cache
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
