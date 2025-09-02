import { Module, forwardRef } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";
import { PermissionsController } from "./permissions.controller";
import { DatabaseModule } from "../../shared/database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule), // Prevent circular dependency
  ],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
