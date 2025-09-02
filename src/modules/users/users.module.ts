import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { DatabaseModule } from "../../shared/database/database.module";
import { CacheModule } from "../../shared/cache/cache.module";

@Module({
  imports: [DatabaseModule, CacheModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
