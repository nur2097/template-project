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
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { RequireAuth } from "../../common/decorators/require-auth.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CacheKey, CacheTTL } from "../../common/decorators/cache.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequireAuth("users.read")
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
  async findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser("companyId") companyId: number
  ) {
    return this.usersService.findAll(page, limit, companyId);
  }

  @Get("stats")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("users:stats:{companyId}")
  @CacheTTL(300) // 5 minutes
  @RequireAuth("users.read")
  @ApiOperation({ summary: "Get user statistics" })
  @ApiResponse({ status: 200, description: "User statistics retrieved" })
  async getStats(@CurrentUser("companyId") companyId: number) {
    return this.usersService.getUserStats(companyId);
  }

  @Get(":id")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("user:{params.id}:{companyId}")
  @CacheTTL(600) // 10 minutes
  @RequireAuth("users.read")
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
  @RequireAuth("users.write")
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
  @RequireAuth("users.write")
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
  @RequireAuth("users.delete")
  @ApiOperation({ summary: "Delete user (soft delete)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number
  ): Promise<{ message: string }> {
    await this.usersService.remove(id, companyId);
    return { message: "User deleted successfully" };
  }
}
