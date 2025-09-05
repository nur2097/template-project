import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { HealthController } from "./health.controller";
import { EnhancedHealthController } from "./enhanced-health.controller";
import { HealthService } from "./health.service";
import { EnhancedHealthService } from "./services/enhanced-health.service";
import { HealthAlertingService } from "./services/health-alerting.service";
import { ExternalApiHealthIndicator } from "./indicators/external-api.health";
import { ConnectionPoolHealthIndicator } from "./indicators/connection-pool.health";
import { DatabaseModule } from "../../shared/database/database.module";
import { CacheModule } from "../../shared/cache/cache.module";
import { ConfigurationModule } from "../../config";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    DatabaseModule,
    CacheModule,
    ConfigurationModule,
    EmailModule,
  ],
  controllers: [HealthController, EnhancedHealthController],
  providers: [
    HealthService,
    EnhancedHealthService,
    HealthAlertingService,
    ExternalApiHealthIndicator,
    ConnectionPoolHealthIndicator,
  ],
  exports: [HealthService, EnhancedHealthService, HealthAlertingService],
})
export class HealthModule {}
