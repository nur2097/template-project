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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RolesService } from "./roles.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { PermissionResponseDto } from "./dto/role-response.dto";

@ApiTags("Permissions")
@Controller("permissions")
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions("roles.read") // Same permission as roles since permissions are part of RBAC
  @ApiOperation({ summary: "Get all permissions with pagination" })
  @ApiResponse({
    status: 200,
    description: "Permissions retrieved successfully",
    type: [PermissionResponseDto],
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
    return this.rolesService.findAllPermissions(companyId, page, limit);
  }

  @Get(":id")
  @Permissions("roles.read")
  @ApiOperation({ summary: "Get permission by ID" })
  @ApiResponse({
    status: 200,
    description: "Permission found",
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Permission not found" })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number
  ): Promise<PermissionResponseDto> {
    return this.rolesService.findOnePermission(id, companyId);
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
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number
  ): Promise<{ message: string }> {
    await this.rolesService.deletePermission(id, companyId);
    return { message: "Permission deleted successfully" };
  }
}
