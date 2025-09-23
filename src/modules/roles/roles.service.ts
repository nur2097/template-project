import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";
import { AuthService } from "../auth/services/auth.service";
import { CasbinService } from "../../common/casbin/casbin.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RoleResponseDto } from "./dto/role-response.dto";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { getErrorMessage, toError } from "../../common/utils/error.utils";

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    @Inject(forwardRef(() => CasbinService))
    private readonly casbinService: CasbinService
  ) {}

  // ================================
  // ROLE CRUD OPERATIONS
  // ================================

  /**
   * Get all roles for a company with pagination
   */
  async findAllRoles(
    companyId: number,
    page: number = 1,
    limit: number = 10,
    includePermissions: boolean = false
  ) {
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where: { companyId },
        skip,
        take: limit,
        include: {
          permissions: includePermissions
            ? {
                include: {
                  permission: true,
                },
              }
            : false,
          _count: {
            select: { users: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.role.count({
        where: { companyId },
      }),
    ]);

    return {
      data: roles.map((role) => ({
        ...role,
        userCount: role._count.users,
        permissions: includePermissions
          ? role.permissions?.map((rp: any) => rp.permission)
          : undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single role by ID
   */
  async findOneRole(
    roleId: number,
    companyId: number,
    includePermissions: boolean = false
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
      include: {
        permissions: includePermissions
          ? {
              include: {
                permission: true,
              },
            }
          : false,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(
        `Role with ID ${roleId} not found in company ${companyId}`
      );
    }

    return {
      ...role,
      userCount: role._count.users,
      permissions: includePermissions
        ? role.permissions?.map((rp: any) => rp.permission)
        : undefined,
    };
  }

  /**
   * Create a new role
   */
  async createRole(
    createRoleDto: CreateRoleDto,
    companyId: number
  ): Promise<RoleResponseDto> {
    this.logger.log(
      `Creating role '${createRoleDto.name}' for company ${companyId}`
    );

    // Check if role name already exists in company
    const existingRole = await this.prisma.role.findFirst({
      where: { name: createRoleDto.name, companyId },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role '${createRoleDto.name}' already exists in this company`
      );
    }

    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        companyId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    this.logger.log(`Role '${createRoleDto.name}' created with ID ${role.id}`);

    // Sync Casbin policies after role creation
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(`Casbin policies synced after role creation: ${role.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies after role creation: ${getErrorMessage(error)}`
      );
    }

    return {
      ...role,
      userCount: role._count.users,
    };
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: number,
    updateRoleDto: UpdateRoleDto,
    companyId: number
  ): Promise<RoleResponseDto> {
    this.logger.log(`Updating role ${roleId} in company ${companyId}`);

    // Check if role exists
    const existingRole = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
    });

    if (!existingRole) {
      throw new NotFoundException(
        `Role with ID ${roleId} not found in company ${companyId}`
      );
    }

    // Check if new name conflicts with another role
    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      const nameConflict = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          companyId,
          id: { not: roleId },
        },
      });

      if (nameConflict) {
        throw new ConflictException(
          `Role '${updateRoleDto.name}' already exists in this company`
        );
      }
    }

    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: updateRoleDto,
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    this.logger.log(`Role ${roleId} updated successfully`);

    // Sync Casbin policies after role update
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(`Casbin policies synced after role update: ${roleId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies after role update: ${getErrorMessage(error)}`
      );
    }

    return {
      ...updatedRole,
      userCount: updatedRole._count.users,
    };
  }

  /**
   * Delete a role (soft delete by removing all assignments)
   */
  async deleteRole(roleId: number, companyId: number): Promise<void> {
    this.logger.log(`Deleting role ${roleId} from company ${companyId}`);

    // Check if role exists
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
      include: {
        users: { select: { userId: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(
        `Role with ID ${roleId} not found in company ${companyId}`
      );
    }

    // Get all users with this role for token invalidation
    const userIds = role.users.map((ur) => ur.userId);

    // Delete all role assignments and permissions
    try {
      await this.prisma.$transaction(async (tx) => {
        // Remove role permissions
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Remove user role assignments
        await tx.userRole.deleteMany({
          where: { roleId },
        });

        // Delete the role itself
        await tx.role.delete({
          where: { id: roleId },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to delete role ${roleId}:`, error);
      throw toError(error); // Re-throw to maintain API contract
    }

    // Invalidate tokens for all users who had this role
    if (userIds.length > 0) {
      await this.authService.invalidateUsersPermissions(userIds);
      this.logger.log(
        `Role ${roleId} deleted, invalidated tokens for ${userIds.length} users`
      );
    } else {
      this.logger.log(`Role ${roleId} deleted, no users affected`);
    }

    // Sync Casbin policies after role deletion
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(`Casbin policies synced after role deletion: ${roleId}`);
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies after role deletion: ${getErrorMessage(error)}`
      );
    }
  }

  // ================================
  // PERMISSION CRUD OPERATIONS
  // ================================

  /**
   * Get all permissions for a company with pagination and filtering
   */
  async findAllPermissions(
    companyId: number,
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      resource?: string;
      action?: string;
    }
  ) {
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    // Apply filters
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.resource) {
      where.resource = filters.resource;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              roles: true,
            },
          },
        },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      data: permissions.map((permission) => ({
        ...permission,
        rolesCount: permission._count.roles,
        usersCount: 0, // Will be calculated if needed
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single permission by ID with optional usage details
   */
  async findOnePermission(
    permissionId: number,
    companyId: number,
    includeUsage: boolean = false
  ) {
    const permission = await this.prisma.permission.findFirst({
      where: { id: permissionId, companyId },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
        ...(includeUsage && {
          roles: {
            include: {
              role: {
                include: {
                  _count: {
                    select: { users: true },
                  },
                },
              },
            },
          },
        }),
      },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found in company ${companyId}`
      );
    }

    let usersCount = 0;
    if (includeUsage && permission.roles) {
      usersCount = permission.roles.reduce(
        (sum, rp: any) => sum + rp.role._count.users,
        0
      );
    }

    return {
      ...permission,
      rolesCount: permission._count.roles,
      usersCount,
    };
  }

  /**
   * Create a new permission
   */
  async createPermission(
    createPermissionDto: CreatePermissionDto,
    companyId: number
  ) {
    this.logger.log(
      `Creating permission '${createPermissionDto.name}' for company ${companyId}`
    );

    // Check if permission name already exists in company
    const existingPermission = await this.prisma.permission.findFirst({
      where: { name: createPermissionDto.name, companyId },
    });

    if (existingPermission) {
      throw new ConflictException(
        `Permission '${createPermissionDto.name}' already exists in this company`
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        ...createPermissionDto,
        companyId,
      },
    });

    this.logger.log(
      `Permission '${createPermissionDto.name}' created with ID ${permission.id}`
    );

    return permission;
  }

  /**
   * Update a permission
   */
  async updatePermission(
    permissionId: number,
    updatePermissionDto: UpdatePermissionDto,
    companyId: number
  ) {
    this.logger.log(
      `Updating permission ${permissionId} in company ${companyId}`
    );

    // Check if permission exists
    const existingPermission = await this.prisma.permission.findFirst({
      where: { id: permissionId, companyId },
    });

    if (!existingPermission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found in company ${companyId}`
      );
    }

    // Check if new name conflicts with another permission
    if (
      updatePermissionDto.name &&
      updatePermissionDto.name !== existingPermission.name
    ) {
      const nameConflict = await this.prisma.permission.findFirst({
        where: {
          name: updatePermissionDto.name,
          companyId,
          id: { not: permissionId },
        },
      });

      if (nameConflict) {
        throw new ConflictException(
          `Permission '${updatePermissionDto.name}' already exists in this company`
        );
      }
    }

    const updatedPermission = await this.prisma.permission.update({
      where: { id: permissionId },
      data: updatePermissionDto,
    });

    // Get all users affected by this permission change
    const rolesWithPermission = await this.prisma.rolePermission.findMany({
      where: { permissionId },
      include: {
        role: {
          include: {
            users: { select: { userId: true } },
          },
        },
      },
    });

    const affectedUserIds = new Set<number>();
    rolesWithPermission.forEach((rp) => {
      rp.role.users.forEach((ur) => affectedUserIds.add(ur.userId));
    });

    // Invalidate tokens for affected users
    if (affectedUserIds.size > 0) {
      await this.authService.invalidateUsersPermissions(
        Array.from(affectedUserIds)
      );
      this.logger.log(
        `Permission ${permissionId} updated, invalidated tokens for ${affectedUserIds.size} users`
      );
    }

    return updatedPermission;
  }

  /**
   * Delete a permission with force option
   */
  async deletePermission(
    permissionId: number,
    companyId: number,
    force: boolean = false
  ): Promise<void> {
    this.logger.log(
      `Deleting permission ${permissionId} from company ${companyId} (force: ${force})`
    );

    // Check if permission exists and get affected users
    const permission = await this.prisma.permission.findFirst({
      where: { id: permissionId, companyId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                users: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found in company ${companyId}`
      );
    }

    // Check if permission is assigned to roles
    if (permission.roles.length > 0 && !force) {
      throw new BadRequestException(
        `Cannot delete permission that is assigned to ${permission.roles.length} role(s). Use force=true to delete anyway.`
      );
    }

    // Get all affected users
    const affectedUserIds = new Set<number>();
    permission.roles.forEach((rp) => {
      rp.role.users.forEach((ur) => affectedUserIds.add(ur.userId));
    });

    // Delete permission and all its role associations
    try {
      await this.prisma.$transaction(async (tx) => {
        // Remove role-permission associations
        await tx.rolePermission.deleteMany({
          where: { permissionId },
        });

        // Delete the permission itself
        await tx.permission.delete({
          where: { id: permissionId },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to delete permission ${permissionId}:`, error);
      throw toError(error); // Re-throw to maintain API contract
    }

    // Invalidate tokens for affected users
    if (affectedUserIds.size > 0) {
      await this.authService.invalidateUsersPermissions(
        Array.from(affectedUserIds)
      );
      this.logger.log(
        `Permission ${permissionId} deleted, invalidated tokens for ${affectedUserIds.size} users`
      );
    } else {
      this.logger.log(`Permission ${permissionId} deleted, no users affected`);
    }

    // Sync Casbin policies after permission deletion
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(
        `Casbin policies synced after permission deletion: ${permissionId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies after permission deletion: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Assign role to user and invalidate their tokens
   */
  async assignRoleToUser(
    userId: number,
    roleId: number,
    companyId: number
  ): Promise<void> {
    this.logger.log(
      `Assigning role ${roleId} to user ${userId} in company ${companyId}`
    );

    // Check if role exists in company
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
    });

    if (!role) {
      throw new NotFoundException(
        `Role ${roleId} not found in company ${companyId}`
      );
    }

    // Check if assignment already exists
    const existing = await this.prisma.userRole.findFirst({
      where: { userId, roleId },
    });

    if (existing) {
      this.logger.warn(`Role ${roleId} already assigned to user ${userId}`);
      return;
    }

    // Create assignment
    await this.prisma.userRole.create({
      data: { userId, roleId },
    });

    // Invalidate user's tokens to force re-authentication with new permissions
    await this.authService.invalidateUserPermissions(userId);

    this.logger.log(
      `Role ${roleId} assigned to user ${userId}, tokens invalidated`
    );

    // Sync Casbin policies after role assignment
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(
        `Casbin policies synced after role assignment: user ${userId} -> role ${roleId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies after role assignment: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Remove role from user and invalidate their tokens
   */
  async removeRoleFromUser(
    userId: number,
    roleId: number,
    companyId: number
  ): Promise<void> {
    this.logger.log(
      `Removing role ${roleId} from user ${userId} in company ${companyId}`
    );

    // Verify both user and role belong to the same company for security
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        user: { companyId },
        role: { companyId },
      },
    });

    if (!userRole) {
      this.logger.warn(
        `Role ${roleId} is not assigned to user ${userId} in company ${companyId}`
      );
      return;
    }

    const deleted = await this.prisma.userRole.deleteMany({
      where: { userId, roleId },
    });

    if (deleted.count === 0) {
      this.logger.warn(`Role ${roleId} was not assigned to user ${userId}`);
      return;
    }

    // Invalidate user's tokens
    await this.authService.invalidateUserPermissions(userId);

    this.logger.log(
      `Role ${roleId} removed from user ${userId}, tokens invalidated`
    );

    // Sync Casbin policies after role removal
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(
        `Casbin policies synced after role removal: user ${userId} <- role ${roleId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies after role removal: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Add permission to role and invalidate tokens for all users with that role
   */
  async addPermissionToRole(
    roleId: number,
    permissionId: number,
    companyId: number
  ): Promise<void> {
    this.logger.log(
      `Adding permission ${permissionId} to role ${roleId} in company ${companyId}`
    );

    // Check if role exists
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId },
    });

    if (!role) {
      throw new NotFoundException(
        `Role ${roleId} not found in company ${companyId}`
      );
    }

    // Check if permission exists
    const permission = await this.prisma.permission.findFirst({
      where: { id: permissionId, companyId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission ${permissionId} not found in company ${companyId}`
      );
    }

    // Check if assignment already exists
    const existing = await this.prisma.rolePermission.findFirst({
      where: { roleId, permissionId },
    });

    if (existing) {
      this.logger.warn(
        `Permission ${permissionId} already assigned to role ${roleId}`
      );
      return;
    }

    // Create assignment
    await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
    });

    // Get all users with this role
    const usersWithRole = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    const userIds = usersWithRole.map((ur) => ur.userId);

    if (userIds.length > 0) {
      // Invalidate tokens for all users with this role
      await this.authService.invalidateUsersPermissions(userIds);
      this.logger.log(
        `Permission ${permissionId} added to role ${roleId}, invalidated tokens for ${userIds.length} users`
      );
    } else {
      this.logger.log(
        `Permission ${permissionId} added to role ${roleId}, no users affected`
      );
    }

    // Sync Casbin policies after adding permission to role
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(
        `Casbin policies synced after adding permission ${permissionId} to role ${roleId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Remove permission from role and invalidate tokens for all users with that role
   */
  async removePermissionFromRole(
    roleId: number,
    permissionId: number,
    companyId: number
  ): Promise<void> {
    this.logger.log(
      `Removing permission ${permissionId} from role ${roleId} in company ${companyId}`
    );

    // Get users before deletion for token invalidation
    const usersWithRole = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    const deleted = await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });

    if (deleted.count === 0) {
      this.logger.warn(
        `Permission ${permissionId} was not assigned to role ${roleId}`
      );
      return;
    }

    const userIds = usersWithRole.map((ur) => ur.userId);

    if (userIds.length > 0) {
      // Invalidate tokens for all users with this role
      await this.authService.invalidateUsersPermissions(userIds);
      this.logger.log(
        `Permission ${permissionId} removed from role ${roleId}, invalidated tokens for ${userIds.length} users`
      );
    } else {
      this.logger.log(
        `Permission ${permissionId} removed from role ${roleId}, no users affected`
      );
    }

    // Sync Casbin policies after removing permission from role
    try {
      await this.casbinService.syncPolicies();
      this.logger.log(
        `Casbin policies synced after removing permission ${permissionId} from role ${roleId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync Casbin policies: ${getErrorMessage(error)}`
      );
    }
  }

  // ================================
  // ENHANCED PERMISSION METHODS
  // ================================

  /**
   * Get unique permission resources
   */
  async getPermissionResources(companyId: number) {
    const resources = await this.prisma.permission.findMany({
      where: { companyId },
      select: { resource: true },
      distinct: ["resource"],
      orderBy: { resource: "asc" },
    });

    return {
      resources: resources.map((p) => p.resource),
    };
  }

  /**
   * Get unique permission actions
   */
  async getPermissionActions(companyId: number) {
    const actions = await this.prisma.permission.findMany({
      where: { companyId },
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });

    return {
      actions: actions.map((p) => p.action),
    };
  }

  /**
   * Get permissions grouped by categories (resources)
   */
  async getPermissionCategories(companyId: number) {
    const permissions = await this.prisma.permission.findMany({
      where: { companyId },
      orderBy: [{ resource: "asc" }, { name: "asc" }],
    });

    const categories = permissions.reduce(
      (acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      },
      {} as Record<string, any[]>
    );

    return { categories };
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(companyId: number) {
    const [total, byResource, byAction, permissionsWithUsage] =
      await Promise.all([
        this.prisma.permission.count({ where: { companyId } }),
        this.prisma.permission.groupBy({
          by: ["resource"],
          where: { companyId },
          _count: { resource: true },
        }),
        this.prisma.permission.groupBy({
          by: ["action"],
          where: { companyId },
          _count: { action: true },
        }),
        this.prisma.permission.findMany({
          where: { companyId },
          include: {
            _count: {
              select: { roles: true },
            },
          },
          orderBy: {
            roles: {
              _count: "desc",
            },
          },
        }),
      ]);

    const byResourceMap = byResource.reduce(
      (acc, item) => {
        acc[item.resource] = item._count.resource;
        return acc;
      },
      {} as Record<string, number>
    );

    const byActionMap = byAction.reduce(
      (acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      byResource: byResourceMap,
      byAction: byActionMap,
      mostUsed: permissionsWithUsage.slice(0, 10),
      leastUsed: permissionsWithUsage.slice(-10).reverse(),
    };
  }

  /**
   * Create multiple permissions
   */
  async createBulkPermissions(
    permissions: Array<{
      name: string;
      description?: string;
      resource: string;
      action: string;
    }>,
    companyId: number
  ) {
    const success: any[] = [];
    const failed: Array<{ permission: any; reason: string }> = [];

    for (const permissionData of permissions) {
      try {
        const permission = await this.createPermission(
          permissionData,
          companyId
        );
        success.push(permission);
      } catch (error) {
        failed.push({
          permission: permissionData,
          reason: getErrorMessage(error) || "Unknown error occurred",
        });
      }
    }

    return { success, failed };
  }

  /**
   * Clone permission
   */
  async clonePermission(
    permissionId: number,
    cloneData: { name: string; description?: string },
    companyId: number
  ) {
    // Get original permission
    const originalPermission = await this.prisma.permission.findFirst({
      where: { id: permissionId, companyId },
    });

    if (!originalPermission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found in company ${companyId}`
      );
    }

    // Create cloned permission
    return this.createPermission(
      {
        name: cloneData.name,
        description:
          cloneData.description || `Clone of ${originalPermission.description}`,
        resource: originalPermission.resource,
        action: originalPermission.action,
      },
      companyId
    );
  }

  /**
   * Get permission usage details
   */
  async getPermissionUsage(permissionId: number, companyId: number) {
    const permission = await this.prisma.permission.findFirst({
      where: { id: permissionId, companyId },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: { users: true },
                },
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found in company ${companyId}`
      );
    }

    const roles = permission.roles.map((rp) => ({
      id: rp.role.id,
      name: rp.role.name,
      usersCount: rp.role._count.users,
    }));

    const totalUsers = roles.reduce((sum, role) => sum + role.usersCount, 0);

    return {
      roles,
      totalUsers,
      isSystemPermission: this.isSystemPermission(permission.name),
    };
  }

  private isSystemPermission(permissionName: string): boolean {
    const systemPermissions = [
      "users.read",
      "users.write",
      "users.delete",
      "roles.read",
      "roles.write",
      "company.read",
      "company.write",
    ];
    return systemPermissions.includes(permissionName);
  }
}
