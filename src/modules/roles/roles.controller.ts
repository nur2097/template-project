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
  ParseBoolPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { RequireAuth } from "../../common/decorators/require-auth.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseUtil } from "../../common/utils/response.util";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RoleResponseDto } from "./dto/role-response.dto";
import {
  AssignRoleDto,
  AssignPermissionToRoleDto,
} from "./dto/assign-role.dto";

@ApiTags("Roles")
@Controller("roles")
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions("roles.read")
  @ApiOperation({ summary: "Get all roles with pagination" })
  @ApiResponse({
    status: 200,
    description: "Roles retrieved successfully",
    type: [RoleResponseDto],
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
    name: "includePermissions",
    required: false,
    type: Boolean,
    description: "Include role permissions",
  })
  async findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("includePermissions", new DefaultValuePipe(false), ParseBoolPipe)
    includePermissions: boolean,
    @CurrentUser("companyId") companyId: number
  ) {
    return this.rolesService.findAllRoles(
      companyId,
      page,
      limit,
      includePermissions
    );
  }

  @Get(":id")
  @Permissions("roles.read")
  @ApiOperation({ summary: "Get role by ID" })
  @ApiResponse({
    status: 200,
    description: "Role found",
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  @ApiQuery({
    name: "includePermissions",
    required: false,
    type: Boolean,
    description: "Include role permissions",
  })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @Query("includePermissions", new DefaultValuePipe(false), ParseBoolPipe)
    includePermissions: boolean,
    @CurrentUser("companyId") companyId: number
  ): Promise<RoleResponseDto> {
    return this.rolesService.findOneRole(id, companyId, includePermissions);
  }

  @Post()
  @Permissions("roles.write")
  @ApiOperation({ summary: "Create new role" })
  @ApiResponse({
    status: 201,
    description: "Role created successfully",
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 409, description: "Role already exists" })
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser("companyId") companyId: number
  ): Promise<RoleResponseDto> {
    return this.rolesService.createRole(createRoleDto, companyId);
  }

  @Put(":id")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Update role" })
  @ApiResponse({
    status: 200,
    description: "Role updated successfully",
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  @ApiResponse({ status: 409, description: "Role name already exists" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser("companyId") companyId: number
  ): Promise<RoleResponseDto> {
    return this.rolesService.updateRole(id, updateRoleDto, companyId);
  }

  @Delete(":id")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Delete role" })
  @ApiResponse({ status: 200, description: "Role deleted successfully" })
  @ApiResponse({ status: 404, description: "Role not found" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("companyId") companyId: number
  ) {
    await this.rolesService.deleteRole(id, companyId);
    return ResponseUtil.success(null, "Role deleted successfully");
  }

  // Role assignment endpoints
  @Post("assign")
  @RequireAuth("ADMIN") // System admin can assign company roles
  @ApiOperation({ summary: "Assign role to user" })
  @ApiResponse({ status: 200, description: "Role assigned successfully" })
  @ApiResponse({ status: 404, description: "Role or user not found" })
  async assignRole(
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser("companyId") companyId: number
  ) {
    await this.rolesService.assignRoleToUser(
      assignRoleDto.userId,
      assignRoleDto.roleId,
      companyId
    );
    return ResponseUtil.success(null, "Role assigned successfully");
  }

  @Delete("assign")
  @RequireAuth("ADMIN")
  @ApiOperation({ summary: "Remove role from user" })
  @ApiResponse({ status: 200, description: "Role removed successfully" })
  async removeRole(@Body() assignRoleDto: AssignRoleDto) {
    await this.rolesService.removeRoleFromUser(
      assignRoleDto.userId,
      assignRoleDto.roleId
    );
    return ResponseUtil.success(null, "Role removed successfully");
  }

  // Permission assignment endpoints
  @Post(":id/permissions")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Add permission to role" })
  @ApiResponse({ status: 200, description: "Permission added successfully" })
  @ApiResponse({ status: 404, description: "Role or permission not found" })
  async addPermissionToRole(
    @Param("id", ParseIntPipe) roleId: number,
    @Body() assignPermissionDto: AssignPermissionToRoleDto,
    @CurrentUser("companyId") companyId: number
  ) {
    await this.rolesService.addPermissionToRole(
      roleId,
      assignPermissionDto.permissionId,
      companyId
    );
    return ResponseUtil.success(null, "Permission added to role successfully");
  }

  @Delete(":id/permissions/:permissionId")
  @Permissions("roles.write")
  @ApiOperation({ summary: "Remove permission from role" })
  @ApiResponse({ status: 200, description: "Permission removed successfully" })
  async removePermissionFromRole(
    @Param("id", ParseIntPipe) roleId: number,
    @Param("permissionId", ParseIntPipe) permissionId: number,
    @CurrentUser("companyId") companyId: number
  ) {
    await this.rolesService.removePermissionFromRole(
      roleId,
      permissionId,
      companyId
    );
    return ResponseUtil.success(
      null,
      "Permission removed from role successfully"
    );
  }
}
