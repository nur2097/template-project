import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CacheKey, CacheTTL } from "../../common/decorators/cache.decorator";
import { ResponseUtil } from "../../common/utils/response.util";
import { RolesService } from "./roles.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";

export class PermissionResponseDto {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
  companyId: number;
  createdAt: Date;
  updatedAt: Date;
  rolesCount?: number;
  usersCount?: number;
}

@ApiTags("Permissions")
@Controller("permissions")
@ApiBearerAuth("JWT-Auth")
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions("roles.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey(
    "permissions:list:{companyId}:page:{query.page}:limit:{query.limit}"
  )
  @CacheTTL(300) // 5 minutes
  @ApiOperation({
    summary: "Get all permissions with pagination and filtering",
  })
  @ApiResponse({
    status: 200,
    description: "Permissions retrieved successfully",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: { $ref: "#/components/schemas/PermissionResponseDto" },
        },
        pagination: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            totalPages: { type: "number" },
          },
        },
      },
    },
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
    description: "Search by name or description",
  })
  @ApiQuery({
    name: "resource",
    required: false,
    type: String,
    description: "Filter by resource",
  })
  @ApiQuery({
    name: "action",
    required: false,
    type: String,
    description: "Filter by action",
  })
  async findAll(
    @CurrentUser("companyId") companyId: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("search") search?: string,
    @Query("resource") resource?: string,
    @Query("action") action?: string
  ) {
    return this.rolesService.findAllPermissions(companyId, page, limit, {
      search,
      resource,
      action,
    });
  }

  @Get("resources")
  @Permissions("roles.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("permissions:resources:{companyId}")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Get all unique resources" })
  @ApiResponse({
    status: 200,
    description: "Resources retrieved successfully",
    schema: {
      type: "object",
      properties: {
        resources: { type: "array", items: { type: "string" } },
      },
    },
  })
  async getResources(@CurrentUser("companyId") companyId: number) {
    return this.rolesService.getPermissionResources(companyId);
  }

  @Get("actions")
  @Permissions("roles.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("permissions:actions:{companyId}")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Get all unique actions" })
  @ApiResponse({
    status: 200,
    description: "Actions retrieved successfully",
    schema: {
      type: "object",
      properties: {
        actions: { type: "array", items: { type: "string" } },
      },
    },
  })
  async getActions(@CurrentUser("companyId") companyId: number) {
    return this.rolesService.getPermissionActions(companyId);
  }

  @Get("categories")
  @Permissions("roles.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("permissions:categories:{companyId}")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Get permissions grouped by categories" })
  @ApiResponse({
    status: 200,
    description: "Permission categories retrieved successfully",
    schema: {
      type: "object",
      properties: {
        categories: {
          type: "object",
          additionalProperties: {
            type: "array",
            items: { $ref: "#/components/schemas/PermissionResponseDto" },
          },
        },
      },
    },
  })
  async getCategories(@CurrentUser("companyId") companyId: number) {
    return this.rolesService.getPermissionCategories(companyId);
  }

  @Get("stats")
  @Permissions("roles.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("permissions:stats:{companyId}")
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get permission statistics" })
  @ApiResponse({
    status: 200,
    description: "Permission statistics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        total: { type: "number" },
        byResource: { type: "object" },
        byAction: { type: "object" },
        mostUsed: {
          type: "array",
          items: { $ref: "#/components/schemas/PermissionResponseDto" },
        },
        leastUsed: {
          type: "array",
          items: { $ref: "#/components/schemas/PermissionResponseDto" },
        },
      },
    },
  })
  async getStats(@CurrentUser("companyId") companyId: number) {
    return this.rolesService.getPermissionStats(companyId);
  }

  @Get(":id")
  @Permissions("roles.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("permission:{params.id}:{companyId}")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Get permission by ID with usage details" })
  @ApiResponse({
    status: 200,
    description: "Permission found",
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Permission not found" })
  @ApiQuery({
    name: "includeUsage",
    required: false,
    type: Boolean,
    description: "Include roles and users that have this permission",
  })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number,
    @Query("includeUsage") includeUsage?: boolean
  ): Promise<PermissionResponseDto> {
    return this.rolesService.findOnePermission(id, companyId, includeUsage);
  }

  @Post()
  @Permissions("roles.write")
  @ApiOperation({ summary: "Create new permission" })
  @ApiResponse({
    status: 201,
    description: "Permission created successfully",
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 409, description: "Permission already exists" })
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
    @CurrentUser("companyId") companyId: number
  ): Promise<PermissionResponseDto> {
    return this.rolesService.createPermission(createPermissionDto, companyId);
  }

  @Post("bulk")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Create multiple permissions" })
  @ApiResponse({
    status: 201,
    description: "Permissions created successfully",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "array",
          items: { $ref: "#/components/schemas/PermissionResponseDto" },
        },
        failed: {
          type: "array",
          items: {
            type: "object",
            properties: {
              permission: { $ref: "#/components/schemas/CreatePermissionDto" },
              reason: { type: "string" },
            },
          },
        },
      },
    },
  })
  async createBulk(
    @Body() createPermissionsDto: { permissions: CreatePermissionDto[] },
    @CurrentUser("companyId") companyId: number
  ) {
    return this.rolesService.createBulkPermissions(
      createPermissionsDto.permissions,
      companyId
    );
  }

  @Put(":id")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Update permission" })
  @ApiResponse({
    status: 200,
    description: "Permission updated successfully",
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Permission not found" })
  @ApiResponse({ status: 409, description: "Permission name already exists" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @CurrentUser("companyId") companyId: number
  ): Promise<PermissionResponseDto> {
    return this.rolesService.updatePermission(
      id,
      updatePermissionDto,
      companyId
    );
  }

  @Delete(":id")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Delete permission" })
  @ApiResponse({ status: 200, description: "Permission deleted successfully" })
  @ApiResponse({ status: 404, description: "Permission not found" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete permission that is assigned to roles",
  })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number,
    @Query("force") force?: boolean
  ) {
    await this.rolesService.deletePermission(id, companyId, force);
    return ResponseUtil.success(null, "Permission deleted successfully");
  }

  @Put(":id/clone")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Clone permission with new name" })
  @ApiResponse({
    status: 201,
    description: "Permission cloned successfully",
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Permission not found" })
  async clone(
    @Param("id", ParseIntPipe) id: number,
    @Body() cloneDto: { name: string; description?: string },
    @CurrentUser("companyId") companyId: number
  ): Promise<PermissionResponseDto> {
    return this.rolesService.clonePermission(id, cloneDto, companyId);
  }

  @Get(":id/usage")
  @Permissions("roles.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("permission:{params.id}:usage:{companyId}")
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get permission usage details" })
  @ApiResponse({
    status: 200,
    description: "Permission usage retrieved successfully",
    schema: {
      type: "object",
      properties: {
        roles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              name: { type: "string" },
              usersCount: { type: "number" },
            },
          },
        },
        totalUsers: { type: "number" },
        isSystemPermission: { type: "boolean" },
      },
    },
  })
  async getUsage(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number
  ) {
    return this.rolesService.getPermissionUsage(id, companyId);
  }
}
