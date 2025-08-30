import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class TokenBlacklistService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private jwtService: JwtService
  ) {}

  async blacklistToken(token: string): Promise<void> {
    try {
      // Decode token to get expiration time
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || !decoded.exp) {
        return; // Invalid token, don't blacklist
      }

      const now = Math.floor(Date.now() / 1000);
      const expiration = decoded.exp;

      if (expiration <= now) {
        return; // Token already expired
      }

      // Calculate TTL (time until token expires)
      const ttl = (expiration - now) * 1000; // Convert to milliseconds

      // Store in Redis with TTL
      await this.cacheManager.set(`blacklist:${token}`, "true", ttl);
    } catch (error) {
      console.error("Error blacklisting token:", error);
      // Continue execution even if blacklisting fails
    }
  }

  async blacklistUserTokens(userId: number): Promise<void> {
    // Store user ID in blacklist with current timestamp
    const timestamp = Date.now();
    const key = `blacklist:user:${userId}`;

    // Set TTL to match JWT expiration time
    const jwtExpiresIn = this.configService.get("JWT_EXPIRES_IN", "1h");
    const ttl = this.parseExpirationToMs(jwtExpiresIn);

    await this.cacheManager.set(key, timestamp.toString(), ttl);
  }

  async blacklistDeviceTokens(userId: number, deviceId: string): Promise<void> {
    const timestamp = Date.now();
    const key = `blacklist:device:${userId}:${deviceId}`;

    const jwtExpiresIn = this.configService.get("JWT_EXPIRES_IN", "1h");
    const ttl = this.parseExpirationToMs(jwtExpiresIn);

    await this.cacheManager.set(key, timestamp.toString(), ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // Check if specific token is blacklisted
      const isBlacklisted = await this.cacheManager.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return true;
      }

      // Check if token belongs to blacklisted user or device
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.sub || !decoded.iat) {
        return false;
      }

      const userId = decoded.sub;
      const deviceId = decoded.deviceId;
      const tokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds

      // Check if all user tokens are blacklisted
      const userBlacklistTime = await this.cacheManager.get(
        `blacklist:user:${userId}`
      );
      if (
        userBlacklistTime &&
        parseInt(userBlacklistTime as string) > tokenIssuedAt
      ) {
        return true;
      }

      // Check if device tokens are blacklisted
      if (deviceId) {
        const deviceBlacklistTime = await this.cacheManager.get(
          `blacklist:device:${userId}:${deviceId}`
        );
        if (
          deviceBlacklistTime &&
          parseInt(deviceBlacklistTime as string) > tokenIssuedAt
        ) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking token blacklist:", error);
      return false; // Fail open - don't block access if Redis is down
    }
  }

  async clearUserBlacklist(userId: number): Promise<void> {
    await this.cacheManager.del(`blacklist:user:${userId}`);
  }

  async clearDeviceBlacklist(userId: number, deviceId: string): Promise<void> {
    await this.cacheManager.del(`blacklist:device:${userId}:${deviceId}`);
  }

  private parseExpirationToMs(expiration: string): number {
    // Parse expiration strings like "1h", "30m", "7d", etc.
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 60 * 60 * 1000; // Default to 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }
}
