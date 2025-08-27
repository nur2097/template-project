import { Injectable, Inject } from "@nestjs/common";
import { DataSource, Connection } from "typeorm";
import { Connection as MongoConnection } from "mongoose";
import { InjectConnection } from "@nestjs/mongoose";
import * as fs from "fs";
import * as os from "os";

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
      postgres: postgres.status === "fulfilled" ? postgres.value : {
        status: "unhealthy",
        message: postgres.status === "rejected" ? postgres.reason.message : "Unknown error",
      },
      mongodb: mongodb.status === "fulfilled" ? mongodb.value : {
        status: "unhealthy",
        message: mongodb.status === "rejected" ? mongodb.reason.message : "Unknown error",
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

  getSystemHealth(): SystemHealth {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Disk usage (simplified - in production, use proper disk space calculation)
    const stats = fs.statSync(process.cwd());
    const diskTotal = 100 * 1024 * 1024 * 1024; // 100GB default
    const diskFree = 50 * 1024 * 1024 * 1024; // 50GB default
    const diskUsed = diskTotal - diskFree;

    const heapPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const systemMemoryPercentage = (usedMemory / totalMemory) * 100;
    const diskPercentage = (diskUsed / diskTotal) * 100;

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
          total: diskTotal,
          free: diskFree,
          used: diskUsed,
          percentage: Math.round(diskPercentage * 100) / 100,
        },
      },
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
    };
  }

  private getMemoryStatus(percentage: number): "healthy" | "warning" | "critical" {
    if (percentage < 70) return "healthy";
    if (percentage < 85) return "warning";
    return "critical";
  }

  private getDiskStatus(percentage: number): "healthy" | "warning" | "critical" {
    if (percentage < 80) return "healthy";
    if (percentage < 90) return "warning";
    return "critical";
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
      Promise.resolve(this.getSystemHealth()),
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