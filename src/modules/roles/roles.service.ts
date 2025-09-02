import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";
import { AuthService } from "../auth/services/auth.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RoleResponseDto } from "./dto/role-response.dto";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
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

    // Invalidate tokens for all users who had this role
    if (userIds.length > 0) {
      await this.authService.invalidateUsersPermissions(userIds);
      this.logger.log(
        `Role ${roleId} deleted, invalidated tokens for ${userIds.length} users`
      );
    } else {
      this.logger.log(`Role ${roleId} deleted, no users affected`);
    }
  }

  // ================================
  // PERMISSION CRUD OPERATIONS
  // ================================

  /**
   * Get all permissions for a company with pagination
   */
  async findAllPermissions(
    companyId: number,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where: { companyId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.permission.count({
        where: { companyId },
      }),
    ]);

    return {
      data: permissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single permission by ID
   */
  async findOnePermission(permissionId: number, companyId: number) {
    const permission = await this.prisma.permission.findFirst({
      where: { id: permissionId, companyId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found in company ${companyId}`
      );
    }

    return permission;
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
   * Delete a permission
   */
  async deletePermission(
    permissionId: number,
    companyId: number
  ): Promise<void> {
    this.logger.log(
      `Deleting permission ${permissionId} from company ${companyId}`
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

    // Get all affected users
    const affectedUserIds = new Set<number>();
    permission.roles.forEach((rp) => {
      rp.role.users.forEach((ur) => affectedUserIds.add(ur.userId));
    });

    // Delete permission and all its role associations
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
  }

  /**
   * Remove role from user and invalidate their tokens
   */
  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    this.logger.log(`Removing role ${roleId} from user ${userId}`);

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
  }
}
