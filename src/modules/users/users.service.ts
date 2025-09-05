import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
// Use enum values directly instead of imports to avoid Prisma client issues
enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

import { PasswordUtil } from "../../common/utils/password.util";
import { PersonalInfo } from "../../common/utils/password-policy.util";
import { PrismaService } from "../../shared/database/prisma.service";
import { CacheService } from "../../shared/cache/cache.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";

export interface IUsersService {
  create(
    createUserDto: CreateUserDto,
    companyId: number
  ): Promise<UserResponseDto>;
  findAll(
    page?: number,
    limit?: number,
    companyId?: number
  ): Promise<{
    data: UserResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  findOne(id: number, companyId?: number): Promise<UserResponseDto>;
  findByEmail(email: string): Promise<any | null>;
  findByEmailWithPermissions(email: string): Promise<any | null>;
  update(
    id: number,
    updateUserDto: UpdateUserDto,
    companyId?: number
  ): Promise<UserResponseDto>;
  remove(id: number, companyId?: number): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
  verifyEmail(userId: number): Promise<void>;
  changePassword(userId: number, newPassword: string): Promise<void>;
  getUserStats(companyId?: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }>;
}

@Injectable()
export class UsersService implements IUsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  private transformToUserResponse(user: any): UserResponseDto {
    // Remove sensitive and relational fields
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      password: _password,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      passwordChangedAt: _passwordChangedAt,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      refreshTokens: _refreshTokens,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      roles: _roles,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      apiKeys: _apiKeys,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sessions: _sessions,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      devices: _devices,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      passwordResets: _passwordResets,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      company: _company,
      ...rest
    } = user;
    return {
      ...rest,
      fullName: `${user.firstName} ${user.lastName}`,
      systemRole: user.systemRole,
    } as UserResponseDto;
  }

  async create(
    createUserDto: CreateUserDto,
    companyId: number
  ): Promise<UserResponseDto> {
    this.logger.debug(`Creating user with email: ${createUserDto.email}`);

    // Validate password strength
    const personalInfo: PersonalInfo = {
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      phoneNumber: createUserDto.phoneNumber,
    };

    PasswordUtil.validatePassword(
      createUserDto.password,
      undefined,
      personalInfo
    );

    const hashedPassword = await PasswordUtil.hash(createUserDto.password);

    try {
      const { role, ...userData } = createUserDto;
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          systemRole: role,
          password: hashedPassword,
          companyId,
        },
      });

      // Invalidate company cache after creating user
      await this.cacheService.invalidateCompanyCache(companyId);

      return this.transformToUserResponse(user);
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === "P2002" && error.meta?.target?.includes("email")) {
        this.logger.warn(
          `Attempt to create duplicate user: ${createUserDto.email}`
        );
        throw new ConflictException("User with this email already exists");
      }

      // Re-throw other errors
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    companyId?: number,
    filters?: {
      search?: string;
      status?: string;
      systemRole?: string;
      emailVerified?: boolean;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{
    data: UserResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const where: any = companyId
      ? { companyId, deletedAt: null }
      : { deletedAt: null };

    // Apply filters
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.systemRole) {
      where.systemRole = filters.systemRole;
    }

    if (filters?.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
    }

    // Apply sorting
    let orderBy: any = { createdAt: "desc" };
    if (filters?.sortBy) {
      const sortOrder = filters.sortOrder || "asc";
      switch (filters.sortBy) {
        case "name":
          orderBy = { firstName: sortOrder };
          break;
        case "email":
          orderBy = { email: sortOrder };
          break;
        case "lastLogin":
          orderBy = { lastLoginAt: sortOrder };
          break;
        case "created":
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: "desc" };
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          systemRole: true,
          status: true,
          avatar: true,
          phoneNumber: true,
          emailVerified: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          companyId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((user: any) => this.transformToUserResponse(user)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: number, companyId?: number): Promise<UserResponseDto> {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const user = await this.prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        systemRole: true,
        status: true,
        avatar: true,
        phoneNumber: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.transformToUserResponse(user);
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
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
    });
  }

  async findByEmailWithPermissions(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
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
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    companyId?: number
  ): Promise<UserResponseDto> {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const existingUser = await this.prisma.user.findUnique({ where });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException("Email already exists");
      }
    }

    const updateData = { ...updateUserDto };
    if (updateUserDto.password) {
      // Validate password strength if being updated
      const personalInfo: PersonalInfo = {
        firstName: updateUserDto.firstName || existingUser.firstName,
        lastName: updateUserDto.lastName || existingUser.lastName,
        email: updateUserDto.email || existingUser.email,
        phoneNumber: updateUserDto.phoneNumber || existingUser.phoneNumber,
      };

      PasswordUtil.validatePassword(
        updateUserDto.password,
        undefined,
        personalInfo
      );
      updateData.password = await PasswordUtil.hash(updateUserDto.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        systemRole: true,
        status: true,
        avatar: true,
        phoneNumber: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    // Invalidate user and company cache
    await this.cacheService.invalidateUserCache(id);
    if (companyId) {
      await this.cacheService.invalidateCompanyCache(companyId);
    }

    return this.transformToUserResponse(updatedUser);
  }

  async remove(id: number, companyId?: number): Promise<void> {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const user = await this.prisma.user.findUnique({ where });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async verifyEmail(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  }

  async changePassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await PasswordUtil.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });
  }

  async getUserStats(companyId?: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }> {
    const where = companyId ? { companyId } : {};

    const [total, active, inactive, suspended] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({
        where: { ...where, status: UserStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { ...where, status: UserStatus.INACTIVE },
      }),
      this.prisma.user.count({
        where: { ...where, status: UserStatus.SUSPENDED },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
    };
  }
}
