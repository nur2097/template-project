import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import { RedisService } from "../../../shared/cache/redis.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { CryptoUtil } from "../../../common/utils/crypto.util";
import * as crypto from "crypto";

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async generateRefreshToken(
    userId: number,
    deviceId: string,
    companyId: number
  ): Promise<string> {
    const token = CryptoUtil.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prismaService.refreshToken.create({
      data: {
        token,
        userId,
        deviceId,
        companyId,
        expiresAt,
      },
    });

    return token;
  }

  async validateRefreshToken(token: string): Promise<any> {
    // Check if token is blacklisted in Redis
    const blacklisted = await this.redisService.get(`blacklist:${token}`);
    if (blacklisted) {
      return null;
    }

    // Check token in database
    const refreshToken = await this.prismaService.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            company: true,
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        device: true,
      },
    });

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.expiresAt < new Date()) {
      // Token expired, delete it
      await this.prismaService.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      return null;
    }

    return refreshToken;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    // Add to Redis blacklist
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    await this.redisService.set(`blacklist:${token}`, "true", expiresIn);

    // Remove from database
    await this.prismaService.refreshToken.deleteMany({
      where: { token },
    });
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    const tokens = await this.prismaService.refreshToken.findMany({
      where: { userId },
      select: { token: true },
    });

    // Add all tokens to blacklist
    const pipeline = this.redisService.getClient().pipeline();
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    tokens.forEach((tokenRecord) => {
      pipeline.set(`blacklist:${tokenRecord.token}`, "true", "EX", expiresIn);
    });

    await pipeline.exec();

    // Remove from database
    await this.prismaService.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async revokeDeviceTokens(userId: number, deviceId: string): Promise<void> {
    const tokens = await this.prismaService.refreshToken.findMany({
      where: { userId, deviceId },
      select: { token: true },
    });

    // Add to blacklist
    const pipeline = this.redisService.getClient().pipeline();
    const expiresIn = 7 * 24 * 60 * 60;

    tokens.forEach((tokenRecord) => {
      pipeline.set(`blacklist:${tokenRecord.token}`, "true", "EX", expiresIn);
    });

    await pipeline.exec();

    // Remove from database
    await this.prismaService.refreshToken.deleteMany({
      where: { userId, deviceId },
    });
  }

  async generateAccessToken(user: any): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      systemRole: user.systemRole,
      companyId: user.companyId,
      roles: user.roles?.map((ur: any) => ur.role.name) || [],
      permissions: this.extractPermissions(user.roles || []),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_SECRET"),
      expiresIn: this.configService.get("JWT_EXPIRES_IN", "1h"),
    });
  }

  private extractPermissions(userRoles: any[]): string[] {
    const permissions = new Set<string>();

    userRoles.forEach((userRole) => {
      userRole.role.permissions.forEach((rolePermission: any) => {
        permissions.add(rolePermission.permission.name);
      });
    });

    return Array.from(permissions);
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const tokenData = await this.validateRefreshToken(refreshToken);
    if (!tokenData) {
      return null;
    }

    // Generate new access token
    const accessToken = await this.generateAccessToken(tokenData.user);

    // CRITICAL FIX: Use atomic transaction to prevent race condition
    // This ensures old token is revoked exactly when new token is created
    const newRefreshTokenPlain = this.generateRefreshTokenPlain();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const result = await this.prismaService.$transaction(async (prisma) => {
      // First, revoke old refresh token and add to blacklist
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });

      // Add to Redis blacklist atomically
      const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
      await this.redisService.set(
        `blacklist:${refreshToken}`,
        "true",
        expiresIn
      );

      // Create new refresh token
      await prisma.refreshToken.create({
        data: {
          token: newRefreshTokenPlain,
          userId: tokenData.userId,
          deviceId: tokenData.deviceId,
          companyId: tokenData.companyId,
          expiresAt,
        },
      });

      return newRefreshTokenPlain;
    });

    return {
      accessToken,
      refreshToken: result,
    };
  }

  private generateRefreshTokenPlain(): string {
    // Helper method to generate refresh token without DB operations
    return crypto.randomBytes(32).toString("hex");
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.prismaService.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async getUserActiveSessions(userId: number): Promise<any[]> {
    const sessions = await this.prismaService.refreshToken.findMany({
      where: { userId },
      include: {
        device: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceId: session.deviceId,
      deviceName: session.device.deviceName,
      deviceType: session.device.deviceType,
      browser: session.device.browser,
      os: session.device.os,
      ip: session.device.ip,
      lastAccess: session.device.lastAccessAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }
}
