import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@shared/database/prisma.service";
import { ConfigurationService } from "@config/configuration.service";
import { PasswordUtil } from "@common/utils/password.util";
import { PersonalInfo } from "@common/utils/password-policy.util";
import { UsersService } from "../../users/users.service";
import { RefreshTokenService } from "./refresh-token.service";
import { DeviceService } from "./device.service";
import { TokenBlacklistService } from "./token-blacklist.service";
import { SanitizerUtil } from "@common/utils/sanitizer.util";
import {
  InvalidCredentialsException,
  RefreshTokenNotFoundException,
  AccountNotVerifiedException,
  InvalidCompanyInvitationException,
} from "@common/exceptions";
import { CreateUserDto } from "../../users/dto/create-user.dto";
import { UserResponseDto } from "../../users/dto/user-response.dto";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { AuthResponseDto } from "../dto/auth-response.dto";
import { CompaniesService } from "../../companies/companies.service";
import { SystemUserRole } from "@prisma/client";

export interface TokenPayload {
  sub: number;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string;
  companyId: number;
  companySlug?: string; // Add company slug for Casbin consistency
  roles: string[];
  permissions: string[];
  deviceId: string;
  iat?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigurationService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly deviceService: DeviceService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly companiesService: CompaniesService,
    private readonly prismaService: PrismaService
  ) {}

  async register(
    registerDto: RegisterDto,
    request: any
  ): Promise<AuthResponseDto> {
    // Find company by slug
    const company = await this.companiesService.findBySlug(
      registerDto.companySlug
    );

    // Validate invitation code if provided
    if (registerDto.invitationCode) {
      await this.validateInvitationCode(company.id, registerDto.invitationCode);
    }

    // Validate password strength
    const personalInfo: PersonalInfo = {
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      phoneNumber: registerDto.phoneNumber,
    };

    PasswordUtil.validatePassword(
      registerDto.password,
      undefined,
      personalInfo
    );

    // Create user DTO from register DTO
    const createUserDto: CreateUserDto = {
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      password: registerDto.password,
      phoneNumber: registerDto.phoneNumber,
      role: registerDto.role || SystemUserRole.USER, // Default to USER role
    };

    const user = await this.usersService.create(createUserDto, company.id);

    const deviceInfo = this.deviceService.extractDeviceInfo(request);
    const device = await this.deviceService.createOrUpdateDevice(
      user.id,
      company.id,
      deviceInfo
    );

    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      user.id,
      device.id, // Use device.id instead of device.deviceId for foreign key
      company.id
    );

    const accessToken = await this.generateAccessToken(
      user as any,
      device.deviceId
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(loginDto: LoginDto, request: any): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const deviceInfo = this.deviceService.extractDeviceInfo(request);
    const device = await this.deviceService.createOrUpdateDevice(
      user.id,
      user.companyId,
      deviceInfo
    );

    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      user.id,
      device.id, // Use device.id instead of device.deviceId for foreign key
      user.companyId
    );

    const accessToken = await this.generateAccessToken(user, device.deviceId);
    await this.usersService.updateLastLogin(user.id);

    return {
      user: SanitizerUtil.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const tokens =
      await this.refreshTokenService.refreshAccessToken(refreshToken);

    if (!tokens) {
      throw new RefreshTokenNotFoundException();
    }

    // Get user from validated refresh token
    const tokenData =
      await this.refreshTokenService.validateRefreshToken(refreshToken);
    if (!tokenData) {
      throw new RefreshTokenNotFoundException();
    }

    const user = await this.usersService.findOne(tokenData.userId);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(
    userId: number,
    request?: any,
    currentToken?: string
  ): Promise<void> {
    if (currentToken) {
      // Blacklist current access token
      await this.tokenBlacklistService.blacklistToken(currentToken);
    }

    if (request) {
      const deviceInfo = this.deviceService.extractDeviceInfo(request);
      const device = await this.deviceService.getDeviceById(
        this.deviceService.generateDeviceId(deviceInfo.userAgent, deviceInfo.ip)
      );

      if (device) {
        await this.refreshTokenService.revokeDeviceTokens(
          userId,
          device.deviceId
        );
        // Blacklist device tokens
        await this.tokenBlacklistService.blacklistDeviceTokens(
          userId,
          device.deviceId
        );
      }
    } else {
      // Revoke all tokens if no device info
      await this.refreshTokenService.revokeAllUserTokens(userId);
      await this.tokenBlacklistService.blacklistUserTokens(userId);
    }
  }

  async logoutAll(userId: number): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
    await this.deviceService.deactivateAllUserDevices(userId);
    // Blacklist all user tokens
    await this.tokenBlacklistService.blacklistUserTokens(userId);
  }

  async logoutOtherDevices(
    userId: number,
    currentDeviceId: string
  ): Promise<void> {
    // Get all user devices except current one
    const allDevices = await this.deviceService.getUserDevices(userId);
    const otherDevices = allDevices.filter(
      (device) => device.deviceId !== currentDeviceId
    );

    // Revoke tokens for other devices
    for (const device of otherDevices) {
      await this.refreshTokenService.revokeDeviceTokens(
        userId,
        device.deviceId
      );
      await this.deviceService.deactivateDevice(userId, device.deviceId);
      // Blacklist device tokens
      await this.tokenBlacklistService.blacklistDeviceTokens(
        userId,
        device.deviceId
      );
    }
  }

  async revokeDeviceAccess(userId: number, deviceId: string): Promise<void> {
    await this.refreshTokenService.revokeDeviceTokens(userId, deviceId);
    await this.deviceService.deactivateDevice(userId, deviceId);
    // Blacklist device tokens
    await this.tokenBlacklistService.blacklistDeviceTokens(userId, deviceId);
  }

  async getUserActiveSessions(userId: number): Promise<any[]> {
    return this.refreshTokenService.getUserActiveSessions(userId);
  }

  /**
   * Invalidate user permissions by blacklisting all tokens
   * Call this when user roles/permissions change
   */
  async invalidateUserPermissions(userId: number): Promise<void> {
    this.logger.log(`Invalidating permissions for user ${userId}`);
    await this.tokenBlacklistService.blacklistUserTokens(userId);
  }

  /**
   * Invalidate permissions for multiple users
   * Call this when company roles/permissions change
   */
  async invalidateUsersPermissions(userIds: number[]): Promise<void> {
    this.logger.log(`Invalidating permissions for ${userIds.length} users`);
    await Promise.all(
      userIds.map((userId) =>
        this.tokenBlacklistService.blacklistUserTokens(userId)
      )
    );
  }

  private async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsException(email);
    }

    if (user.status !== "ACTIVE") {
      throw new AccountNotVerifiedException(user.email);
    }

    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException(email);
    }

    return user;
  }

  async validateUserById(id: number): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    return user;
  }

  private async generateAccessToken(
    user: any,
    deviceId?: string
  ): Promise<string> {
    // Ensure we have fresh user data with permissions
    const userWithPermissions =
      await this.usersService.findByEmailWithPermissions(user.email);

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      systemRole: user.systemRole,
      companyId: user.companyId,
      companySlug: userWithPermissions?.company?.slug || null, // Add company slug for Casbin
      roles: userWithPermissions?.roles?.map((ur: any) => ur.role.name) || [],
      permissions: this.extractPermissions(userWithPermissions?.roles || []),
      deviceId: deviceId || "unknown",
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.jwtSecret,
      expiresIn: this.configService.jwtExpiresIn,
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

  /**
   * Validate invitation code for company registration
   */
  private async validateInvitationCode(
    companyId: number,
    invitationCode: string
  ): Promise<void> {
    this.logger.debug(
      `Validating invitation code for company ${companyId}: ${invitationCode}`
    );

    // Find invitation by code
    const invitation = await this.prismaService.companyInvitation.findUnique({
      where: { code: invitationCode },
      include: { company: true },
    });

    // Check if invitation exists
    if (!invitation) {
      throw new InvalidCompanyInvitationException(invitationCode);
    }

    // Check if invitation belongs to the right company
    if (invitation.companyId !== companyId) {
      throw new InvalidCompanyInvitationException(invitationCode);
    }

    // Check if invitation is still pending
    if (invitation.status !== "PENDING") {
      throw new InvalidCompanyInvitationException(invitationCode);
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await this.prismaService.companyInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      throw new InvalidCompanyInvitationException(invitationCode);
    }

    // Mark invitation as accepted
    await this.prismaService.companyInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    this.logger.log(`Invitation code ${invitationCode} validated successfully`);
  }
}
