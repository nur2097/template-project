import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SystemUserRole } from "@prisma/client";
import { PermissionTemplate } from "../templates/role-templates.service";

export class ApplyRoleTemplateDto {
  @ApiProperty({
    description: "Name of the role template to apply",
    example: "Team Manager",
  })
  @IsString()
  templateName: string;

  @ApiPropertyOptional({
    description: "Custom name for the role (overrides template name)",
    example: "Senior Team Manager",
  })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiPropertyOptional({
    description:
      "Custom description for the role (overrides template description)",
    example: "Senior team manager with additional responsibilities",
  })
  @IsOptional()
  @IsString()
  customDescription?: string;

  @ApiPropertyOptional({
    description: "Permission names to exclude from the template",
    type: [String],
    example: ["users.delete", "reports.advanced"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePermissions?: string[];

  @ApiPropertyOptional({
    description: "Additional permissions to add beyond the template",
    type: [Object],
    example: [
      {
        name: "custom.permission",
        description: "Custom permission",
        resource: "custom",
        action: "manage",
        category: "Custom",
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  additionalPermissions?: PermissionTemplate[];
}

export class RoleTemplateResponseDto {
  @ApiProperty({
    description: "Template name",
    example: "Team Manager",
  })
  name: string;

  @ApiProperty({
    description: "Template description",
    example: "Manage team members and projects",
  })
  description: string;

  @ApiPropertyOptional({
    description: "Associated system role",
    enum: SystemUserRole,
    example: SystemUserRole.MODERATOR,
  })
  systemRole?: SystemUserRole;

  @ApiProperty({
    description: "Template category",
    example: "management",
  })
  category: string;

  @ApiProperty({
    description: "Whether this is a default template",
    example: true,
  })
  isDefault: boolean;

  @ApiProperty({
    description: "Number of permissions in this template",
    example: 12,
  })
  permissionCount: number;

  @ApiProperty({
    description: "Permission categories used in this template",
    type: [String],
    example: ["User Management", "Project Management", "Task Management"],
  })
  permissionCategories: string[];

  @ApiProperty({
    description: "List of all permissions in this template",
    type: [Object],
  })
  permissions: PermissionTemplate[];
}

export class PermissionCategoryDto {
  @ApiProperty({
    description: "Category name",
    example: "User Management",
  })
  category: string;

  @ApiProperty({
    description: "Number of permissions in this category",
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: "Permissions in this category",
    type: [Object],
  })
  permissions: PermissionTemplate[];
}

export class GetRecommendedTemplatesDto {
  @ApiProperty({
    description: "Company size",
    enum: ["small", "medium", "large"],
    example: "medium",
  })
  @IsEnum(["small", "medium", "large"])
  companySize: "small" | "medium" | "large";

  @ApiPropertyOptional({
    description: "Industry type for additional recommendations",
    example: "technology",
  })
  @IsOptional()
  @IsString()
  industry?: string;
}
