import { Module, Global } from "@nestjs/common";
import { CasbinService } from "./casbin.service";
import { DatabaseModule } from "../../shared/database/database.module";
import { ConfigurationModule } from "../../config/configuration.module";

@Global()
@Module({
  imports: [DatabaseModule, ConfigurationModule],
  providers: [CasbinService],
  exports: [CasbinService],
})
export class CasbinModule {}
