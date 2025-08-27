import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigService, ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: "memory", // Redis için şimdilik memory kullanıyoruz, daha sonra redis store eklenebilir
        ttl: 60 * 1000, // milliseconds
        max: 100, // maximum number of items in cache
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
