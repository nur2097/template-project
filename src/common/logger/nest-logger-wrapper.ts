import { Injectable, LoggerService } from "@nestjs/common";
import { LoggerService as CustomLoggerService } from "./logger.service";

@Injectable()
export class NestLoggerWrapper implements LoggerService {
  constructor(private readonly customLogger: CustomLoggerService) {}

  log(message: any, context?: string): void {
    this.customLogger.log(message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.customLogger.error(message, trace, context);
  }

  warn(message: any, context?: string): void {
    this.customLogger.warn(message, context);
  }

  debug(message: any, context?: string): void {
    this.customLogger.debug(message, context);
  }

  verbose(message: any, context?: string): void {
    this.customLogger.verbose(message, context);
  }
}
