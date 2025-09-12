import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigurationService } from "../../../config/configuration.service";
import { RefreshTokenService } from "./refresh-token.service";
import { DeviceService } from "./device.service";
import { TokenBlacklistService } from "./token-blacklist.service";
import { CompaniesService } from "../../companies/companies.service";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByEmailWithPermissions: jest.fn(),
            create: jest.fn(),
            updateLastLogin: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
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
        {
          provide: RefreshTokenService,
          useValue: {
            generateRefreshToken: jest.fn(),
            refreshAccessToken: jest.fn(),
            revokeDeviceTokens: jest.fn(),
            revokeAllUserTokens: jest.fn(),
            getUserActiveSessions: jest.fn(),
          },
        },
        {
          provide: DeviceService,
          useValue: {
            extractDeviceInfo: jest.fn(),
            createOrUpdateDevice: jest.fn(),
            getDeviceById: jest.fn(),
            generateDeviceId: jest.fn(),
            getUserDevices: jest.fn(),
            deactivateDevice: jest.fn(),
            deactivateAllUserDevices: jest.fn(),
          },
        },
        {
          provide: TokenBlacklistService,
          useValue: {
            blacklistToken: jest.fn(),
            blacklistDeviceTokens: jest.fn(),
            blacklistUserTokens: jest.fn(),
          },
        },
        {
          provide: CompaniesService,
          useValue: {
            findBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should have required authentication methods", () => {
    expect(service.login).toBeDefined();
    expect(service.register).toBeDefined();
    expect(service.refreshTokens).toBeDefined();
    expect(service.logout).toBeDefined();
    expect(service.logoutAll).toBeDefined();
    expect(service.logoutOtherDevices).toBeDefined();
  });

  it("should have required permission methods", () => {
    expect(service.invalidateUserPermissions).toBeDefined();
    expect(service.invalidateUsersPermissions).toBeDefined();
  });

  it("should have required session methods", () => {
    expect(service.getUserActiveSessions).toBeDefined();
    expect(service.revokeDeviceAccess).toBeDefined();
  });
});
