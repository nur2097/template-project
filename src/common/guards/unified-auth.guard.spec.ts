import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { UnifiedAuthGuard } from "./unified-auth.guard";
import { TokenBlacklistService } from "../../modules/auth/services/token-blacklist.service";
import { CasbinService } from "../casbin/casbin.service";
import { ConfigurationService } from "../../config/configuration.service";
import { SystemUserRole } from "@prisma/client";

describe("UnifiedAuthGuard", () => {
  let guard: UnifiedAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let casbinService: jest.Mocked<CasbinService>;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        headers: {},
      }),
      getResponse: jest.fn(),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: TokenBlacklistService,
          useValue: {
            isTokenBlacklisted: jest.fn(),
          },
        },
        {
          provide: CasbinService,
          useValue: {
            enforceForCompanyUser: jest.fn(),
          },
        },
        {
          provide: ConfigurationService,
          useValue: {
            jwtIssuer: "TestApp",
            jwtAudience: "http://localhost:3000",
            jwtExpiresIn: "1d",
          },
        },
      ],
    }).compile();

    guard = module.get<UnifiedAuthGuard>(UnifiedAuthGuard);
    reflector = module.get(Reflector);
    jwtService = module.get(JwtService);
    tokenBlacklistService = module.get(TokenBlacklistService);
    casbinService = module.get(CasbinService);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("Public endpoints", () => {
    it("should allow access to public endpoints", async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
    });
  });

  describe("JWT Authentication", () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false); // Not public
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        headers: {
          authorization: "Bearer valid.jwt.token",
        },
      });
    });

    it("should reject requests without authorization header", async () => {
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        headers: {},
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should reject requests with invalid Bearer format", async () => {
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        headers: {
          authorization: "Invalid token format",
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should reject blacklisted tokens", async () => {
      tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(true);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );

      expect(tokenBlacklistService.isTokenBlacklisted).toHaveBeenCalledWith(
        "valid.jwt.token"
      );
    });

    it("should reject invalid JWT tokens", async () => {
      tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error("Invalid token"));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should verify JWT with correct options", async () => {
      tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      jwtService.verifyAsync.mockResolvedValue({
        sub: "user123",
        companyId: 1,
        systemRole: SystemUserRole.USER,
      });

      // Mock no Casbin decorators
      reflector.getAllAndOverride.mockReturnValue(null);

      await guard.canActivate(mockExecutionContext);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith("valid.jwt.token", {
        issuer: "TestApp",
        audience: "http://localhost:3000",
        clockTolerance: 30,
        maxAge: "1d",
        ignoreNotBefore: false,
      });
    });
  });

  describe("SUPERADMIN bypass", () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        headers: { authorization: "Bearer token" },
      });
      tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
    });

    it("should allow SUPERADMIN to access super admin only endpoints", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "admin123",
        systemRole: SystemUserRole.SUPERADMIN,
      });

      // Mock super admin only decorator
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(true); // SUPER_ADMIN_ONLY_KEY

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it("should reject non-SUPERADMIN from super admin only endpoints", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "user123",
        systemRole: SystemUserRole.USER,
        companyId: 1,
      });

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(true); // SUPER_ADMIN_ONLY_KEY

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe("Company isolation", () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        headers: { authorization: "Bearer token" },
      });
      tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
    });

    it("should set company context for regular users", async () => {
      const mockRequest = {
        headers: { authorization: "Bearer token" },
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);

      jwtService.verifyAsync.mockResolvedValue({
        sub: "user123",
        systemRole: SystemUserRole.USER,
        companyId: 1,
      });

      reflector.getAllAndOverride.mockReturnValue(null); // No decorators

      await guard.canActivate(mockExecutionContext);

      expect(mockRequest).toEqual(
        expect.objectContaining({
          companyId: 1,
          company: { id: 1, isSuperAdminContext: false },
          isSuperAdmin: false,
          user: expect.any(Object),
        })
      );
    });

    it("should reject users without company", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "user123",
        systemRole: SystemUserRole.USER,
        // No companyId
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("should allow SUPERADMIN with global access", async () => {
      const mockRequest: any = {
        headers: { authorization: "Bearer token" },
        query: {},
        company: {},
      };

      mockExecutionContext
        .switchToHttp()
        .getRequest.mockReturnValue(mockRequest);

      jwtService.verifyAsync.mockResolvedValue({
        sub: "admin123",
        systemRole: SystemUserRole.SUPERADMIN,
        companyId: null,
      });

      reflector.getAllAndOverride.mockReturnValue(null);

      await guard.canActivate(mockExecutionContext);

      expect(mockRequest.company.isGlobalAccess).toBe(true);
    });
  });

  describe("Casbin authorization", () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        headers: { authorization: "Bearer token" },
      });
      tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      jwtService.verifyAsync.mockResolvedValue({
        sub: "user123",
        systemRole: SystemUserRole.USER,
        companyId: 1,
      });
    });

    it("should use Casbin when decorators are present", async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(false) // SUPER_ADMIN_ONLY_KEY
        .mockReturnValueOnce("users") // CASBIN_RESOURCE_KEY
        .mockReturnValueOnce("read"); // CASBIN_ACTION_KEY

      casbinService.enforceForCompanyUser.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(casbinService.enforceForCompanyUser).toHaveBeenCalledWith(
        1, // companyId fallback
        "user123",
        "users",
        "read"
      );
    });

    it("should reject unauthorized Casbin access", async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(false) // SUPER_ADMIN_ONLY_KEY
        .mockReturnValueOnce("users") // CASBIN_RESOURCE_KEY
        .mockReturnValueOnce("delete"); // CASBIN_ACTION_KEY

      casbinService.enforceForCompanyUser.mockResolvedValue(false);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException
      );
    });

    it("should bypass Casbin for SUPERADMIN", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "admin123",
        systemRole: SystemUserRole.SUPERADMIN,
      });

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // IS_PUBLIC_KEY
        .mockReturnValueOnce(false) // SUPER_ADMIN_ONLY_KEY
        .mockReturnValueOnce("users") // CASBIN_RESOURCE_KEY
        .mockReturnValueOnce("delete"); // CASBIN_ACTION_KEY

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(casbinService.enforceForCompanyUser).not.toHaveBeenCalled();
    });
  });

  describe("Legacy authorization fallback", () => {
    it("should fall back to legacy system when no Casbin decorators", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.getAllAndMerge.mockReturnValue([]);

      mockExecutionContext.switchToHttp().getRequest.mockReturnValue({
        headers: { authorization: "Bearer token" },
      });

      tokenBlacklistService.isTokenBlacklisted.mockResolvedValue(false);
      jwtService.verifyAsync.mockResolvedValue({
        sub: "user123",
        systemRole: SystemUserRole.USER,
        companyId: 1,
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });
  });
});
