import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import {
  CanReadUsers,
  CanCreateUsers,
  CanUpdateUsers,
  CanDeleteUsers,
} from "../../common/decorators/casbin.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CacheKey, CacheTTL } from "../../common/decorators/cache.decorator";
import { ResponseUtil } from "../../common/utils/response.util";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Throttle } from "@nestjs/throttler";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
@ApiBearerAuth("JWT-Auth")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CanReadUsers()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: "Get all users with pagination" })
  @ApiResponse({
    status: 200,
    description: "Users retrieved successfully",
    type: [UserResponseDto],
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by name or email",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter by user status (ACTIVE, INACTIVE, SUSPENDED)",
  })
  @ApiQuery({
    name: "systemRole",
    required: false,
    type: String,
    description: "Filter by system role",
  })
  @ApiQuery({
    name: "emailVerified",
    required: false,
    type: Boolean,
    description: "Filter by email verification status",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    type: String,
    description: "Sort by field (name, email, lastLogin, created)",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    type: String,
    description: "Sort order (asc, desc)",
  })
  async findAll(
    @CurrentUser("companyId") companyId: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("systemRole") systemRole?: string,
    @Query("emailVerified") emailVerified?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "asc" | "desc"
  ) {
    const filters = {
      search,
      status,
      systemRole,
      emailVerified: emailVerified ? emailVerified === "true" : undefined,
      sortBy,
      sortOrder,
    };

    return this.usersService.findAll(page, limit, companyId, filters);
  }

  @Get("stats")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("users:stats:{companyId}")
  @CacheTTL(300) // 5 minutes
  @CanReadUsers()
  @ApiOperation({ summary: "Get user statistics" })
  @ApiResponse({ status: 200, description: "User statistics retrieved" })
  async getStats(@CurrentUser("companyId") companyId: number) {
    return this.usersService.getUserStats(companyId);
  }

  @Get(":id")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("user:{params.id}:{companyId}")
  @CacheTTL(600) // 10 minutes
  @CanReadUsers()
  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({
    status: 200,
    description: "User found",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id, companyId);
  }

  @Post()
  @CanCreateUsers()
  @ApiOperation({ summary: "Create new user" })
  @ApiResponse({
    status: 201,
    description: "User created successfully",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 409, description: "User already exists" })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser("companyId") companyId: number
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto, companyId);
  }

  @Put(":id")
  @CanUpdateUsers()
  @ApiOperation({ summary: "Update user" })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser("companyId") companyId: number
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, companyId);
  }

  @Delete(":id")
  @CanDeleteUsers()
  @ApiOperation({ summary: "Delete user (soft delete)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number
  ) {
    await this.usersService.remove(id, companyId);
    return ResponseUtil.success(null, "User deleted successfully");
  }
}
