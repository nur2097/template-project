import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { JwtService } from "@nestjs/jwt";
import { TokenBlacklistService } from "./token-blacklist.service";
import { ConfigurationService } from "../../../config/configuration.service";

describe("TokenBlacklistService", () => {
  let service: TokenBlacklistService;
  let cacheManager: jest.Mocked<Cache>;
  let configService: jest.Mocked<ConfigurationService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: ConfigurationService,
          useFactory: () => {
            const mockConfig = {
              _jwtExpiresIn: "1d",
              get jwtExpiresIn() {
                return this._jwtExpiresIn;
              },
              set jwtExpiresIn(value) {
                this._jwtExpiresIn = value;
              },
            };
            return mockConfig;
          },
        },
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    cacheManager = module.get(CACHE_MANAGER);
    configService = module.get(ConfigurationService);
    jwtService = module.get(JwtService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("blacklistToken", () => {
    it("should blacklist a valid token", async () => {
      const token = "valid.jwt.token";
      const now = Math.floor(Date.now() / 1000);
      const expiration = now + 3600; // 1 hour from now

      jwtService.decode.mockReturnValue({
        sub: "user123",
        exp: expiration,
        iat: now,
      });

      await service.blacklistToken(token);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `blacklist:${token}`,
        "true",
        3600000 // TTL in milliseconds
      );
    });

    it("should not blacklist expired tokens", async () => {
      const token = "expired.jwt.token";
      const now = Math.floor(Date.now() / 1000);
      const expiration = now - 3600; // Expired 1 hour ago

      jwtService.decode.mockReturnValue({
        sub: "user123",
        exp: expiration,
        iat: now - 7200,
      });

      await service.blacklistToken(token);

      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it("should handle invalid tokens gracefully", async () => {
      const token = "invalid.jwt.token";
      jwtService.decode.mockReturnValue(null);

      await service.blacklistToken(token);

      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe("isTokenBlacklisted", () => {
    it("should return true for blacklisted tokens", async () => {
      const token = "blacklisted.jwt.token";
      cacheManager.get.mockResolvedValue({
        userId: "user123",
        blacklistedAt: new Date(),
        reason: "manual",
      });

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith(`blacklist:${token}`);
    });

    it("should return false for non-blacklisted tokens", async () => {
      const token = "valid.jwt.token";
      cacheManager.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(false);
      expect(cacheManager.get).toHaveBeenCalledWith(`blacklist:${token}`);
    });

    it("should handle cache errors gracefully", async () => {
      const token = "error.jwt.token";
      cacheManager.get.mockRejectedValue(new Error("Cache connection failed"));

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(false); // Should default to false on error
    });
  });

  describe("blacklistDeviceTokens", () => {
    it("should blacklist all tokens for a device", async () => {
      const userId = 123;
      const deviceId = "device456";

      await service.blacklistDeviceTokens(userId, deviceId);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `blacklist:device:${userId}:${deviceId}`,
        expect.any(String), // timestamp as string
        86400000 // 1 day in milliseconds
      );
    });

    it("should handle cache errors", async () => {
      const userId = 123;
      const deviceId = "device456";

      cacheManager.set.mockRejectedValue(new Error("Cache error"));

      await expect(
        service.blacklistDeviceTokens(userId, deviceId)
      ).rejects.toThrow("Failed to invalidate device permissions");
    });
  });

  describe("blacklistUserTokens", () => {
    it("should blacklist all tokens for a user", async () => {
      const userId = 123;

      await service.blacklistUserTokens(userId);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `blacklist:user:${userId}`,
        expect.any(String), // timestamp as string
        86400000 // 1 day in milliseconds
      );
    });

    it("should handle cache errors and throw", async () => {
      const userId = 123;

      cacheManager.set.mockRejectedValue(new Error("Cache error"));

      await expect(service.blacklistUserTokens(userId)).rejects.toThrow(
        "Failed to invalidate permissions for user 123"
      );
    });
  });

  describe("clearUserBlacklist", () => {
    it("should clear user blacklist", async () => {
      const userId = 123;

      await service.clearUserBlacklist(userId);

      expect(cacheManager.del).toHaveBeenCalledWith(`blacklist:user:${userId}`);
    });
  });

  describe("clearDeviceBlacklist", () => {
    it("should clear device blacklist", async () => {
      const userId = 123;
      const deviceId = "device456";

      await service.clearDeviceBlacklist(userId, deviceId);

      expect(cacheManager.del).toHaveBeenCalledWith(
        `blacklist:device:${userId}:${deviceId}`
      );
    });
  });

  describe("isTokenBlacklisted", () => {
    const mockToken = "test.jwt.token";
    const now = Math.floor(Date.now() / 1000);

    it("should return true for directly blacklisted tokens", async () => {
      cacheManager.get.mockResolvedValueOnce("true"); // Direct blacklist

      const result = await service.isTokenBlacklisted(mockToken);

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith(`blacklist:${mockToken}`);
    });

    it("should return true for user blacklisted tokens", async () => {
      const tokenIssuedAt = now - 3600; // 1 hour ago
      const blacklistTime = now * 1000; // Blacklisted now

      cacheManager.get
        .mockResolvedValueOnce(null) // Not directly blacklisted
        .mockResolvedValueOnce(blacklistTime.toString()); // User blacklisted

      jwtService.decode.mockReturnValue({
        sub: "user123",
        iat: tokenIssuedAt,
        exp: now + 3600,
      });

      const result = await service.isTokenBlacklisted(mockToken);

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith("blacklist:user:user123");
    });

    it("should return true for device blacklisted tokens", async () => {
      const tokenIssuedAt = now - 3600; // 1 hour ago
      const blacklistTime = now * 1000; // Blacklisted now

      cacheManager.get
        .mockResolvedValueOnce(null) // Not directly blacklisted
        .mockResolvedValueOnce(null) // User not blacklisted
        .mockResolvedValueOnce(blacklistTime.toString()); // Device blacklisted

      jwtService.decode.mockReturnValue({
        sub: "user123",
        deviceId: "device456",
        iat: tokenIssuedAt,
        exp: now + 3600,
      });

      const result = await service.isTokenBlacklisted(mockToken);

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith(
        "blacklist:device:user123:device456"
      );
    });

    it("should return false for valid tokens", async () => {
      cacheManager.get.mockResolvedValue(null);

      jwtService.decode.mockReturnValue({
        sub: "user123",
        iat: now - 3600,
        exp: now + 3600,
      });

      const result = await service.isTokenBlacklisted(mockToken);

      expect(result).toBe(false);
    });

    it("should handle invalid tokens gracefully", async () => {
      jwtService.decode.mockReturnValue(null);

      const result = await service.isTokenBlacklisted("invalid.token");

      expect(result).toBe(false);
    });

    it("should handle cache errors gracefully", async () => {
      cacheManager.get.mockRejectedValue(new Error("Cache error"));

      const result = await service.isTokenBlacklisted(mockToken);

      expect(result).toBe(false); // Fail open
    });
  });

  describe("TTL parsing", () => {
    it("should calculate correct TTL for different time units", async () => {
      const testCases = [
        { expiresIn: "30s", expectedMs: 30000 },
        { expiresIn: "5m", expectedMs: 300000 },
        { expiresIn: "1h", expectedMs: 3600000 },
        { expiresIn: "7d", expectedMs: 604800000 },
      ];

      for (const testCase of testCases) {
        (configService as any).jwtExpiresIn = testCase.expiresIn;

        await service.blacklistUserTokens(123);

        expect(cacheManager.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          testCase.expectedMs
        );

        jest.clearAllMocks();
      }
    });

    it("should use default TTL for invalid format", async () => {
      (configService as any).jwtExpiresIn = "invalid";

      await service.blacklistUserTokens(123);

      // Should use default TTL (1 hour)
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        3600000
      );
    });
  });
});
