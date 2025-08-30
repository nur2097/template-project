import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./services/auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshTokenService } from "./services/refresh-token.service";
import { PasswordResetService } from "./services/password-reset.service";
import { DeviceService } from "./services/device.service";
import { UsersModule } from "../users/users.module";
import { CompaniesModule } from "../companies/companies.module";
import { CacheModule } from "../../shared/cache/cache.module";
import { TokenBlacklistService } from "./services/token-blacklist.service";

@Module({
  imports: [
    UsersModule,
    CompaniesModule,
    CacheModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET") || "dev-jwt-secret",
        signOptions: { expiresIn: config.get("JWT_EXPIRES_IN") || "1d" },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenService,
    PasswordResetService,
    DeviceService,
    TokenBlacklistService,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    RefreshTokenService,
    PasswordResetService,
    DeviceService,
    TokenBlacklistService,
  ],
})
export class AuthModule {}
