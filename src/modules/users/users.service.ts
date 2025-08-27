import { Injectable, Inject, NotFoundException, ConflictException } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User, UserStatus } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { plainToClass } from "class-transformer";

export interface IUsersService {
  create(createUserDto: CreateUserDto): Promise<UserResponseDto>;
  findAll(page?: number, limit?: number): Promise<{
    data: UserResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  findOne(id: number): Promise<UserResponseDto>;
  findByEmail(email: string): Promise<User | null>;
  update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto>;
  remove(id: number): Promise<void>;
  updateRefreshToken(userId: number, refreshToken: string | null): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
  verifyEmail(userId: number): Promise<void>;
  changePassword(userId: number, newPassword: string): Promise<void>;
  getUserStats(): Promise<{ total: number; active: number; inactive: number; suspended: number }>;
}

@Injectable()
export class UsersService implements IUsersService {
  private userRepository: Repository<User>;

  constructor(@Inject("POSTGRES_DATA_SOURCE") private dataSource: DataSource) {
    this.userRepository = this.dataSource.getRepository(User);
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    return plainToClass(UserResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async findAll(page = 1, limit = 10): Promise<{
    data: UserResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      where: { status: UserStatus.ACTIVE },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });

    const data = users.map(user => 
      plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, status: UserStatus.ACTIVE },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException("User with this email already exists");
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(id, updateUserDto);
    const updatedUser = await this.userRepository.findOne({ where: { id } });
    
    return plainToClass(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, status: UserStatus.ACTIVE },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.userRepository.softDelete(id);
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    const hashedRefreshToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userRepository.update(userId, { refreshToken: hashedRefreshToken });
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  async verifyEmail(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  async changePassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }> {
    const [total, active, inactive, suspended] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.INACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
    ]);

    return { total, active, inactive, suspended };
  }
}