import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { User, UserStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../shared/database/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";

export interface IUsersService {
  create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
  findAll(
    page?: number,
    limit?: number,
  ): Promise<{
    data: UserResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  findOne(id: number): Promise<UserResponseDto>;
  findByEmail(email: string): Promise<User | null>;
  update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto>;
  remove(id: number): Promise<void>;
  updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
  verifyEmail(userId: number): Promise<void>;
  changePassword(userId: number, newPassword: string): Promise<void>;
  getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }>;
}

@Injectable()
export class UsersService implements IUsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    // Convert to response DTO (exclude sensitive fields)
    const { password, refreshToken, ...userResponse } = user;
    return userResponse as UserResponseDto;
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{
    data: UserResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { 
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          avatar: true,
          phoneNumber: true,
          emailVerified: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({
        where: { 
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: users as UserResponseDto[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { 
        id, 
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        phoneNumber: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user as UserResponseDto;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { 
        email, 
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { 
        id, 
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException("User with this email already exists");
      }
    }

    const updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        phoneNumber: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser as UserResponseDto;
  }

  async remove(id: number): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { 
        id, 
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedRefreshToken = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : null;
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
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
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }> {
    const [total, active, inactive, suspended] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ 
        where: { 
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
      }),
      this.prisma.user.count({ 
        where: { 
          status: UserStatus.INACTIVE,
          deletedAt: null,
        },
      }),
      this.prisma.user.count({ 
        where: { 
          status: UserStatus.SUSPENDED,
          deletedAt: null,
        },
      }),
    ]);

    return { total, active, inactive, suspended };
  }
}
