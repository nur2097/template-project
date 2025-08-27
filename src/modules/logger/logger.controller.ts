import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { LoggerService } from "./logger.service";

@ApiTags("Logger")
@Controller("logger")
@ApiBearerAuth()
export class LoggerController {
  constructor(private loggerService: LoggerService) {}

  @Get("logs")
  @ApiOperation({ summary: "Get recent info logs" })
  @ApiResponse({ status: 200, description: "Logs retrieved successfully" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getLogs(@Query("limit") limit?: number) {
    const logs = await this.loggerService.getLogs(limit || 100);
    return {
      message: "Info logs retrieved successfully",
      count: logs.length,
      logs,
    };
  }

  @Get("request-logs")
  @ApiOperation({ summary: "Get request logs" })
  @ApiResponse({ status: 200, description: "Request logs retrieved" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getRequestLogs(@Query("limit") limit?: number) {
    const logs = await this.loggerService.getRequestLogs(limit || 100);
    return {
      message: "Request logs retrieved successfully",
      count: logs.length,
      logs,
    };
  }

  @Get("response-logs")
  @ApiOperation({ summary: "Get response logs" })
  @ApiResponse({ status: 200, description: "Response logs retrieved" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getResponseLogs(@Query("limit") limit?: number) {
    const logs = await this.loggerService.getResponseLogs(limit || 100);
    return {
      message: "Response logs retrieved successfully",
      count: logs.length,
      logs,
    };
  }

  @Get("error-logs")
  @ApiOperation({ summary: "Get error logs" })
  @ApiResponse({ status: 200, description: "Error logs retrieved" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getErrorLogs(@Query("limit") limit?: number) {
    const logs = await this.loggerService.getErrorLogs(limit || 100);
    return {
      message: "Error logs retrieved successfully",
      count: logs.length,
      logs,
    };
  }

  @Get("performance-logs")
  @ApiOperation({ summary: "Get performance logs" })
  @ApiResponse({ status: 200, description: "Performance logs retrieved" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getPerformanceLogs(@Query("limit") limit?: number) {
    const logs = await this.loggerService.getPerformanceLogs(limit || 100);
    return {
      message: "Performance logs retrieved successfully",
      count: logs.length,
      logs,
    };
  }

  @Get("stats/errors")
  @ApiOperation({ summary: "Get error statistics" })
  @ApiResponse({ status: 200, description: "Error statistics retrieved" })
  @ApiQuery({ name: "hours", required: false, type: Number })
  async getErrorStats(@Query("hours") hours?: number) {
    const stats = await this.loggerService.getErrorStats(hours || 24);
    return {
      message: "Error statistics retrieved successfully",
      period: `${hours || 24} hours`,
      stats,
    };
  }

  @Get("stats/performance")
  @ApiOperation({ summary: "Get performance statistics" })
  @ApiResponse({ status: 200, description: "Performance statistics retrieved" })
  @ApiQuery({ name: "hours", required: false, type: Number })
  async getPerformanceStats(@Query("hours") hours?: number) {
    const stats = await this.loggerService.getPerformanceStats(hours || 24);
    return {
      message: "Performance statistics retrieved successfully",
      period: `${hours || 24} hours`,
      stats,
    };
  }

  @Get("stats/summary")
  @ApiOperation({ summary: "Get overall logging statistics" })
  @ApiResponse({ status: 200, description: "Overall statistics retrieved" })
  async getOverallStats() {
    const [errorStats, performanceStats] = await Promise.all([
      this.loggerService.getErrorStats(24),
      this.loggerService.getPerformanceStats(24),
    ]);

    return {
      message: "Overall statistics retrieved successfully",
      period: "24 hours",
      summary: {
        totalErrors: errorStats.reduce((sum, stat) => sum + stat.count, 0),
        totalOperations: performanceStats.reduce(
          (sum, stat) => sum + stat.count,
          0,
        ),
        averageResponseTime:
          performanceStats.length > 0
            ? performanceStats.reduce(
                (sum, stat) => sum + stat.avgDuration,
                0,
              ) / performanceStats.length
            : 0,
        slowestOperation: performanceStats[0]?.avgDuration || 0,
      },
      errorStats,
      performanceStats,
    };
  }

  @Post("test")
  @ApiOperation({ summary: "Create test log entries" })
  @ApiResponse({ status: 201, description: "Test logs created" })
  async createTestLogs(@Body() body: { type?: string; message?: string }) {
    const { type = "info", message = "Test log entry" } = body;

    switch (type) {
      case "error":
        await this.loggerService.logError(
          message,
          "Test stack trace",
          "TEST_CONTROLLER",
        );
        break;
      case "debug":
        await this.loggerService.logDebug(message, "TEST_CONTROLLER", {
          test: true,
        });
        break;
      case "performance":
        await this.loggerService.logPerformance({
          operation: "test-operation",
          duration: Math.floor(Math.random() * 1000),
          context: "TEST_CONTROLLER",
        });
        break;
      default:
        await this.loggerService.logInfo(message, "TEST_CONTROLLER");
    }

    return {
      message: `Test ${type} log created successfully`,
      timestamp: new Date().toISOString(),
      type,
    };
  }
}
