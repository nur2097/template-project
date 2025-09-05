import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./services/auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshTokenService } from "./services/refresh-token.service";
import { PasswordResetService } from "./services/password-reset.service";
import { EmailVerificationService } from "./services/email-verification.service";
import { DeviceService } from "./services/device.service";
import { UsersModule } from "../users/users.module";
import { CompaniesModule } from "../companies/companies.module";
import { EmailModule } from "../email/email.module";
import { DatabaseModule } from "../../shared/database/database.module";
import { CacheModule } from "../../shared/cache/cache.module";
import { TokenBlacklistService } from "./services/token-blacklist.service";

@Module({
  imports: [
    UsersModule,
    CompaniesModule,
    EmailModule,
    DatabaseModule,
    CacheModule,
    PassportModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenService,
    PasswordResetService,
    EmailVerificationService,
    DeviceService,
    TokenBlacklistService,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    RefreshTokenService,
    PasswordResetService,
    EmailVerificationService,
    DeviceService,
    TokenBlacklistService,
  ],
})
export class AuthModule {}
