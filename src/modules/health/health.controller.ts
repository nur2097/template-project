import { Controller, Get } from "@nestjs/common";
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from "@nestjs/terminus";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { ConfigurationService } from "../../config";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
    private readonly configService: ConfigurationService
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "Basic health check" })
  @ApiResponse({ status: 200, description: "Service is healthy" })
  @ApiResponse({ status: 503, description: "Service is unhealthy" })
  check() {
    const isProd = this.configService.isProduction;
    const indicators: Array<() => any> = [
      () => this.healthService.isHealthy("database"),
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
    ];

    // Only run disk check in production (dev environments often report pseudo-usage)
    if (isProd) {
      indicators.push(() =>
        this.disk.checkStorage("storage", {
          path: "/",
          threshold: 0.98,
        })
      );
    }

    return this.health.check(indicators);
  }

  @Get("database")
  @HealthCheck()
  @ApiOperation({ summary: "Database health check" })
  @ApiResponse({ status: 200, description: "Database connections are healthy" })
  @ApiResponse({
    status: 503,
    description: "Database connections are unhealthy",
  })
  checkDatabase() {
    return this.health.check([
      () => this.healthService.isHealthy("postgres"),
      () => this.healthService.isHealthy("mongodb"),
    ]);
  }

  @Get("memory")
  @HealthCheck()
  @ApiOperation({ summary: "Memory health check" })
  @ApiResponse({ status: 200, description: "Memory usage is healthy" })
  @ApiResponse({ status: 503, description: "Memory usage is unhealthy" })
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
      () => this.memory.checkRSS("memory_rss", 300 * 1024 * 1024),
    ]);
  }

  @Get("disk")
  @HealthCheck()
  @ApiOperation({ summary: "Disk health check" })
  @ApiResponse({ status: 200, description: "Disk usage is healthy" })
  @ApiResponse({ status: 503, description: "Disk usage is unhealthy" })
  checkDisk() {
    const isProd = this.configService.isProduction;
    if (!isProd) {
      // In development, report disk as up without failing the whole app
      return {
        status: "ok",
        info: { storage: { status: "up" } },
        error: {},
        details: { storage: { status: "up" } },
      };
    }

    return this.health.check([
      () =>
        this.disk.checkStorage("storage", {
          path: "/",
          threshold: 0.98,
        }),
    ]);
  }

  @Get("redis")
  @HealthCheck()
  @ApiOperation({ summary: "Redis health check" })
  @ApiResponse({ status: 200, description: "Redis is healthy" })
  @ApiResponse({ status: 503, description: "Redis is unhealthy" })
  checkRedis() {
    return this.health.check([() => this.healthService.isHealthy("redis")]);
  }

  @Public()
  @Get("readiness")
  @HealthCheck()
  @ApiOperation({ summary: "Kubernetes readiness probe" })
  @ApiResponse({
    status: 200,
    description: "Service is ready to accept traffic",
  })
  @ApiResponse({ status: 503, description: "Service is not ready" })
  readiness() {
    return this.health.check([
      () => this.healthService.isHealthy("postgres"),
      () => this.healthService.isHealthy("mongodb"),
      () => this.healthService.isHealthy("redis"),
    ]);
  }

  @Public()
  @Get("liveness")
  @ApiOperation({ summary: "Kubernetes liveness probe" })
  @ApiResponse({ status: 200, description: "Service is alive" })
  liveness() {
    return {
      status: "ok",
      info: {
        liveness: {
          status: "up",
        },
      },
      error: {},
      details: {
        liveness: {
          status: "up",
        },
      },
    };
  }

  @Get("detailed")
  @HealthCheck()
  @ApiOperation({ summary: "Detailed health check with all systems" })
  @ApiResponse({ status: 200, description: "Detailed health information" })
  @ApiResponse({ status: 503, description: "Service is unhealthy" })
  detailed() {
    const isProd = this.configService.isProduction;
    const indicators: Array<() => any> = [
      () => this.healthService.isHealthy("postgres"),
      () => this.healthService.isHealthy("mongodb"),
      () => this.healthService.isHealthy("redis"),
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
      () => this.memory.checkRSS("memory_rss", 300 * 1024 * 1024),
    ];

    // Only run disk check in production (dev environments often report pseudo-usage)
    if (isProd) {
      indicators.push(() =>
        this.disk.checkStorage("storage", {
          path: "/",
          threshold: 0.98,
        })
      );
    }

    return this.health.check(indicators);
  }

  @Get("metrics")
  @ApiOperation({ summary: "Application metrics" })
  @ApiResponse({ status: 200, description: "Application metrics" })
  async metrics() {
    const systemHealth = await this.healthService.getSystemHealth();

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
      },
      loadAverage: systemHealth.loadAverage,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}
