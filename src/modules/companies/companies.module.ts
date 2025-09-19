import { Module } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompaniesController } from "./companies.controller";
import { DatabaseModule } from "../../shared/database/database.module";
import { CacheModule } from "../../shared/cache/cache.module";
import { EmailModule } from "../email/email.module";
import { ConfigurationModule } from "../../config/configuration.module";

@Module({
  imports: [DatabaseModule, CacheModule, EmailModule, ConfigurationModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
