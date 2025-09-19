import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { ConfigurationService } from "@config/configuration.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@shared/database/prisma.service";

interface BlacklistEntry {
  token?: string;
  userId?: number;
  deviceId?: string;
  blacklistedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redisAvailable = true;
  private lastRedisCheck = 0;
  private readonly redisCheckInterval = 30000; // 30 seconds

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigurationService,
    private jwtService: JwtService,
    private prismaService: PrismaService
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

      // Try Redis first, fallback to database
      try {
        await this.cacheManager.set(`blacklist:${token}`, "true", ttl);
        this.redisAvailable = true;
      } catch (redisError) {
        this.logger.warn(
          "Redis unavailable, falling back to database for token blacklist"
        );
        this.redisAvailable = false;
        await this.fallbackToDatabase("token", {
          token,
          expiresAt: new Date(expiration * 1000),
        });
      }
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
      const expiresAt = new Date(Date.now() + ttl);

      // Try Redis first, fallback to database
      let success = false;

      if (this.redisAvailable) {
        try {
          await this.cacheManager.set(key, timestamp.toString(), ttl);
          success = true;
        } catch (redisError) {
          this.logger.warn(
            "Redis unavailable for user blacklist, falling back to database"
          );
          this.redisAvailable = false;
        }
      }

      if (!success) {
        await this.fallbackToDatabase("user", { userId, expiresAt });
      }

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
      // Try Redis first if available
      if (this.redisAvailable) {
        try {
          return await this.checkRedisBlacklist(token);
        } catch (redisError) {
          this.logger.warn("Redis check failed, falling back to database");
          this.redisAvailable = false;
        }
      }

      // Fallback to database check
      return await this.checkDatabaseBlacklist(token);
    } catch (error) {
      this.logger.error("Error checking token blacklist:", error);
      return false; // Fail open - don't block access if both Redis and DB fail
    }
  }

  private async checkRedisBlacklist(token: string): Promise<boolean> {
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
  }

  private async checkDatabaseBlacklist(token: string): Promise<boolean> {
    const decoded = this.jwtService.decode(token) as any;
    if (!decoded || !decoded.sub || !decoded.iat) {
      return false;
    }

    const userId = decoded.sub;
    const deviceId = decoded.deviceId;
    // const tokenIssuedAt = new Date(decoded.iat * 1000); // Reserved for future use

    // Clean up expired entries first
    await this.cleanupExpiredEntries();

    // Check for blacklisted entries
    const blacklistEntry = await this.prismaService.rateLimit.findFirst({
      where: {
        OR: [
          // Specific token blacklist
          { key: `blacklist:${token}` },
          // User-wide blacklist
          {
            key: `blacklist:user:${userId}`,
            expiresAt: { gt: new Date() },
          },
          // Device-specific blacklist
          ...(deviceId
            ? [
                {
                  key: `blacklist:device:${userId}:${deviceId}`,
                  expiresAt: { gt: new Date() },
                },
              ]
            : []),
        ],
      },
    });

    return !!blacklistEntry;
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

  private async fallbackToDatabase(
    type: "token" | "user" | "device",
    data: Partial<BlacklistEntry>
  ): Promise<void> {
    try {
      let key: string;

      if (type === "token") {
        key = `blacklist:${data.token}`;
      } else if (type === "user") {
        key = `blacklist:user:${data.userId}`;
      } else {
        key = `blacklist:device:${data.userId}:${data.deviceId}`;
      }

      // Use the rate_limits table as a fallback blacklist storage
      await this.prismaService.rateLimit.upsert({
        where: { key },
        update: {
          expiresAt: data.expiresAt!,
          points: 1,
        },
        create: {
          key,
          expiresAt: data.expiresAt!,
          points: 1,
        },
      });

      this.logger.log(`Blacklist entry stored in database: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to store blacklist in database: ${error.message}`
      );
      throw error;
    }
  }

  private async cleanupExpiredEntries(): Promise<void> {
    try {
      // Only run cleanup periodically to avoid performance impact
      const now = Date.now();
      if (now - this.lastRedisCheck < this.redisCheckInterval) {
        return;
      }
      this.lastRedisCheck = now;

      // Delete expired blacklist entries
      await this.prismaService.rateLimit.deleteMany({
        where: {
          key: { startsWith: "blacklist:" },
          expiresAt: { lt: new Date() },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired blacklist entries: ${error.message}`
      );
    }
  }

  async checkRedisHealth(): Promise<boolean> {
    try {
      await this.cacheManager.get("health-check");
      this.redisAvailable = true;
      return true;
    } catch (error) {
      this.redisAvailable = false;
      return false;
    }
  }
}
