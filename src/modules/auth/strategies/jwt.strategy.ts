import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigurationService } from "@config/configuration.service";
import { TokenBlacklistService } from "../services/token-blacklist.service";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly tokenBlacklistService: TokenBlacklistService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
      passReqToCallback: true, // Pass request to validate method
    });

    // Ensure configService is marked as used
    this.configService = configService;
  }

  async validate(request: Request, payload: any) {
    // Validate JWT configuration
    if (!this.configService.jwtSecret) {
      throw new UnauthorizedException("JWT configuration error");
    }

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
