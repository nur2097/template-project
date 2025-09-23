import { Controller, Get, Query, Param, Post } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { SuperAdminOnly } from "../../common/decorators/super-admin-only.decorator";
import { CanReadHealth } from "../../common/decorators/casbin.decorator";
import { ResponseUtil } from "../../common/utils/response.util";
import { EnhancedHealthService } from "./services/enhanced-health.service";
import { ExternalApiHealthIndicator } from "./indicators/external-api.health";
import { ConnectionPoolHealthIndicator } from "./indicators/connection-pool.health";
import {
  QuickHealthResponseDto,
  ComprehensiveHealthResponseDto,
  ExternalApisResponseDto,
  ConnectionPoolsResponseDto,
} from "./dto/health-response.dto";
import { ErrorResponseDto } from "../../common/dto/standard-response.dto";

@ApiTags("Enhanced Health")
@Controller("health/enhanced")
export class EnhancedHealthController {
  constructor(
    private readonly enhancedHealthService: EnhancedHealthService,
    private readonly externalApiHealth: ExternalApiHealthIndicator,
    private readonly connectionPoolHealth: ConnectionPoolHealthIndicator
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Quick health status check" })
  @ApiResponse({
    status: 200,
    description: "Quick health status",
    type: QuickHealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: "System is unhealthy",
    type: ErrorResponseDto,
  })
  async quickHealthCheck() {
    const health = await this.enhancedHealthService.getQuickHealthCheck();
    return ResponseUtil.success(health, "Quick health check completed");
  }

  @Get("comprehensive")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @CanReadHealth()
  @ApiOperation({ summary: "Comprehensive health report with all systems" })
  @ApiResponse({
    status: 200,
    description: "Comprehensive health report",
    type: ComprehensiveHealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: "System is unhealthy",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Super admin access required",
    type: ErrorResponseDto,
  })
  async comprehensiveHealthCheck() {
    const report =
      await this.enhancedHealthService.getComprehensiveHealthReport();

    const statusCode =
      report.status === "healthy"
        ? 200
        : report.status === "degraded"
          ? 200
          : 503;

    return ResponseUtil.success(
      report,
      "Comprehensive health report generated",
      undefined,
      statusCode
    );
  }

  @Get("external-apis")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Check external API health" })
  @ApiResponse({
    status: 200,
    description: "External API health status",
    type: ExternalApisResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Super admin access required",
    type: ErrorResponseDto,
  })
  async checkExternalApis() {
    const result = await this.externalApiHealth.checkCommonServices();
    return ResponseUtil.success(result, "External APIs health checked");
  }

  @Get("external-apis/:apiName")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Check specific external API health" })
  @ApiParam({
    name: "apiName",
    description: "Name of the API to check",
    example: "github",
  })
  @ApiResponse({
    status: 200,
    description: "Specific API health status",
    type: ExternalApisResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "API not found",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Super admin access required",
    type: ErrorResponseDto,
  })
  async checkSpecificExternalApi(@Param("apiName") apiName: string) {
    // This would require extending the ExternalApiHealthIndicator to support specific API checks
    const commonServices = await this.externalApiHealth.checkCommonServices();
    const specificService =
      commonServices[apiName.toLowerCase().replace(/\s+/g, "_")];

    if (!specificService) {
      return ResponseUtil.success(
        null,
        `API '${apiName}' not found in monitored services`,
        undefined,
        404
      );
    }

    return ResponseUtil.success(
      specificService,
      `Health status for ${apiName}`
    );
  }

  @Get("connection-pools")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Check database connection pool health" })
  @ApiResponse({
    status: 200,
    description: "Connection pool health status",
    type: ConnectionPoolsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Super admin access required",
    type: ErrorResponseDto,
  })
  async checkConnectionPools() {
    const pools = await this.connectionPoolHealth.checkAllConnectionPools();
    return ResponseUtil.success(pools, "Connection pools checked");
  }

  @Get("connection-pools/metrics")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Get detailed connection pool metrics" })
  @ApiResponse({ status: 200, description: "Connection pool metrics" })
  async getConnectionPoolMetrics() {
    const metrics = await this.connectionPoolHealth.getConnectionPoolMetrics();
    return ResponseUtil.success(metrics, "Connection pool metrics retrieved");
  }

  @Get("alerts")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Get active health alerts" })
  @ApiResponse({ status: 200, description: "Active health alerts" })
  async getActiveAlerts() {
    const alertingService = this.enhancedHealthService.getAlertingService();
    const alerts = alertingService.getActiveAlerts();
    const stats = alertingService.getAlertStats();

    return ResponseUtil.success(
      { alerts, stats },
      `Retrieved ${alerts.length} active alerts`
    );
  }

  @Get("alerts/history")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Get health alerts history" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of alerts to return",
  })
  @ApiResponse({ status: 200, description: "Health alerts history" })
  async getAlertsHistory(@Query("limit") limit?: string) {
    const alertingService = this.enhancedHealthService.getAlertingService();
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    const history = alertingService.getAlertHistory(limitNumber);

    return ResponseUtil.success(
      history,
      `Retrieved ${history.length} alert history entries`
    );
  }

  @Get("alerts/stats")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Get health alerting statistics" })
  @ApiResponse({ status: 200, description: "Health alerting statistics" })
  async getAlertStats() {
    const alertingService = this.enhancedHealthService.getAlertingService();
    const stats = alertingService.getAlertStats();

    return ResponseUtil.success(stats, "Alert statistics retrieved");
  }

  @Post("alerts/clear-resolved")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Clear resolved alerts from active alerts list" })
  @ApiResponse({ status: 200, description: "Resolved alerts cleared" })
  async clearResolvedAlerts() {
    const alertingService = this.enhancedHealthService.getAlertingService();
    const clearedCount = alertingService.clearResolvedAlerts();

    return ResponseUtil.success(
      { clearedCount },
      `Cleared ${clearedCount} resolved alerts`
    );
  }

  @Get("dashboard")
  @ApiBearerAuth("JWT-Auth")
  @SuperAdminOnly()
  @ApiOperation({ summary: "Get health dashboard data" })
  @ApiResponse({ status: 200, description: "Health dashboard data" })
  async getHealthDashboard() {
    const [quickHealth, alerts, alertStats] = await Promise.all([
      this.enhancedHealthService.getQuickHealthCheck(),
      this.enhancedHealthService.getAlertingService().getActiveAlerts(),
      this.enhancedHealthService.getAlertingService().getAlertStats(),
    ]);

    const dashboardData = {
      status: quickHealth.status,
      uptime: quickHealth.uptime,
      timestamp: quickHealth.timestamp,
      alerts: {
        active: alerts.slice(0, 10), // Latest 10 alerts
        stats: alertStats,
      },
      quickStats: {
        totalAlerts: alertStats.active,
        criticalAlerts: alertStats.critical,
        warningAlerts: alertStats.warning,
        systemUptime: Math.floor(quickHealth.uptime / 3600), // hours
      },
    };

    return ResponseUtil.success(
      dashboardData,
      "Health dashboard data retrieved"
    );
  }

  @Get("status-badge")
  @Public()
  @ApiOperation({
    summary: "Get simple status badge data (for external monitoring)",
  })
  @ApiResponse({ status: 200, description: "Status badge data" })
  async getStatusBadge() {
    const health = await this.enhancedHealthService.getQuickHealthCheck();

    const badgeData = {
      status: health.status,
      uptime: Math.floor(health.uptime / 3600), // hours
      timestamp: health.timestamp,
      color:
        health.status === "healthy"
          ? "green"
          : health.status === "degraded"
            ? "orange"
            : "red",
      message:
        health.status === "healthy"
          ? "All Systems Operational"
          : health.status === "degraded"
            ? "Some Systems Degraded"
            : "System Issues Detected",
    };

    return ResponseUtil.success(badgeData, "Status badge data retrieved");
  }

  @Get("prometheus")
  @Public()
  @ApiOperation({ summary: "Prometheus metrics endpoint" })
  @ApiResponse({ status: 200, description: "Prometheus metrics format" })
  async getPrometheusMetrics() {
    const report =
      await this.enhancedHealthService.getComprehensiveHealthReport();

    const metrics = this.generatePrometheusMetrics(report);

    // Return as plain text for Prometheus
    return metrics;
  }

  private generatePrometheusMetrics(report: any): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    // System status metrics
    lines.push(
      "# HELP system_health_status Current system health status (0=unhealthy, 1=degraded, 2=healthy)"
    );
    lines.push("# TYPE system_health_status gauge");
    const statusValue =
      report.status === "healthy" ? 2 : report.status === "degraded" ? 1 : 0;
    lines.push(`system_health_status ${statusValue} ${timestamp}`);

    // Uptime
    lines.push("# HELP system_uptime_seconds System uptime in seconds");
    lines.push("# TYPE system_uptime_seconds counter");
    lines.push(
      `system_uptime_seconds ${Math.floor(report.uptime)} ${timestamp}`
    );

    // Memory metrics
    if (report.system?.memory) {
      lines.push("# HELP system_memory_usage_percent Memory usage percentage");
      lines.push("# TYPE system_memory_usage_percent gauge");
      lines.push(
        `system_memory_usage_percent ${report.system.memory.percentage.system} ${timestamp}`
      );
    }

    // Disk metrics
    if (report.system?.disk) {
      lines.push("# HELP system_disk_usage_percent Disk usage percentage");
      lines.push("# TYPE system_disk_usage_percent gauge");
      lines.push(
        `system_disk_usage_percent ${report.system.disk.usage.percentage} ${timestamp}`
      );
    }

    // Alert metrics
    lines.push("# HELP system_active_alerts Number of active alerts");
    lines.push("# TYPE system_active_alerts gauge");
    lines.push(
      `system_active_alerts ${report.alerts.stats.active} ${timestamp}`
    );

    lines.push("# HELP system_critical_alerts Number of critical alerts");
    lines.push("# TYPE system_critical_alerts gauge");
    lines.push(
      `system_critical_alerts ${report.alerts.stats.critical} ${timestamp}`
    );

    // Response time metrics
    lines.push(
      "# HELP health_check_response_time_ms Health check response time in milliseconds"
    );
    lines.push("# TYPE health_check_response_time_ms gauge");
    lines.push(
      `health_check_response_time_ms ${report.responseTime.total} ${timestamp}`
    );

    return lines.join("\n") + "\n";
  }
}
