import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/database/prisma.service";
import { RedisService } from "../../../shared/cache/redis.service";
import { Request } from "express";
import * as crypto from "crypto";

export interface DeviceInfo {
  deviceId?: string;
  userAgent: string;
  ip: string;
  deviceType: string;
  deviceName?: string;
  browser?: string;
  os?: string;
}

@Injectable()
export class DeviceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService
  ) {}

  generateDeviceId(userAgent: string, ip: string): string {
    // CRITICAL FIX: Remove Date.now() to ensure same device gets same ID
    // This allows proper device recognition and tracking
    const hash = crypto
      .createHash("sha256")
      .update(`${userAgent}:${ip}`)
      .digest("hex");
    return `dev_${hash.substring(0, 16)}`;
  }

  extractDeviceInfo(request: Request): DeviceInfo {
    const userAgent = request.get("User-Agent") || "Unknown";
    const ip = request.ip || request.socket.remoteAddress || "Unknown";

    const deviceInfo = this.parseUserAgent(userAgent);
    const deviceType = this.determineDeviceType(userAgent);

    return {
      userAgent,
      ip,
      deviceType,
      deviceName: deviceInfo.deviceName,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
    };
  }

  private parseUserAgent(userAgent: string): {
    deviceName?: string;
    browser?: string;
    os?: string;
  } {
    const result: { deviceName?: string; browser?: string; os?: string } = {};

    // Extract browser
    if (userAgent.includes("Chrome")) {
      result.browser = "Chrome";
    } else if (userAgent.includes("Firefox")) {
      result.browser = "Firefox";
    } else if (userAgent.includes("Safari")) {
      result.browser = "Safari";
    } else if (userAgent.includes("Edge")) {
      result.browser = "Edge";
    } else {
      result.browser = "Unknown";
    }

    // Extract OS
    if (userAgent.includes("Windows")) {
      result.os = "Windows";
    } else if (userAgent.includes("macOS") || userAgent.includes("Mac OS")) {
      result.os = "macOS";
    } else if (userAgent.includes("Linux")) {
      result.os = "Linux";
    } else if (userAgent.includes("Android")) {
      result.os = "Android";
    } else if (userAgent.includes("iOS")) {
      result.os = "iOS";
    } else {
      result.os = "Unknown";
    }

    // Set device name based on OS and browser
    result.deviceName = `${result.os} ${result.browser}`;

    return result;
  }

  private determineDeviceType(userAgent: string): string {
    if (userAgent.includes("Mobile")) {
      return "mobile";
    } else if (userAgent.includes("Tablet")) {
      return "tablet";
    } else {
      return "desktop";
    }
  }

  async createOrUpdateDevice(
    userId: number,
    companyId: number,
    deviceInfo: DeviceInfo,
    deviceId?: string
  ): Promise<any> {
    const finalDeviceId =
      deviceId || this.generateDeviceId(deviceInfo.userAgent, deviceInfo.ip);

    // Try to find existing device
    const existingDevice = await this.prismaService.device.findUnique({
      where: {
        deviceId_userId: {
          deviceId: finalDeviceId,
          userId,
        },
      },
    });

    if (existingDevice) {
      // Update last access time and other info
      return this.prismaService.device.update({
        where: { id: existingDevice.id },
        data: {
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          lastAccessAt: new Date(),
          isActive: true,
        },
      });
    } else {
      // Check device limit before creating new device
      await this.enforceDeviceLimit(userId);

      // Create new device
      return this.prismaService.device.create({
        data: {
          deviceId: finalDeviceId,
          deviceType: deviceInfo.deviceType,
          deviceName: deviceInfo.deviceName,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ip: deviceInfo.ip,
          userAgent: deviceInfo.userAgent,
          userId,
          companyId,
          lastAccessAt: new Date(),
        },
      });
    }
  }

  private async enforceDeviceLimit(
    userId: number,
    maxDevices: number = 5
  ): Promise<void> {
    const activeDevices = await this.prismaService.device.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastAccessAt: "asc", // Oldest first
      },
      include: {
        refreshTokens: {
          where: {
            expiresAt: { gt: new Date() }, // Only non-expired tokens
          },
          select: { token: true },
        },
      },
    });

    if (activeDevices.length >= maxDevices) {
      // CRITICAL FIX: Correct calculation for device limit enforcement
      // If we have 5 devices (at limit) and adding 1 more, remove 1 oldest device
      // Formula: remove (currentCount - maxDevices + 1) devices
      const devicesToRemoveCount = activeDevices.length - maxDevices + 1;
      const devicesToRemove = activeDevices.slice(0, devicesToRemoveCount);

      for (const device of devicesToRemove) {
        // Blacklist all refresh tokens for this device using Redis pipeline
        if (device.refreshTokens.length > 0) {
          const pipeline = this.redisService.getClient().pipeline();
          const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

          device.refreshTokens.forEach((tokenRecord) => {
            pipeline.set(
              `blacklist:${tokenRecord.token}`,
              "true",
              "EX",
              expiresIn
            );
          });

          await pipeline.exec();
        }

        // Deactivate device
        await this.prismaService.device.update({
          where: { id: device.id },
          data: { isActive: false },
        });

        // Revoke all refresh tokens for this device
        await this.prismaService.refreshToken.deleteMany({
          where: { deviceId: device.deviceId, userId },
        });
      }
    }
  }

  async getUserDevices(userId: number): Promise<any[]> {
    return this.prismaService.device.findMany({
      where: { userId, isActive: true },
      orderBy: { lastAccessAt: "desc" },
      include: {
        refreshTokens: {
          select: {
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async deactivateDevice(userId: number, deviceId: string): Promise<void> {
    await this.prismaService.device.updateMany({
      where: { deviceId, userId },
      data: { isActive: false },
    });
  }

  async deactivateAllUserDevices(userId: number): Promise<void> {
    await this.prismaService.device.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  async getDeviceById(deviceId: string): Promise<any> {
    return this.prismaService.device.findFirst({
      where: { deviceId },
    });
  }

  async updateDeviceLastAccess(deviceId: string): Promise<void> {
    await this.prismaService.device.updateMany({
      where: { deviceId },
      data: { lastAccessAt: new Date() },
    });
  }

  async cleanupOldDevices(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.prismaService.device.deleteMany({
      where: {
        lastAccessAt: {
          lt: cutoffDate,
        },
        isActive: false,
      },
    });
  }
}
