import { Injectable, Logger } from "@nestjs/common";
import { HealthService } from "../health.service";
import { ExternalApiHealthIndicator } from "../indicators/external-api.health";
import { ConnectionPoolHealthIndicator } from "../indicators/connection-pool.health";
import { HealthAlertingService, HealthAlert } from "./health-alerting.service";
import { CacheService } from "../../../shared/cache/cache.service";

export interface EnhancedHealthReport {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;

  // Core systems
  databases: any;
  system: any;

  // Enhanced features
  externalApis?: any;
  connectionPools?: any;
  responseTime: {
    total: number;
    breakdown: Record<string, number>;
  };

  // Alerting
  alerts: {
    active: HealthAlert[];
    stats: any;
  };

  // Performance metrics
  performance: {
    avgResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
}

@Injectable()
export class EnhancedHealthService {
  private readonly logger = new Logger(EnhancedHealthService.name);
  private readonly performanceMetrics = {
    requests: 0,
    errors: 0,
    totalResponseTime: 0,
    lastResetTime: Date.now(),
  };

  constructor(
    private readonly baseHealthService: HealthService,
    private readonly externalApiHealth: ExternalApiHealthIndicator,
    private readonly connectionPoolHealth: ConnectionPoolHealthIndicator,
    private readonly alertingService: HealthAlertingService,
    private readonly cacheService?: CacheService
  ) {
    // Reset performance metrics every hour
    setInterval(() => this.resetPerformanceMetrics(), 60 * 60 * 1000);
  }

  async getComprehensiveHealthReport(): Promise<EnhancedHealthReport> {
    const startTime = Date.now();
    const breakdown: Record<string, number> = {};

    try {
      // Run all health checks in parallel with timing
      const [overallHealth, externalApisResult, connectionPoolsResult] =
        await Promise.all([
          this.timeOperation("overall", () =>
            this.baseHealthService.getOverallHealth()
          ),
          this.timeOperation("external_apis", () => this.checkExternalApis()),
          this.timeOperation("connection_pools", () =>
            this.connectionPoolHealth.checkAllConnectionPools()
          ),
        ]);

      // Store timing results
      breakdown.overall = this.getLastOperationTime("overall");
      breakdown.external_apis = this.getLastOperationTime("external_apis");
      breakdown.connection_pools =
        this.getLastOperationTime("connection_pools");

      // Prepare enhanced report
      const healthData = {
        ...overallHealth,
        externalApis: externalApisResult,
        connectionPools: connectionPoolsResult,
      };

      // Evaluate alerts
      await this.alertingService.evaluateHealth(healthData);
      const activeAlerts = this.alertingService.getActiveAlerts();
      const alertStats = this.alertingService.getAlertStats();

      // Calculate overall status considering all systems
      const enhancedStatus = this.calculateEnhancedStatus(
        healthData,
        activeAlerts
      );

      const totalResponseTime = Date.now() - startTime;

      // Update performance metrics
      this.updatePerformanceMetrics(
        totalResponseTime,
        enhancedStatus !== "healthy"
      );

      const report: EnhancedHealthReport = {
        status: enhancedStatus,
        timestamp: new Date().toISOString(),
        environment: overallHealth.environment,
        version: overallHealth.version,
        uptime: process.uptime(),

        databases: overallHealth.databases,
        system: overallHealth.system,
        externalApis: externalApisResult,
        connectionPools: connectionPoolsResult,

        responseTime: {
          total: totalResponseTime,
          breakdown,
        },

        alerts: {
          active: activeAlerts,
          stats: alertStats,
        },

        performance: this.getPerformanceMetrics(),
      };

      // Cache the report for quick access
      if (this.cacheService) {
        await this.cacheService.set("health:last_report", report, 30); // Cache for 30 seconds
      }

      return report;
    } catch (error) {
      this.logger.error("Error generating comprehensive health report:", error);

      // Return minimal report on error
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        version: "1.0.0",
        uptime: process.uptime(),
        databases: { error: "Could not check databases" },
        system: { error: "Could not check system" },
        responseTime: {
          total: Date.now() - startTime,
          breakdown: { error: Date.now() - startTime },
        },
        alerts: {
          active: [],
          stats: { active: 0, critical: 0, warning: 0, totalHistory: 0 },
        },
        performance: this.getPerformanceMetrics(),
      };
    }
  }

  private async checkExternalApis(): Promise<any> {
    try {
      const commonServices = await this.externalApiHealth.checkCommonServices();
      return {
        status: this.getOverallExternalApiStatus(commonServices),
        services: commonServices,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private getOverallExternalApiStatus(
    services: Record<string, any>
  ): "healthy" | "degraded" | "unhealthy" {
    const statuses = Object.values(services).map(
      (service: any) => service[Object.keys(service)[0]]?.status
    );

    const downCount = statuses.filter((status) => status === "down").length;
    const totalCount = statuses.length;

    if (downCount === 0) return "healthy";
    if (downCount < totalCount / 2) return "degraded";
    return "unhealthy";
  }

  private calculateEnhancedStatus(
    healthData: any,
    activeAlerts: HealthAlert[]
  ): "healthy" | "degraded" | "unhealthy" {
    const baseStatus = healthData.status;
    const criticalAlerts = activeAlerts.filter(
      (a) => a.type === "critical"
    ).length;
    const warningAlerts = activeAlerts.filter(
      (a) => a.type === "warning"
    ).length;

    // Critical alerts always result in unhealthy status
    if (criticalAlerts > 0) {
      return "unhealthy";
    }

    // Warning alerts or degraded base status result in degraded
    if (warningAlerts > 0 || baseStatus === "degraded") {
      return "degraded";
    }

    // Consider external services
    if (healthData.externalApis?.status === "unhealthy") {
      return "degraded"; // External services down is degraded, not unhealthy
    }

    return baseStatus;
  }

  private operationTimes = new Map<string, number>();

  private async timeOperation<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      this.operationTimes.set(name, Date.now() - start);
      return result;
    } catch (error) {
      this.operationTimes.set(name, Date.now() - start);
      throw error;
    }
  }

  private getLastOperationTime(name: string): number {
    return this.operationTimes.get(name) || 0;
  }

  private updatePerformanceMetrics(
    responseTime: number,
    isError: boolean
  ): void {
    this.performanceMetrics.requests++;
    this.performanceMetrics.totalResponseTime += responseTime;

    if (isError) {
      this.performanceMetrics.errors++;
    }
  }

  private getPerformanceMetrics() {
    const timeSinceReset = Date.now() - this.performanceMetrics.lastResetTime;
    const timeSinceResetSeconds = timeSinceReset / 1000;

    return {
      avgResponseTime:
        this.performanceMetrics.requests > 0
          ? Math.round(
              this.performanceMetrics.totalResponseTime /
                this.performanceMetrics.requests
            )
          : 0,
      requestsPerSecond:
        timeSinceResetSeconds > 0
          ? Math.round(
              (this.performanceMetrics.requests / timeSinceResetSeconds) * 100
            ) / 100
          : 0,
      errorRate:
        this.performanceMetrics.requests > 0
          ? Math.round(
              (this.performanceMetrics.errors /
                this.performanceMetrics.requests) *
                10000
            ) / 100
          : 0,
    };
  }

  private resetPerformanceMetrics(): void {
    this.performanceMetrics.requests = 0;
    this.performanceMetrics.errors = 0;
    this.performanceMetrics.totalResponseTime = 0;
    this.performanceMetrics.lastResetTime = Date.now();
  }

  async getQuickHealthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    activeAlerts: number;
  }> {
    try {
      // Try to get cached report first
      if (this.cacheService) {
        const cached = (await this.cacheService.get(
          "health:last_report"
        )) as any;
        if (cached) {
          return {
            status: cached.status,
            timestamp: cached.timestamp,
            uptime: process.uptime(),
            activeAlerts: cached.alerts?.stats?.active || 0,
          };
        }
      }

      // Quick check of critical systems only
      const [dbHealth] = await Promise.all([
        this.baseHealthService.checkDatabases(),
      ]);

      const activeAlerts = this.alertingService.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter(
        (a) => a.type === "critical"
      ).length;

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (
        criticalAlerts > 0 ||
        dbHealth.postgres.status === "unhealthy" ||
        dbHealth.mongodb.status === "unhealthy"
      ) {
        status = "unhealthy";
      } else if (
        activeAlerts.length > 0 ||
        dbHealth.postgres.status === "degraded" ||
        dbHealth.mongodb.status === "degraded"
      ) {
        status = "degraded";
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeAlerts: activeAlerts.length,
      };
    } catch (error) {
      this.logger.error("Error in quick health check:", error);
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeAlerts: 0,
      };
    }
  }

  getAlertingService(): HealthAlertingService {
    return this.alertingService;
  }
}
