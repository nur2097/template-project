import { Module, DynamicModule } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { ConfigurationService } from "../../config/configuration.service";
import { LoggerService } from "./logger.service";
import { LoggerController } from "./logger.controller";
import { NestLoggerWrapper } from "./nest-logger-wrapper";

@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        ConfigModule,
        MongooseModule.forRootAsync({
          connectionName: "logs", // Match the @InjectConnection("logs") in LoggerService
          imports: [ConfigModule],
          inject: [ConfigurationService],
          useFactory: (configurationService: ConfigurationService) => {
            const logToMongodb = configurationService.logToMongodb;

            // Skip MongoDB connection if not needed
            if (!logToMongodb) {
              return {
                uri: "mongodb://localhost:27017/dummy",
                autoCreate: false,
                bufferCommands: false,
                bufferMaxEntries: 0,
              };
            }

            // Use the dedicated log database connection string
            const mongodbLogDb = configurationService.mongodbLogDb;

            return {
              uri: mongodbLogDb,
              retryWrites: true,
              w: "majority",
              autoCreate: true,
              bufferCommands: true,
            };
          },
        }),
      ],
      providers: [LoggerService, NestLoggerWrapper],
      controllers: [LoggerController],
      exports: [LoggerService, NestLoggerWrapper],
      global: true,
    };
  }
}
