import { Injectable, Logger } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { PrismaService } from "../../shared/database/prisma.service";
import { Connection as MongoConnection } from "mongoose";
import { InjectConnection } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as os from "os";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  message?: string;
  details?: any;
}

export interface DatabaseHealth {
  postgres: HealthStatus;
  mongodb: HealthStatus;
}

export interface SystemHealth {
  memory: {
    status: "healthy" | "warning" | "critical";
    usage: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    percentage: {
      heap: number;
      system: number;
    };
  };
  disk: {
    status: "healthy" | "warning" | "critical";
    usage: {
      total: number;
      free: number;
      used: number;
      percentage: number;
    };
  };
  uptime: number;
  loadAverage: number[];
}

@Injectable()
export class HealthService extends HealthIndicator {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    @InjectConnection() private mongoConnection: MongoConnection,
    private readonly configService: ConfigService
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    switch (key) {
      case "database":
      case "postgres":
        return this.checkPostgres();
      case "mongodb":
        return this.checkMongoDBStatus();
      case "redis":
        return this.checkRedis();
      default:
        return Promise.resolve({
          [key]: {
            status: "down",
            message: "Unknown service",
          },
        });
    }
  }

  private async checkPostgres(): Promise<HealthIndicatorResult> {
    try {
      // Simple query to check Prisma/PostgreSQL connection
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        postgres: {
          status: "up",
          database: "postgresql",
        },
      };
    } catch (error) {
      return {
        postgres: {
          status: "down",
          database: "postgresql",
          error: error.message,
        },
      };
    }
  }

  private async checkMongoDBStatus(): Promise<HealthIndicatorResult> {
    try {
      if (this.mongoConnection.readyState === 1) {
        // Connection is open
        return {
          mongodb: {
            status: "up",
            database: "mongodb",
            readyState: this.mongoConnection.readyState,
          },
        };
      } else {
        return {
          mongodb: {
            status: "down",
            database: "mongodb",
            readyState: this.mongoConnection.readyState,
          },
        };
      }
    } catch (error) {
      return {
        mongodb: {
          status: "down",
          database: "mongodb",
          error: error.message,
        },
      };
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      // Import Redis dynamically to avoid issues if not available
      const { default: Redis } = await import("ioredis");
      const redis = new Redis({
        host: this.configService.get("REDIS_HOST", "localhost"),
        port: parseInt(this.configService.get("REDIS_PORT", "6379")),
        password: this.configService.get("REDIS_PASSWORD"),
        connectTimeout: 5000,
        lazyConnect: true,
      });

      await redis.ping();
      redis.disconnect();

      return {
        redis: {
          status: "up",
          cache: "redis",
        },
      };
    } catch (error) {
      return {
        redis: {
          status: "down",
          cache: "redis",
          error: error.message,
        },
      };
    }
  }

  async checkDatabases(): Promise<DatabaseHealth> {
    const [postgres, mongodb] = await Promise.allSettled([
      this.checkPostgreSQL(),
      this.checkMongoDB(),
    ]);

    return {
      postgres:
        postgres.status === "fulfilled"
          ? postgres.value
          : {
              status: "unhealthy",
              message:
                postgres.status === "rejected"
                  ? postgres.reason.message
                  : "Unknown error",
            },
      mongodb:
        mongodb.status === "fulfilled"
          ? mongodb.value
          : {
              status: "unhealthy",
              message:
                mongodb.status === "rejected"
                  ? mongodb.reason.message
                  : "Unknown error",
            },
    };
  }

  private async checkPostgreSQL(): Promise<HealthStatus> {
    try {
      const isHealthy = await this.prismaService.isHealthy();
      if (!isHealthy) {
        return {
          status: "unhealthy",
          message: "PostgreSQL connection failed",
        };
      }

      const result = await this.prismaService.$queryRaw`SELECT NOW() as now`;
      return {
        status: "healthy",
        details: {
          connected: true,
          timestamp: result[0].now,
          database: "postgresql",
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `PostgreSQL connection failed: ${error.message}`,
      };
    }
  }

  private async checkMongoDB(): Promise<HealthStatus> {
    try {
      if (this.mongoConnection.readyState !== 1) {
        return {
          status: "unhealthy",
          message: `MongoDB connection state: ${this.mongoConnection.readyState}`,
        };
      }

      await this.mongoConnection.db.admin().ping();
      return {
        status: "healthy",
        details: {
          connected: true,
          readyState: this.mongoConnection.readyState,
          database: this.mongoConnection.name,
          host: this.mongoConnection.host,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: `MongoDB connection failed: ${error.message}`,
      };
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Get real disk usage
    const diskUsage = await this.getRealDiskUsage();

    const heapPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const systemMemoryPercentage = (usedMemory / totalMemory) * 100;
    const diskPercentage = (diskUsage.used / diskUsage.total) * 100;

    return {
      memory: {
        status: this.getMemoryStatus(systemMemoryPercentage),
        usage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
        },
        percentage: {
          heap: Math.round(heapPercentage * 100) / 100,
          system: Math.round(systemMemoryPercentage * 100) / 100,
        },
      },
      disk: {
        status: this.getDiskStatus(diskPercentage),
        usage: {
          total: diskUsage.total,
          free: diskUsage.free,
          used: diskUsage.used,
          percentage: Math.round(diskPercentage * 100) / 100,
        },
      },
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
    };
  }

  private getMemoryStatus(
    percentage: number
  ): "healthy" | "warning" | "critical" {
    if (percentage < 70) return "healthy";
    if (percentage < 85) return "warning";
    return "critical";
  }

  private getDiskStatus(
    percentage: number
  ): "healthy" | "warning" | "critical" {
    if (percentage < 80) return "healthy";
    if (percentage < 90) return "warning";
    return "critical";
  }

  private async getRealDiskUsage(): Promise<{
    total: number;
    free: number;
    used: number;
  }> {
    try {
      // Try to get real disk usage based on the platform
      const platform = os.platform();

      if (platform === "win32") {
        return await this.getWindowsDiskUsage();
      } else {
        return await this.getUnixDiskUsage();
      }
    } catch (error) {
      // Fallback to environment variables if commands fail
      console.warn(
        "Could not get real disk usage, using fallback:",
        error.message
      );
      return this.getFallbackDiskUsage();
    }
  }

  private async getWindowsDiskUsage(): Promise<{
    total: number;
    free: number;
    used: number;
  }> {
    try {
      // Get disk usage for the current drive on Windows
      const driveLetter = process.cwd().charAt(0);
      const { stdout } = await execAsync(
        `wmic logicaldisk where "DeviceID='${driveLetter}:'" get FreeSpace,Size /format:csv`
      );

      const lines = stdout.split("\n").filter((line) => line.includes(","));
      if (lines.length > 0) {
        const parts = lines[0].split(",");
        const free = parseInt(parts[1]) || 0;
        const total = parseInt(parts[2]) || 0;
        const used = total - free;

        return { total, free, used };
      }

      throw new Error("Could not parse Windows disk usage");
    } catch (error) {
      throw new Error(`Windows disk usage failed: ${error.message}`);
    }
  }

  private async getUnixDiskUsage(): Promise<{
    total: number;
    free: number;
    used: number;
  }> {
    try {
      // Use df command with proper escaping for macOS/Linux
      const currentDir = process.cwd().replace(/"/g, '\\"');
      const { stdout } = await execAsync(`df -k "${currentDir}"`);

      // Split lines and get the data line (skip header)
      const lines = stdout.trim().split("\n");
      let dataLine = lines[lines.length - 1]; // Last line contains the data

      // Handle case where filesystem name is on separate line (common on macOS)
      if (lines.length > 2 && !lines[1].includes("/")) {
        dataLine = lines[lines.length - 1];
      }

      const parts = dataLine.trim().split(/\s+/);

      // Try different parsing strategies based on number of parts
      let total, used, free;

      if (parts.length >= 9) {
        // macOS format: /dev/disk3s5 239362496 56982928 163230060 26% 968828 1632300600 0% /System/Volumes/Data
        total = parseInt(parts[1]) * 1024; // 1K-blocks
        used = parseInt(parts[2]) * 1024; // Used
        free = parseInt(parts[3]) * 1024; // Available
      } else if (parts.length >= 6) {
        // Standard Linux format: Filesystem 1K-blocks Used Available Use% Mounted
        total = parseInt(parts[1]) * 1024;
        used = parseInt(parts[2]) * 1024;
        free = parseInt(parts[3]) * 1024;
      } else if (parts.length >= 4) {
        // Simplified format: blocks Used Available Use%
        total = parseInt(parts[0]) * 1024;
        used = parseInt(parts[1]) * 1024;
        free = parseInt(parts[2]) * 1024;
      } else {
        // Try to find numeric values in the line
        const numbers = dataLine.match(/\d+/g);
        if (numbers && numbers.length >= 3) {
          total = parseInt(numbers[0]) * 1024;
          used = parseInt(numbers[1]) * 1024;
          free = parseInt(numbers[2]) * 1024;
        } else {
          throw new Error(`Could not extract numeric values from: ${dataLine}`);
        }
      }

      if (!total || total <= 0) {
        throw new Error(
          `Invalid disk values: total=${total}, used=${used}, free=${free}`
        );
      }

      return { total, free, used };
    } catch (error) {
      console.warn("Unix disk usage command failed:", error.message);
      throw new Error(`Unix disk usage failed: ${error.message}`);
    }
  }

  private getFallbackDiskUsage(): {
    total: number;
    free: number;
    used: number;
  } {
    try {
      // Try to get actual filesystem stats
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _stats = fs.statSync(process.cwd());

      // If we can't get real disk usage, throw to use environment variables
      throw new Error("Cannot determine real disk usage");
    } catch {
      // Use environment variables with sensible defaults
      const totalGB = parseInt(process.env.FALLBACK_DISK_TOTAL_GB || "100");
      const freeGB = parseInt(process.env.FALLBACK_DISK_FREE_GB || "50");

      const total = totalGB * 1024 * 1024 * 1024;
      const free = freeGB * 1024 * 1024 * 1024;
      const used = total - free;

      return {
        total,
        free,
        used,
      };
    }
  }

  async getOverallHealth(): Promise<{
    status: "healthy" | "unhealthy" | "degraded";
    databases: DatabaseHealth;
    system: SystemHealth;
    timestamp: string;
    environment: string;
    version: string;
  }> {
    const [databases, system] = await Promise.all([
      this.checkDatabases(),
      this.getSystemHealth(),
    ]);

    const isHealthy =
      databases.postgres.status === "healthy" &&
      databases.mongodb.status === "healthy" &&
      system.memory.status !== "critical" &&
      system.disk.status !== "critical";

    const isDegraded =
      databases.postgres.status === "degraded" ||
      databases.mongodb.status === "degraded" ||
      system.memory.status === "warning" ||
      system.disk.status === "warning";

    return {
      status: isHealthy ? "healthy" : isDegraded ? "degraded" : "unhealthy",
      databases,
      system,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };
  }
}
