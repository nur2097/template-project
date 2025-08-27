import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { postgresProviders } from "../../shared/database/postgres.provider";

@Module({
  controllers: [HealthController],
  providers: [HealthService, ...postgresProviders],
  exports: [HealthService],
})
export class HealthModule {}
