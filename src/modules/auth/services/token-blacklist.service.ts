import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigurationService } from "../../../config/configuration.service";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigurationService,
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
      this.logger.error("Error blacklisting token:", error);
      // SECURITY: Don't throw on single token blacklist failure as it's not critical
      // The token will expire naturally based on its TTL
    }
  }

  async blacklistUserTokens(userId: number): Promise<void> {
    try {
      // Store user ID in blacklist with current timestamp
      const timestamp = Date.now();
      const key = `blacklist:user:${userId}`;

      // Set TTL to match JWT expiration time
      const jwtExpiresIn = this.configService.jwtExpiresIn;
      const ttl = this.parseExpirationToMs(jwtExpiresIn);

      await this.cacheManager.set(key, timestamp.toString(), ttl);
      this.logger.log(`User ${userId} tokens blacklisted successfully`);
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to blacklist user ${userId} tokens:`,
        error
      );
      // SECURITY: This is critical for permission changes, so we throw
      throw new Error(
        `Failed to invalidate permissions for user ${userId}: ${error.message}`
      );
    }
  }

  async blacklistDeviceTokens(userId: number, deviceId: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const key = `blacklist:device:${userId}:${deviceId}`;

      const jwtExpiresIn = this.configService.jwtExpiresIn;
      const ttl = this.parseExpirationToMs(jwtExpiresIn);

      await this.cacheManager.set(key, timestamp.toString(), ttl);
      this.logger.log(
        `Device ${deviceId} tokens for user ${userId} blacklisted successfully`
      );
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to blacklist device ${deviceId} tokens for user ${userId}:`,
        error
      );
      throw new Error(
        `Failed to invalidate device permissions: ${error.message}`
      );
    }
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
      this.logger.error("Error checking token blacklist:", error);
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
