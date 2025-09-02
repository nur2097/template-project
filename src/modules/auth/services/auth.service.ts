import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PasswordUtil } from "../../../common/utils/password.util";
import { UsersService } from "../../users/users.service";
import { RefreshTokenService } from "./refresh-token.service";
import { DeviceService } from "./device.service";
import { TokenBlacklistService } from "./token-blacklist.service";
import { SanitizerUtil } from "../../../common/utils/sanitizer.util";
import { CreateUserDto } from "../../users/dto/create-user.dto";
import { UserResponseDto } from "../../users/dto/user-response.dto";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { AuthResponseDto } from "../dto/auth-response.dto";
import { CompaniesService } from "../../companies/companies.service";
import { SystemUserRole } from "@prisma/client";
import { Request } from "express";

export interface TokenPayload {
  sub: number;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string;
  companyId: number;
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
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly deviceService: DeviceService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly companiesService: CompaniesService
  ) {}

  async register(
    registerDto: RegisterDto,
    request: Request
  ): Promise<AuthResponseDto> {
    // Find company by slug
    const company = await this.companiesService.findBySlug(
      registerDto.companySlug
    );

    // Validate invitation code if provided
    if (registerDto.invitationCode) {
      await this.validateInvitationCode(company.id, registerDto.invitationCode);
    }

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

  async login(loginDto: LoginDto, request: Request): Promise<AuthResponseDto> {
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

  async refreshTokens(
    userId: number,
    refreshToken: string
  ): Promise<AuthResponseDto> {
    const tokens =
      await this.refreshTokenService.refreshAccessToken(refreshToken);

    if (!tokens) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.usersService.findOne(userId);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(
    userId: number,
    request?: Request,
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
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active");
    }

    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
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
      roles: userWithPermissions?.roles?.map((ur: any) => ur.role.name) || [],
      permissions: this.extractPermissions(userWithPermissions?.roles || []),
      deviceId: deviceId || "unknown",
    };

    return this.jwtService.signAsync(payload, {
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

  /**
   * Validate invitation code for company registration
   * TODO: Implement proper invitation system with database table
   */
  private async validateInvitationCode(
    companyId: number,
    invitationCode: string
  ): Promise<void> {
    this.logger.debug(
      `Validating invitation code for company ${companyId}: ${invitationCode}`
    );

    // For now, accept any invitation code in development
    // In production, this should validate against a real invitation system
    if (process.env.NODE_ENV === "development") {
      this.logger.debug("Development mode: accepting any invitation code");
      return;
    }

    // TODO: Implement real invitation validation
    // Example logic:
    // const invitation = await this.prisma.invitation.findFirst({
    //   where: {
    //     code: invitationCode,
    //     companyId: companyId,
    //     expiresAt: { gt: new Date() },
    //     used: false,
    //   },
    // });
    //
    // if (!invitation) {
    //   throw new UnauthorizedException('Invalid or expired invitation code');
    // }
    //
    // // Mark invitation as used
    // await this.prisma.invitation.update({
    //   where: { id: invitation.id },
    //   data: { used: true, usedAt: new Date() },
    // });

    throw new UnauthorizedException(
      "Invitation code validation not implemented yet"
    );
  }
}
