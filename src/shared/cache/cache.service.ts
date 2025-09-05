import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { RedisService } from "./redis.service";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly redisService: RedisService
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.cacheManager.set(key, value, ttl * 1000); // Convert to milliseconds
      } else {
        await this.cacheManager.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
    } catch (error) {
      this.logger.error("Cache reset error:", error);
    }
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      return await this.cacheManager.wrap(
        key,
        fn,
        ttl ? ttl * 1000 : undefined
      );
    } catch (error) {
      this.logger.error(`Cache wrap error for key ${key}:`, error);
      // Fallback to direct function execution
      return await fn();
    }
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(":")}`;
  }

  generateUserKey(userId: number, suffix: string): string {
    return this.generateKey("user", userId, suffix);
  }

  generateCompanyKey(companyId: number, suffix: string): string {
    return this.generateKey("company", companyId, suffix);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisService.keys(pattern);
      if (keys.length > 0) {
        const pipeline = this.redisService.getClient().pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
      }
    } catch (error) {
      this.logger.error(
        `Cache invalidate pattern error for ${pattern}:`,
        error
      );
    }
  }

  async invalidateUserCache(userId: number): Promise<void> {
    await this.invalidatePattern(`user:${userId}:*`);
  }

  async invalidateCompanyCache(companyId: number): Promise<void> {
    await this.invalidatePattern(`company:${companyId}:*`);
  }
}
