import { Test, TestingModule } from "@nestjs/testing";
import { RefreshTokenService } from "./refresh-token.service";
import { PrismaService } from "../../../shared/database/prisma.service";
import { CacheService } from "../../../shared/cache/cache.service";
import { RedisService } from "../../../shared/cache/redis.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

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
              count: jest.fn(),
            },
            device: {
              count: jest.fn(),
            },
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
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
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
  });
});
