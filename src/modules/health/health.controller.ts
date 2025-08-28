import { Controller, Get, HttpStatus, HttpException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Basic health check" })
  @ApiResponse({ status: 200, description: "Service is healthy" })
  @ApiResponse({ status: 503, description: "Service is unhealthy" })
  async check() {
    const health = await this.healthService.getOverallHealth();

    if (health.status === "unhealthy") {
      throw new HttpException(
        "Service Unavailable",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: health.status,
      timestamp: health.timestamp,
      service: "NestJS Enterprise API",
      version: health.version,
      environment: health.environment,
    };
  }

  @Get("detailed")
  @ApiOperation({ summary: "Detailed health check with all systems" })
  @ApiResponse({ status: 200, description: "Detailed health information" })
  @ApiResponse({ status: 503, description: "Service is unhealthy" })
  async detailedCheck() {
    const health = await this.healthService.getOverallHealth();

    if (health.status === "unhealthy") {
      throw new HttpException(health, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }

  @Get("database")
  @ApiOperation({ summary: "Database health check" })
  @ApiResponse({ status: 200, description: "Database connections are healthy" })
  @ApiResponse({
    status: 503,
    description: "Database connections are unhealthy",
  })
  async databaseCheck() {
    const databases = await this.healthService.checkDatabases();

    const isHealthy =
      databases.postgres.status === "healthy" &&
      databases.mongodb.status === "healthy";

    if (!isHealthy) {
      throw new HttpException(
        {
          status: "unhealthy",
          databases,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: "healthy",
      databases,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("system")
  @ApiOperation({ summary: "System resources health check" })
  @ApiResponse({ status: 200, description: "System resources are healthy" })
  @ApiResponse({ status: 503, description: "System resources are unhealthy" })
  async systemCheck() {
    try {
      const system = await this.healthService.getSystemHealth();

      const isHealthy =
        system.memory.status !== "critical" && system.disk.status !== "critical";

      if (!isHealthy) {
        throw new HttpException(
          {
            status: "unhealthy",
            system,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return {
        status: "healthy",
        system,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          status: "error",
          message: "System health check failed",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("readiness")
  @ApiOperation({ summary: "Kubernetes readiness probe" })
  @ApiResponse({
    status: 200,
    description: "Service is ready to accept traffic",
  })
  @ApiResponse({ status: 503, description: "Service is not ready" })
  async readiness() {
    const databases = await this.healthService.checkDatabases();

    const isReady =
      databases.postgres.status === "healthy" &&
      databases.mongodb.status === "healthy";

    if (!isReady) {
      throw new HttpException(
        "Service not ready",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: "ready",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("liveness")
  @ApiOperation({ summary: "Kubernetes liveness probe" })
  @ApiResponse({ status: 200, description: "Service is alive" })
  liveness() {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get("metrics")
  @ApiOperation({ summary: "Application metrics" })
  @ApiResponse({ status: 200, description: "Application metrics" })
  async metrics() {
    const system = await this.healthService.getSystemHealth();

    return {
      timestamp: new Date().toISOString(),
      uptime: system.uptime,
      memory: system.memory,
      loadAverage: system.loadAverage,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}
