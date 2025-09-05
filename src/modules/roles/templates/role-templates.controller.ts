import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
  ParseEnumPipe,
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { RoleTemplatesService } from "./role-templates.service";
import { RolesService } from "../roles.service";
import { RequireAuth } from "../../../common/decorators/require-auth.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { CacheKey, CacheTTL } from "../../../common/decorators/cache.decorator";
import {
  ApplyRoleTemplateDto,
  RoleTemplateResponseDto,
  PermissionCategoryDto,
} from "../dto/role-template.dto";

@ApiTags("Role Templates")
@Controller("role-templates")
@ApiBearerAuth()
export class RoleTemplatesController {
  constructor(
    private readonly roleTemplatesService: RoleTemplatesService,
    private readonly rolesService: RolesService
  ) {}

  @Get()
  @RequireAuth("ADMIN") // Only admins can view templates
  @UseInterceptors(CacheInterceptor)
  @CacheKey("role-templates:all")
  @CacheTTL(3600) // 1 hour
  @ApiOperation({ summary: "Get all available role templates" })
  @ApiResponse({
    status: 200,
    description: "Role templates retrieved successfully",
    type: [RoleTemplateResponseDto],
  })
  @ApiQuery({
    name: "category",
    required: false,
    type: String,
    description: "Filter by template category",
  })
  async getTemplates(@Query("category") category?: string) {
    let templates = this.roleTemplatesService.getAvailableTemplates();

    if (category) {
      templates = this.roleTemplatesService.getTemplatesByCategory(category);
    }

    return templates.map((template) => ({
      name: template.name,
      description: template.description,
      systemRole: template.systemRole,
      category: template.category,
      isDefault: template.isDefault || false,
      permissionCount: template.permissions.length,
      permissionCategories: [
        ...new Set(template.permissions.map((p) => p.category)),
      ],
      permissions: template.permissions,
    }));
  }

  @Get("categories")
  @RequireAuth("ADMIN")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("role-templates:categories")
  @CacheTTL(3600) // 1 hour
  @ApiOperation({ summary: "Get template categories" })
  @ApiResponse({
    status: 200,
    description: "Template categories retrieved successfully",
    schema: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  })
  async getCategories() {
    const templates = this.roleTemplatesService.getAvailableTemplates();
    const categories = [...new Set(templates.map((t) => t.category))];

    return { categories };
  }

  @Get("permissions/categories")
  @RequireAuth("ADMIN")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("role-templates:permission-categories")
  @CacheTTL(3600) // 1 hour
  @ApiOperation({ summary: "Get permission categories from templates" })
  @ApiResponse({
    status: 200,
    description: "Permission categories retrieved successfully",
    type: [PermissionCategoryDto],
  })
  async getPermissionCategories() {
    const categories = this.roleTemplatesService.getPermissionCategories();

    return Object.entries(categories).map(([category, permissions]) => ({
      category,
      count: permissions.length,
      permissions,
    }));
  }

  @Get("recommended")
  @RequireAuth("ADMIN")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("role-templates:recommended:{query.companySize}:{query.industry}")
  @CacheTTL(1800) // 30 minutes
  @ApiOperation({
    summary: "Get recommended templates based on company profile",
  })
  @ApiResponse({
    status: 200,
    description: "Recommended templates retrieved successfully",
    schema: {
      type: "object",
      properties: {
        recommended: {
          type: "array",
          items: { type: "string" },
        },
        templates: {
          type: "array",
          items: { $ref: "#/components/schemas/RoleTemplateResponseDto" },
        },
      },
    },
  })
  @ApiQuery({
    name: "companySize",
    required: true,
    enum: ["small", "medium", "large"],
    description: "Company size",
  })
  @ApiQuery({
    name: "industry",
    required: false,
    type: String,
    description: "Industry type",
  })
  async getRecommended(
    @Query("companySize", new ParseEnumPipe(["small", "medium", "large"]))
    companySize: "small" | "medium" | "large"
  ) {
    const recommended =
      this.roleTemplatesService.getRecommendedTemplates(companySize);

    const templates = recommended
      .map((name) => this.roleTemplatesService.getTemplateByName(name))
      .filter((template) => template !== undefined)
      .map((template) => ({
        name: template.name,
        description: template.description,
        systemRole: template.systemRole,
        category: template.category,
        isDefault: template.isDefault || false,
        permissionCount: template.permissions.length,
        permissionCategories: [
          ...new Set(template.permissions.map((p) => p.category)),
        ],
        permissions: template.permissions,
      }));

    return {
      recommended,
      templates,
    };
  }

  @Post("apply")
  @RequireAuth("roles.write")
  @ApiOperation({ summary: "Apply role template to create a new role" })
  @ApiResponse({
    status: 201,
    description: "Role created from template successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        role: { $ref: "#/components/schemas/RoleResponseDto" },
        appliedTemplate: { type: "string" },
        permissionsCreated: { type: "number" },
        permissionsAssigned: { type: "number" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid template or customization",
  })
  @ApiResponse({
    status: 409,
    description: "Role with this name already exists",
  })
  async applyTemplate(
    @Body() applyDto: ApplyRoleTemplateDto,
    @CurrentUser("companyId") companyId: number
  ) {
    // Get the customized role configuration
    const roleConfig = await this.roleTemplatesService.applyRoleTemplate(
      applyDto.templateName,
      {
        name: applyDto.customName,
        description: applyDto.customDescription,
        additionalPermissions: applyDto.additionalPermissions,
        excludePermissions: applyDto.excludePermissions,
      }
    );

    // Create the role
    const role = await this.rolesService.createRole(
      {
        name: roleConfig.name,
        description: roleConfig.description,
      },
      companyId
    );

    // Track permissions created vs existing
    let permissionsCreated = 0;
    let permissionsAssigned = 0;

    // Create and assign permissions
    for (const permissionTemplate of roleConfig.permissions) {
      try {
        // Try to create the permission (will fail if exists)
        await this.rolesService.createPermission(
          {
            name: permissionTemplate.name,
            description: permissionTemplate.description,
            resource: permissionTemplate.resource,
            action: permissionTemplate.action,
          },
          companyId
        );
        permissionsCreated++;
      } catch (error) {
        // Permission already exists, that's ok
      }

      // Find the permission and assign it to the role
      const permissions = await this.rolesService.findAllPermissions(
        companyId,
        1,
        1000
      );
      const permission = permissions.data.find(
        (p) => p.name === permissionTemplate.name
      );

      if (permission) {
        try {
          await this.rolesService.addPermissionToRole(
            role.id,
            permission.id,
            companyId
          );
          permissionsAssigned++;
        } catch (error) {
          // Permission already assigned, that's ok
        }
      }
    }

    return {
      message: "Role created from template successfully",
      role,
      appliedTemplate: applyDto.templateName,
      permissionsCreated,
      permissionsAssigned,
    };
  }

  @Post("bulk-apply")
  @RequireAuth("roles.write")
  @ApiOperation({ summary: "Apply multiple role templates at once" })
  @ApiResponse({
    status: 201,
    description: "Templates applied successfully",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "array",
          items: {
            type: "object",
            properties: {
              template: { type: "string" },
              roleId: { type: "number" },
              roleName: { type: "string" },
            },
          },
        },
        failed: {
          type: "array",
          items: {
            type: "object",
            properties: {
              template: { type: "string" },
              reason: { type: "string" },
            },
          },
        },
        totalPermissionsCreated: { type: "number" },
      },
    },
  })
  async bulkApplyTemplates(
    @Body() bulkDto: { templates: string[] },
    @CurrentUser("companyId") companyId: number
  ) {
    const success: Array<{
      template: string;
      roleId: number;
      roleName: string;
    }> = [];
    const failed: Array<{ template: string; reason: string }> = [];
    let totalPermissionsCreated = 0;

    for (const templateName of bulkDto.templates) {
      try {
        const result = await this.applyTemplate({ templateName }, companyId);

        success.push({
          template: templateName,
          roleId: result.role.id,
          roleName: result.role.name,
        });

        totalPermissionsCreated += result.permissionsCreated;
      } catch (error) {
        failed.push({
          template: templateName,
          reason: error.message || "Unknown error occurred",
        });
      }
    }

    return {
      success,
      failed,
      totalPermissionsCreated,
    };
  }
}
