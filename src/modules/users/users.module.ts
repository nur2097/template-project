import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { postgresProviders } from "../../shared/database/postgres.provider";

@Module({
  providers: [UsersService, ...postgresProviders],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
