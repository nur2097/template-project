import { Module } from "@nestjs/common";
import { CacheController } from "./cache.controller";
import { CacheModule as SharedCacheModule } from "../../shared/cache/cache.module";

/**
 * Development module for testing cache functionality
 * Only enable in development/testing environments
 */
@Module({
  imports: [SharedCacheModule],
  controllers: [CacheController],
})
export class CacheTestModule {}
