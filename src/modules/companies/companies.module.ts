import { Module } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompaniesController } from "./companies.controller";
import { PrismaService } from "../../shared/database/prisma.service";
import { CacheService } from "../../shared/cache/cache.service";

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, PrismaService, CacheService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
