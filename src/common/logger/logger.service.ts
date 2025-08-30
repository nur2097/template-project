import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import * as winston from "winston";
import "winston-mongodb";

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
  WARN = "warn",
  PERFORMANCE = "performance",
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly winston: winston.Logger;

  constructor(@InjectConnection() private connection: Connection) {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.printf(
              ({ timestamp, level, message, context, ...meta }) => {
                const ctx = context ? `[${context}]` : "";
                const metaStr = Object.keys(meta).length
                  ? JSON.stringify(meta)
                  : "";
                return `${timestamp} ${level} ${ctx} ${message} ${metaStr}`;
              }
            )
          ),
        }),

        ...(process.env.LOG_TO_MONGODB !== "false" && process.env.MONGODB_URI
          ? [
              new winston.transports.MongoDB({
                db: process.env.MONGODB_URI,
                collection: "request_logs",
                level: "debug",
                options: {
                  useUnifiedTopology: true,
                },
                format: winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json()
                ),
              }),

              new winston.transports.MongoDB({
                db: process.env.MONGODB_URI,
                collection: "error_logs",
                level: "error",
                options: {
                  useUnifiedTopology: true,
                },
                format: winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.errors({ stack: true }),
                  winston.format.json()
                ),
              }),

              new winston.transports.MongoDB({
                db: process.env.MONGODB_URI,
                collection: "info_logs",
                level: "info",
                options: {
                  useUnifiedTopology: true,
                },
                format: winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json()
                ),
              }),
            ]
          : []),
      ],
    });

    if (
      process.env.NODE_ENV !== "production" &&
      process.env.LOG_TO_MONGODB !== "false" &&
      process.env.MONGODB_URI
    ) {
      this.winston.add(
        new winston.transports.MongoDB({
          db: process.env.MONGODB_URI,
          collection: "debug_logs",
          level: "debug",
          options: {
            useUnifiedTopology: true,
          },
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }
  }

  log(message: any, context?: string) {
    this.winston.info(message, { context, type: LogType.INFO });
  }

  error(message: any, trace?: string, context?: string) {
    this.winston.error(message, { trace, context, type: LogType.ERROR });
  }

  warn(message: any, context?: string) {
    this.winston.warn(message, { context, type: LogType.WARN });
  }

  debug(message: any, context?: string) {
    this.winston.debug(message, { context, type: LogType.DEBUG });
  }

  verbose(message: any, context?: string) {
    this.winston.verbose(message, { context, type: LogType.DEBUG });
  }

  async logRequest(data: {
    method: string;
    url: string;
    headers?: any;
    body?: any;
    userAgent?: string;
    ip?: string;
    userId?: string;
    correlationId?: string;
  }) {
    const collection = this.connection.db.collection("request_logs");
    await collection.insertOne({
      ...data,
      timestamp: new Date(),
      type: LogType.REQUEST,
    });

    this.winston.info(`${data.method} ${data.url}`, {
      context: "HttpRequest",
      type: LogType.REQUEST,
      ...data,
    });
  }

  async logResponse(data: {
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    userId?: string;
    correlationId?: string;
  }) {
    const collection = this.connection.db.collection("response_logs");
    await collection.insertOne({
      ...data,
      timestamp: new Date(),
      type: LogType.RESPONSE,
    });

    this.winston.info(
      `${data.method} ${data.url} - ${data.statusCode} - ${data.responseTime}ms`,
      {
        context: "HttpResponse",
        type: LogType.RESPONSE,
        ...data,
      }
    );
  }

  async logError(
    message: string,
    stack?: string,
    context?: string,
    userId?: string,
    metadata?: any
  ) {
    const collection = this.connection.db.collection("error_logs");
    await collection.insertOne({
      message,
      stack,
      context,
      userId,
      metadata,
      timestamp: new Date(),
      type: LogType.ERROR,
      level: LogLevel.ERROR,
    });

    this.winston.error(message, {
      context,
      userId,
      metadata,
      stack,
      type: LogType.ERROR,
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

    this.winston.info(message, {
      context,
      metadata,
      type: LogType.INFO,
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

    this.winston.debug(message, {
      context,
      metadata,
      type: LogType.DEBUG,
    });
  }

  async logPerformance(data: {
    operation: string;
    duration: number;
    method?: string;
    url?: string;
    statusCode?: number;
    userId?: string;
    userAgent?: string;
    ip?: string;
    correlationId?: string;
    timestamp?: Date;
    metadata?: any;
  }) {
    const collection = this.connection.db.collection("performance_logs");
    await collection.insertOne({
      ...data,
      timestamp: data.timestamp || new Date(),
      type: LogType.PERFORMANCE,
    });

    this.winston.info(`PERF: ${data.operation} - ${data.duration}ms`, {
      context: "Performance",
      type: LogType.PERFORMANCE,
      ...data,
    });
  }

  async cleanupOldLogs(
    collectionName: string,
    cutoffDate: Date
  ): Promise<{ deletedCount: number }> {
    try {
      const collection = this.connection.db.collection(collectionName);
      const result = await collection.deleteMany({
        timestamp: { $lt: cutoffDate },
      });
      return { deletedCount: result.deletedCount || 0 };
    } catch (error) {
      throw new Error(`Failed to cleanup ${collectionName}: ${error.message}`);
    }
  }

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
