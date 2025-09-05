import { ApiProperty } from "@nestjs/swagger";
import { StandardResponseDto } from "../../../common/dto/standard-response.dto";

export class HealthStatusDto {
  @ApiProperty({
    description: "System health status",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({
    description: "Health check timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "System uptime in seconds",
    example: 3600,
  })
  uptime: number;

  @ApiProperty({
    description: "Number of active alerts",
    example: 0,
  })
  activeAlerts: number;
}

export class DatabaseHealthDto {
  @ApiProperty({
    description: "Database connection status",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({
    description: "Response time in milliseconds",
    example: 45,
  })
  responseTime: number;

  @ApiProperty({
    description: "Additional database information",
    type: "object",
  })
  details: Record<string, any>;
}

export class SystemMetricsDto {
  @ApiProperty({
    description: "Memory usage information",
    type: "object",
  })
  memory: {
    free: number;
    used: number;
    total: number;
    percentage: {
      used: number;
      system: number;
    };
  };

  @ApiProperty({
    description: "Disk usage information",
    type: "object",
  })
  disk: {
    free: number;
    used: number;
    total: number;
    usage: {
      percentage: number;
    };
  };

  @ApiProperty({
    description: "CPU usage information",
    type: "object",
  })
  cpu: {
    usage: number;
    loadAvg: number[];
  };
}

export class HealthAlertDto {
  @ApiProperty({
    description: "Alert unique identifier",
    example: "alert_123456",
  })
  id: string;

  @ApiProperty({
    description: "Alert type",
    enum: ["critical", "warning"],
    example: "warning",
  })
  type: "critical" | "warning";

  @ApiProperty({
    description: "Component that triggered the alert",
    example: "database",
  })
  component: string;

  @ApiProperty({
    description: "Alert message",
    example: "Database response time exceeded threshold",
  })
  message: string;

  @ApiProperty({
    description: "Alert creation timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  createdAt: string;

  @ApiProperty({
    description: "Alert resolution timestamp (if resolved)",
    required: false,
    example: "2024-01-01T12:05:00.000Z",
  })
  resolvedAt?: string;

  @ApiProperty({
    description: "Additional alert data",
    type: "object",
  })
  data: Record<string, any>;
}

export class AlertStatsDto {
  @ApiProperty({
    description: "Number of currently active alerts",
    example: 2,
  })
  active: number;

  @ApiProperty({
    description: "Number of critical alerts",
    example: 0,
  })
  critical: number;

  @ApiProperty({
    description: "Number of warning alerts",
    example: 2,
  })
  warning: number;

  @ApiProperty({
    description: "Total alerts in history",
    example: 15,
  })
  totalHistory: number;
}

export class PerformanceMetricsDto {
  @ApiProperty({
    description: "Average response time in milliseconds",
    example: 125,
  })
  avgResponseTime: number;

  @ApiProperty({
    description: "Requests per second",
    example: 12.5,
  })
  requestsPerSecond: number;

  @ApiProperty({
    description: "Error rate percentage",
    example: 0.5,
  })
  errorRate: number;
}

export class ResponseTimeBreakdownDto {
  @ApiProperty({
    description: "Total response time in milliseconds",
    example: 250,
  })
  total: number;

  @ApiProperty({
    description: "Response time breakdown by component",
    type: "object",
    additionalProperties: { type: "number" },
  })
  breakdown: Record<string, number>;
}

export class ExternalApiStatusDto {
  @ApiProperty({
    description: "External API overall status",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({
    description: "Individual service statuses",
    type: "object",
  })
  services: Record<string, any>;

  @ApiProperty({
    description: "Last check timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  lastChecked: string;
}

export class ConnectionPoolStatusDto {
  @ApiProperty({
    description: "PostgreSQL connection pool status",
    type: "object",
  })
  postgres_pool: {
    status: "healthy" | "degraded" | "unhealthy";
    type: string;
    responseTime: string;
    concurrentQueries: number;
    connectionInfo: any;
    lastChecked: string;
  };

  @ApiProperty({
    description: "Redis connection pool status",
    type: "object",
  })
  redis_pool: {
    status: "healthy" | "degraded" | "unhealthy";
    type: string;
    responseTime: string;
    operations: number;
    info: any;
    lastChecked: string;
  };
}

export class ComprehensiveHealthReportDto {
  @ApiProperty({
    description: "Overall system health status",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({
    description: "Report generation timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Environment name",
    example: "production",
  })
  environment: string;

  @ApiProperty({
    description: "Application version",
    example: "1.0.0",
  })
  version: string;

  @ApiProperty({
    description: "System uptime in seconds",
    example: 3600,
  })
  uptime: number;

  @ApiProperty({
    description: "Database health information",
    type: "object",
  })
  databases: Record<string, DatabaseHealthDto>;

  @ApiProperty({
    description: "System metrics",
    type: SystemMetricsDto,
  })
  system: SystemMetricsDto;

  @ApiProperty({
    description: "External APIs status",
    type: ExternalApiStatusDto,
    required: false,
  })
  externalApis?: ExternalApiStatusDto;

  @ApiProperty({
    description: "Connection pools status",
    type: ConnectionPoolStatusDto,
    required: false,
  })
  connectionPools?: ConnectionPoolStatusDto;

  @ApiProperty({
    description: "Response time information",
    type: ResponseTimeBreakdownDto,
  })
  responseTime: ResponseTimeBreakdownDto;

  @ApiProperty({
    description: "Alert information",
    type: "object",
  })
  alerts: {
    active: HealthAlertDto[];
    stats: AlertStatsDto;
  };

  @ApiProperty({
    description: "Performance metrics",
    type: PerformanceMetricsDto,
  })
  performance: PerformanceMetricsDto;
}

export class HealthDashboardDto {
  @ApiProperty({
    description: "Current system status",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({
    description: "System uptime in seconds",
    example: 3600,
  })
  uptime: number;

  @ApiProperty({
    description: "Dashboard timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Alert information",
    type: "object",
  })
  alerts: {
    active: HealthAlertDto[];
    stats: AlertStatsDto;
  };

  @ApiProperty({
    description: "Quick statistics",
    type: "object",
  })
  quickStats: {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    systemUptime: number;
  };
}

export class StatusBadgeDto {
  @ApiProperty({
    description: "System status",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({
    description: "System uptime in hours",
    example: 24,
  })
  uptime: number;

  @ApiProperty({
    description: "Badge timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "Badge color",
    enum: ["green", "orange", "red"],
    example: "green",
  })
  color: "green" | "orange" | "red";

  @ApiProperty({
    description: "Badge message",
    example: "All Systems Operational",
  })
  message: string;
}

export class QuickHealthResponseDto extends StandardResponseDto<HealthStatusDto> {
  @ApiProperty({ type: HealthStatusDto })
  data: HealthStatusDto;
}

export class ComprehensiveHealthResponseDto extends StandardResponseDto<ComprehensiveHealthReportDto> {
  @ApiProperty({ type: ComprehensiveHealthReportDto })
  data: ComprehensiveHealthReportDto;
}

export class ExternalApisResponseDto extends StandardResponseDto<
  Record<string, any>
> {
  @ApiProperty({ type: "object" })
  data: Record<string, any>;
}

export class ConnectionPoolsResponseDto extends StandardResponseDto<ConnectionPoolStatusDto> {
  @ApiProperty({ type: ConnectionPoolStatusDto })
  data: ConnectionPoolStatusDto;
}

export class AlertsResponseDto extends StandardResponseDto<{
  alerts: HealthAlertDto[];
  stats: AlertStatsDto;
}> {
  @ApiProperty({
    type: "object",
    properties: {
      alerts: {
        type: "array",
        items: { $ref: "#/components/schemas/HealthAlertDto" },
      },
      stats: { $ref: "#/components/schemas/AlertStatsDto" },
    },
  })
  data: { alerts: HealthAlertDto[]; stats: AlertStatsDto };
}

export class DashboardResponseDto extends StandardResponseDto<HealthDashboardDto> {
  @ApiProperty({ type: HealthDashboardDto })
  data: HealthDashboardDto;
}

export class StatusBadgeResponseDto extends StandardResponseDto<StatusBadgeDto> {
  @ApiProperty({ type: StatusBadgeDto })
  data: StatusBadgeDto;
}
