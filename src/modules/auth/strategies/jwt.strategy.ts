import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TokenBlacklistService } from "../services/token-blacklist.service";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get("JWT_SECRET") ||
        "your-jwt-secret-change-this-in-production-make-it-very-long-and-secure",
      passReqToCallback: true, // Pass request to validate method
    });
  }

  async validate(request: Request, payload: any) {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    // Check if token is blacklisted
    const isBlacklisted =
      await this.tokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException("Token has been revoked");
    }

    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      systemRole: payload.systemRole,
      companyId: payload.companyId,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      deviceId: payload.deviceId,
      // Legacy support
      role: payload.systemRole,
      // Store token for potential blacklisting
      token,
    };
  }
}
