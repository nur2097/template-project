import { Module } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompaniesController } from "./companies.controller";
import { DatabaseModule } from "../../shared/database/database.module";
import { CacheModule } from "../../shared/cache/cache.module";

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
