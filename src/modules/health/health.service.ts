import { Injectable, Inject } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Connection as MongoConnection } from "mongoose";
import { InjectConnection } from "@nestjs/mongoose";
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
export class HealthService {
  constructor(
    @Inject("POSTGRES_DATA_SOURCE") private postgresDataSource: DataSource,
    @InjectConnection() private mongoConnection: MongoConnection,
  ) {}

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
      if (!this.postgresDataSource.isInitialized) {
        return {
          status: "unhealthy",
          message: "PostgreSQL connection not initialized",
        };
      }

      const result = await this.postgresDataSource.query("SELECT NOW()");
      return {
        status: "healthy",
        details: {
          connected: true,
          timestamp: result[0].now,
          database: this.postgresDataSource.options.database,
          host: (this.postgresDataSource.options as any).host,
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
    percentage: number,
  ): "healthy" | "warning" | "critical" {
    if (percentage < 70) return "healthy";
    if (percentage < 85) return "warning";
    return "critical";
  }

  private getDiskStatus(
    percentage: number,
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
      // Fallback to approximate calculation if commands fail
      console.warn(
        "Could not get real disk usage, using fallback:",
        error.message,
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
        `wmic logicaldisk where "DeviceID='${driveLetter}:'" get FreeSpace,Size /format:csv`,
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
      // Use df command on Unix-like systems (Linux, macOS)
      const { stdout } = await execAsync(`df -k "${process.cwd()}" | tail -1`);
      const parts = stdout.trim().split(/\s+/);

      if (parts.length >= 4) {
        const total = parseInt(parts[1]) * 1024; // Convert from KB to bytes
        const used = parseInt(parts[2]) * 1024;
        const free = parseInt(parts[3]) * 1024;

        return { total, free, used };
      }

      throw new Error("Could not parse Unix disk usage");
    } catch (error) {
      throw new Error(`Unix disk usage failed: ${error.message}`);
    }
  }

  private getFallbackDiskUsage(): {
    total: number;
    free: number;
    used: number;
  } {
    // Fallback: try to estimate based on available methods
    try {
      // Try to use fs.statSync to get some disk info
      // Using fs for fallback calculation
      fs.statSync(process.cwd());

      // This is a rough estimation - in production you might want to
      // configure these values or use a proper disk monitoring library
      const estimatedTotal = 500 * 1024 * 1024 * 1024; // 500GB estimate
      const estimatedFree = 200 * 1024 * 1024 * 1024; // 200GB estimate
      const estimatedUsed = estimatedTotal - estimatedFree;

      return {
        total: estimatedTotal,
        free: estimatedFree,
        used: estimatedUsed,
      };
    } catch {
      // Last resort: return minimal values
      return {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 50 * 1024 * 1024 * 1024, // 50GB
        used: 50 * 1024 * 1024 * 1024, // 50GB
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
