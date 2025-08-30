import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerService } from "./logger.service";
import { LoggerController } from "./logger.controller";
import { NestLoggerWrapper } from "./nest-logger-wrapper";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
      }),
    }),
  ],
  providers: [LoggerService, NestLoggerWrapper],
  controllers: [LoggerController],
  exports: [LoggerService, NestLoggerWrapper],
})
export class LoggerModule {}
