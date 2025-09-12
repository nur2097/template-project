import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigurationService } from "../../config/configuration.service";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configurationService: ConfigurationService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configurationService.redisHost,
      port: this.configurationService.redisPort,
      password: this.configurationService.redisPassword || undefined,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    this.client.on("error", (err) => {
      this.logger.error("❌ Redis connection error:", err);
    });

    this.client.on("connect", () => {
      this.logger.log("✅ Connected to Redis successfully");
    });

    this.client.on("ready", () => {
      this.logger.log("🚀 Redis is ready to accept commands");
    });

    this.client.on("close", () => {
      this.logger.warn("🔌 Redis connection closed");
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log("🔌 Redis connection closed gracefully");
      } catch (error) {
        this.logger.error("❌ Error closing Redis connection:", error);
      }
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, "EX", ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async flushdb(): Promise<void> {
    await this.client.flushdb();
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }
}
