import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export enum LogType {
  REQUEST = "request",
  RESPONSE = "response",
  ERROR = "error",
  INFO = "info",
  DEBUG = "debug",
  PERFORMANCE = "performance",
}

@Injectable()
export class LoggerService {
  constructor(@InjectConnection() private connection: Connection) {}

  async logRequest(data: {
    method: string;
    url: string;
    headers: any;
    body?: any;
    userAgent?: string;
    ip?: string;
    userId?: string;
  }) {
    const collection = this.connection.db.collection("request_logs");
    await collection.insertOne({
      ...data,
      timestamp: new Date(),
      type: LogType.REQUEST,
    });
  }

  async logResponse(data: {
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userId?: string;
  }) {
    const collection = this.connection.db.collection("response_logs");
    await collection.insertOne({
      ...data,
      timestamp: new Date(),
      type: LogType.RESPONSE,
    });
  }

  async logError(
    message: string,
    stack?: string,
    context?: string,
    userId?: string
  ) {
    const collection = this.connection.db.collection("error_logs");
    await collection.insertOne({
      message,
      stack,
      context,
      userId,
      timestamp: new Date(),
      type: LogType.ERROR,
      level: LogLevel.ERROR,
    });
  }

  async logInfo(message: string, context?: string, metadata?: any) {
    const collection = this.connection.db.collection("info_logs");
    await collection.insertOne({
      message,
      context,
      metadata,
      timestamp: new Date(),
      type: LogType.INFO,
      level: LogLevel.INFO,
    });
  }

  async logDebug(message: string, context?: string, metadata?: any) {
    if (process.env.NODE_ENV === "production") return;

    const collection = this.connection.db.collection("debug_logs");
    await collection.insertOne({
      message,
      context,
      metadata,
      timestamp: new Date(),
      type: LogType.DEBUG,
      level: LogLevel.DEBUG,
    });
  }

  async logPerformance(data: {
    operation: string;
    duration: number;
    context?: string;
    metadata?: any;
  }) {
    const collection = this.connection.db.collection("performance_logs");
    await collection.insertOne({
      ...data,
      timestamp: new Date(),
      type: LogType.PERFORMANCE,
    });
  }

  // Legacy method for backward compatibility
  async log(message: string, context?: string) {
    await this.logInfo(message, context);
  }

  // Get logs methods
  async getLogs(limit = 100) {
    const collection = this.connection.db.collection("info_logs");
    return collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getRequestLogs(limit = 100) {
    const collection = this.connection.db.collection("request_logs");
    return collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getResponseLogs(limit = 100) {
    const collection = this.connection.db.collection("response_logs");
    return collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getErrorLogs(limit = 100) {
    const collection = this.connection.db.collection("error_logs");
    return collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getPerformanceLogs(limit = 100) {
    const collection = this.connection.db.collection("performance_logs");
    return collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  // Analytics methods
  async getErrorStats(hours = 24) {
    const collection = this.connection.db.collection("error_logs");
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return collection
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: "$context", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();
  }

  async getPerformanceStats(hours = 24) {
    const collection = this.connection.db.collection("performance_logs");
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return collection
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: "$operation",
            avgDuration: { $avg: "$duration" },
            maxDuration: { $max: "$duration" },
            minDuration: { $min: "$duration" },
            count: { $sum: 1 },
          },
        },
        { $sort: { avgDuration: -1 } },
      ])
      .toArray();
  }
}
