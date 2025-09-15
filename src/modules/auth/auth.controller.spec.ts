import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./services/auth.service";
import { RefreshTokenService } from "./services/refresh-token.service";
import { TokenBlacklistService } from "./services/token-blacklist.service";
import { PasswordResetService } from "./services/password-reset.service";
import { EmailVerificationService } from "./services/email-verification.service";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { CompaniesService } from "../companies/companies.service";
import { ConfigurationService } from "../../config";
import { ThrottlerGuard } from "@nestjs/throttler";
import { EnhancedRateLimitGuard } from "../../common/guards/rate-limit.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
  };

  const mockCompaniesService = {
    findBySlug: jest.fn(),
    create: jest.fn(),
  };

  const mockPasswordResetService = {
    generateResetToken: jest.fn(),
    validateResetToken: jest.fn(),
  };

  const mockEmailVerificationService = {
    generateVerificationToken: jest.fn(),
    verifyEmail: jest.fn(),
  };

  const mockAuthResponse = {
    user: {
      id: 1,
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      fullName: "John Doe",
      systemRole: "USER" as any,
      status: "ACTIVE" as any,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: 1,
    },
    accessToken: "jwt-access-token",
    refreshToken: "jwt-refresh-token",
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      logoutFromAllDevices: jest.fn(),
      changePassword: jest.fn(),
      resetPassword: jest.fn(),
      forgotPassword: jest.fn(),
    };

    const mockRefreshTokenService = {
      validateRefreshToken: jest.fn(),
    };

    const mockTokenBlacklistService = {
      blacklistToken: jest.fn(),
      blacklistUserTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: ConfigurationService,
          useValue: {
            jwtSecret: "test-secret",
            corsOrigin: "*",
          },
        },
        {
          provide: "CacheService",
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: CompaniesService,
          useValue: mockCompaniesService,
        },
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(EnhancedRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(
      AuthService
    ) as jest.Mocked<AuthService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "Password123!",
      };

      const mockRequest = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Browser" },
      } as unknown as Request;

      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(authService.login).toHaveBeenCalledWith(loginDto, mockRequest);
      expect(result).toEqual(mockAuthResponse);
    });

    it("should throw UnauthorizedException for invalid credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockRequest = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Browser" },
      } as unknown as Request;

      authService.login.mockRejectedValue(
        new UnauthorizedException("Invalid credentials")
      );

      await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe("register", () => {
    it("should register new user successfully", async () => {
      const registerDto: RegisterDto = {
        email: "newuser@example.com",
        firstName: "Jane",
        lastName: "Doe",
        password: "Password123!",
        companySlug: "test-company",
      };

      const mockRequest = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Browser" },
      } as unknown as Request;

      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto, mockRequest);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        mockRequest
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it("should throw BadRequestException for duplicate email", async () => {
      const registerDto: RegisterDto = {
        email: "existing@example.com",
        firstName: "Jane",
        lastName: "Doe",
        password: "Password123!",
        companySlug: "test-company",
      };

      const mockRequest = {
        ip: "127.0.0.1",
        headers: { "user-agent": "Test Browser" },
      } as unknown as Request;

      authService.register.mockRejectedValue(
        new BadRequestException("User with this email already exists")
      );

      await expect(
        controller.register(registerDto, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("refresh", () => {
    it("should refresh tokens successfully", async () => {
      const refreshDto = { refreshToken: "valid-refresh-token" };
      const mockRefreshResponse = {
        user: mockAuthResponse.user,
        accessToken: "new-jwt-access-token",
        refreshToken: "new-jwt-refresh-token",
      };

      authService.refreshTokens.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refreshTokens(refreshDto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshDto.refreshToken
      );
      expect(result).toEqual(mockRefreshResponse);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const mockUser = { id: 1, email: "test@example.com" };
      const mockRequest = {
        headers: { authorization: "Bearer jwt-token" },
        user: mockUser,
      } as unknown as Request;

      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(
        {
          id: 1,
          sub: 1,
          token: "jwt-token",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          systemRole: "USER",
          companyId: 1,
        },
        mockRequest
      );

      expect(authService.logout).toHaveBeenCalledWith(
        1,
        mockRequest,
        "jwt-token"
      );
      expect(result).toBeDefined();
    });
  });
});
