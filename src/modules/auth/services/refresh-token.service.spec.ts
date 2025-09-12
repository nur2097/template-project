import { Test, TestingModule } from "@nestjs/testing";
import { RefreshTokenService } from "./refresh-token.service";
import { PrismaService } from "../../../shared/database/prisma.service";
import { CacheService } from "../../../shared/cache/cache.service";
import { RedisService } from "../../../shared/cache/redis.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigurationService } from "../../../config/configuration.service";

describe("RefreshTokenService", () => {
  let service: RefreshTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: PrismaService,
          useValue: {
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
            },
            device: {
              count: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((callback) => {
              const mockPrisma = {
                refreshToken: {
                  deleteMany: jest.fn(),
                  create: jest.fn(),
                },
              };
              return callback(mockPrisma);
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getClient: jest.fn().mockReturnValue({
              pipeline: jest.fn().mockReturnValue({
                set: jest.fn(),
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("test-access-token"),
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigurationService,
          useValue: {
            jwtSecret: "test-secret-at-least-32-characters-long",
            jwtExpiresIn: "1h",
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should have required methods", () => {
    expect(service.generateRefreshToken).toBeDefined();
    expect(service.refreshAccessToken).toBeDefined();
    expect(service.revokeDeviceTokens).toBeDefined();
    expect(service.revokeAllUserTokens).toBeDefined();
    expect(service.getUserActiveSessions).toBeDefined();
    expect(service.validateRefreshToken).toBeDefined();
    expect(service.revokeRefreshToken).toBeDefined();
    expect(service.generateAccessToken).toBeDefined();
    expect(service.cleanupExpiredTokens).toBeDefined();
  });
});
