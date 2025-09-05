import { Injectable, Logger } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { PrismaService } from "../../../shared/database/prisma.service";
import { RedisService } from "../../../shared/cache/redis.service";

export interface ConnectionPoolStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
  usage: number; // percentage
}

@Injectable()
export class ConnectionPoolHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(ConnectionPoolHealthIndicator.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService
  ) {
    super();
  }

  async checkPostgresPool(key: string): Promise<HealthIndicatorResult> {
    try {
      // Prisma doesn't expose connection pool stats directly,
      // so we'll test with multiple concurrent queries
      const startTime = Date.now();

      const queries = Array(5)
        .fill(null)
        .map(() => this.prismaService.$queryRaw`SELECT 1 as test`);

      await Promise.all(queries);
      const responseTime = Date.now() - startTime;

      // Get basic connection info
      const connectionInfo = await this.getPostgresConnectionInfo();

      return this.getStatus(key, true, {
        type: "postgresql",
        responseTime: `${responseTime}ms`,
        concurrentQueries: 5,
        connectionInfo,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      return this.getStatus(key, false, {
        type: "postgresql",
        error: error instanceof Error ? error.message : "Unknown error",
        lastChecked: new Date().toISOString(),
      });
    }
  }

  async checkRedisPool(key: string): Promise<HealthIndicatorResult> {
    try {
      if (!this.redisService) {
        return this.getStatus(key, false, {
          type: "redis",
          error: "Redis service not available",
          lastChecked: new Date().toISOString(),
        });
      }

      const startTime = Date.now();

      // Test Redis connection with multiple operations
      await this.redisService.set("health_check", "test", 10);
      await this.redisService.get("health_check");
      await this.redisService.del("health_check");

      const operations = 3; // Number of operations performed

      const responseTime = Date.now() - startTime;

      const redisInfo = await this.getRedisInfo();

      return this.getStatus(key, true, {
        type: "redis",
        responseTime: `${responseTime}ms`,
        operations: operations,
        info: redisInfo,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      return this.getStatus(key, false, {
        type: "redis",
        error: error instanceof Error ? error.message : "Unknown error",
        lastChecked: new Date().toISOString(),
      });
    }
  }

  async checkAllConnectionPools(): Promise<
    Record<string, HealthIndicatorResult>
  > {
    const [postgres, redis] = await Promise.allSettled([
      this.checkPostgresPool("postgres_pool"),
      this.checkRedisPool("redis_pool"),
    ]);

    return {
      postgres_pool:
        postgres.status === "fulfilled"
          ? postgres.value
          : this.getStatus("postgres_pool", false, {
              error: postgres.reason?.message || "Unknown error",
            }),
      redis_pool:
        redis.status === "fulfilled"
          ? redis.value
          : this.getStatus("redis_pool", false, {
              error: redis.reason?.message || "Unknown error",
            }),
    };
  }

  private async getPostgresConnectionInfo(): Promise<any> {
    try {
      // Get basic PostgreSQL stats
      const result = (await this.prismaService.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `) as any[];

      const settings = (await this.prismaService.$queryRaw`
        SELECT name, setting 
        FROM pg_settings 
        WHERE name IN ('max_connections', 'shared_buffers')
      `) as any[];

      const settingsMap = settings.reduce((acc: any, item: any) => {
        acc[item.name] = item.setting;
        return acc;
      }, {});

      return {
        connections: result[0] || {},
        settings: settingsMap,
      };
    } catch (error) {
      this.logger.warn("Could not get PostgreSQL connection info:", error);
      return { error: "Could not retrieve connection info" };
    }
  }

  private async getRedisInfo(): Promise<any> {
    try {
      // RedisService doesn't expose info method directly
      // Return basic connection status instead
      const isHealthy = await this.redisService.isHealthy();

      return {
        connected: isHealthy,
        status: isHealthy ? "connected" : "disconnected",
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn("Could not get Redis info:", error);
      return { error: "Could not retrieve Redis info" };
    }
  }

  async getConnectionPoolMetrics(): Promise<{
    postgres: any;
    redis: any;
    timestamp: string;
  }> {
    const [postgres, redis] = await Promise.allSettled([
      this.getPostgresConnectionInfo(),
      this.getRedisInfo(),
    ]);

    return {
      postgres:
        postgres.status === "fulfilled"
          ? postgres.value
          : { error: postgres.reason?.message },
      redis:
        redis.status === "fulfilled"
          ? redis.value
          : { error: redis.reason?.message },
      timestamp: new Date().toISOString(),
    };
  }
}
