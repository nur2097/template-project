import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { SystemUserRole } from "@prisma/client";
import { AuthRequirement } from "../types/auth.types";
import { REQUIRE_AUTH_KEY } from "../decorators/require-auth.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SUPER_ADMIN_ONLY_KEY } from "../decorators/super-admin-only.decorator";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { TokenBlacklistService } from "../../modules/auth/services/token-blacklist.service";
import { CasbinService } from "../casbin/casbin.service";
import {
  CASBIN_RESOURCE_KEY,
  CASBIN_ACTION_KEY,
} from "../decorators/casbin.decorator";

/**
 * Unified Authentication Guard with Casbin - TEK VE DOĞRU SİSTEM
 *
 * Tüm auth kontrollerini tek guard'da yapar:
 * - JWT authentication
 * - Public endpoint check
 * - System role hierarchy (SUPERADMIN bypass)
 * - Company isolation
 * - Casbin fine-grained permissions
 * - Backward compatibility for existing decorators
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
    private casbinService: CasbinService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. PUBLIC ENDPOINT CHECK
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 2. JWT AUTHENTICATION
    const user = await this.authenticateUser(request);
    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    // 3. SYSTEM ROLE HIERARCHY CHECK (SUPERADMIN bypass)
    const isSuperAdminOnly = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isSuperAdminOnly && user.systemRole !== SystemUserRole.SUPERADMIN) {
      throw new ForbiddenException("Super admin access required");
    }

    // 4. COMPANY ISOLATION
    this.enforceCompanyIsolation(request, user);

    // 5. CASBIN AUTHORIZATION (Primary system)
    const casbinResult = await this.checkCasbinPermissions(context, user);
    if (casbinResult !== null) {
      return casbinResult;
    }

    // 6. FALLBACK TO LEGACY AUTHORIZATION (Backward compatibility)
    await this.checkLegacyPermissions(context, user);

    return true;
  }

  private async authenticateUser(request: any): Promise<any> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    try {
      const token = authHeader.substring(7);

      // CRITICAL FIX: Check if token is blacklisted BEFORE verifying
      const isBlacklisted =
        await this.tokenBlacklistService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn(`Blacklisted token attempted to be used`);
        return null;
      }

      const payload = await this.jwtService.verifyAsync(token);

      // Add token to payload for potential future blacklisting
      payload.token = token;

      // Set user in request for controllers to use
      request.user = payload;
      return payload;
    } catch (error) {
      this.logger.debug(`JWT verification failed: ${error.message}`);
      return null;
    }
  }

  private processAuthRequirements(
    requirements: AuthRequirement[],
    user: any
  ): boolean {
    for (const requirement of requirements) {
      if (!this.checkSingleAuthRequirement(requirement, user)) {
        const errorMessage = this.buildRequirementErrorMessage(
          requirement,
          user
        );
        this.logger.warn(`Access denied for user ${user.sub}: ${errorMessage}`);
        throw new ForbiddenException(errorMessage);
      }
    }
    return true;
  }

  private buildRequirementErrorMessage(
    requirement: AuthRequirement,
    user: any
  ): string {
    if (Array.isArray(requirement)) {
      return `Missing required combination: ${requirement.join(" AND ")}`;
    }

    if (typeof requirement === "string") {
      if (["SUPERADMIN", "ADMIN", "MODERATOR", "USER"].includes(requirement)) {
        return `Requires ${requirement} role (current: ${user.systemRole})`;
      }
      if (requirement.includes(".")) {
        return `Missing permission: ${requirement}`;
      }
    }

    return `Access denied: ${JSON.stringify(requirement)}`;
  }

  private checkSingleAuthRequirement(
    requirement: AuthRequirement,
    user: any
  ): boolean {
    if (Array.isArray(requirement)) {
      // AND logic - all must pass
      return requirement.every((req) =>
        this.checkSingleAuthRequirement(req, user)
      );
    }

    if (typeof requirement === "string") {
      // System role check
      if (["SUPERADMIN", "ADMIN", "MODERATOR", "USER"].includes(requirement)) {
        return this.hasSystemRole(
          requirement as keyof typeof SystemUserRole,
          user
        );
      }

      // Permission check
      if (requirement.includes(".")) {
        return this.hasPermission(requirement, user);
      }

      // Special case
      if (requirement === "AUTHENTICATED") {
        return true; // Already authenticated
      }
    }

    return false;
  }

  private hasSystemRole(role: keyof typeof SystemUserRole, user: any): boolean {
    // SUPERADMIN has access to everything
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      return true;
    }

    return user.systemRole === SystemUserRole[role];
  }

  private hasPermission(permission: string, user: any): boolean {
    // SUPERADMIN has all permissions
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      return true;
    }

    return user.permissions?.includes(permission) || false;
  }

  private enforceCompanyIsolation(request: any, user: any): void {
    // SUPERADMIN bypasses company isolation
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      // Check if query parameter specifies target company for SUPERADMIN
      const targetCompanyId = request.query?.companyId
        ? parseInt(request.query.companyId)
        : user.companyId;

      // Set context for SUPERADMIN
      request.companyId = targetCompanyId || null;
      request.company = {
        id: targetCompanyId || null,
        isSuperAdminContext: true,
        isGlobalAccess: !targetCompanyId,
        originalCompanyId: user.companyId,
      };
      request.isSuperAdmin = true;

      this.logger.debug(
        `SUPERADMIN context: companyId=${request.companyId}, globalAccess=${!targetCompanyId}`
      );
      return;
    }

    // All other users must belong to a company
    if (!user.companyId) {
      this.logger.error(`User ${user.sub} does not belong to any company`);
      throw new ForbiddenException("User must belong to a company");
    }

    // Set company context for regular users
    request.companyId = user.companyId;
    request.company = {
      id: user.companyId,
      isSuperAdminContext: false,
    };
    request.isSuperAdmin = false;

    this.logger.debug(
      `User context: userId=${user.sub}, companyId=${user.companyId}`
    );
  }

  private checkPermissions(context: ExecutionContext, user: any): void {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return;
    }

    // SUPERADMIN has all permissions
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      this.logger.debug(
        `SUPERADMIN ${user.sub} granted access to permissions: ${requiredPermissions.join(", ")}`
      );
      return;
    }

    // Check if user has all required permissions
    const missingPermissions = requiredPermissions.filter(
      (permission) => !user.permissions?.includes(permission)
    );

    if (missingPermissions.length > 0) {
      this.logger.warn(
        `User ${user.sub} missing permissions: ${missingPermissions.join(", ")} (has: ${user.permissions?.join(", ") || "none"})`
      );
      throw new ForbiddenException(
        `Missing required permissions: ${missingPermissions.join(", ")}`
      );
    }

    this.logger.debug(
      `User ${user.sub} granted access with permissions: ${requiredPermissions.join(", ")}`
    );
  }

  private checkCompanyRoles(context: ExecutionContext, user: any): void {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return;
    }

    // SUPERADMIN bypasses company role checks
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      this.logger.debug(
        `SUPERADMIN ${user.sub} granted access bypassing role requirements: ${requiredRoles.join(", ")}`
      );
      return;
    }

    // Check if user has any of the required roles (OR logic)
    const hasRequiredRole = requiredRoles.some((role) =>
      user.roles?.includes(role)
    );

    if (!hasRequiredRole) {
      this.logger.warn(
        `User ${user.sub} missing required roles: ${requiredRoles.join(" OR ")} (has: ${user.roles?.join(", ") || "none"})`
      );
      throw new ForbiddenException(
        `Missing required roles: ${requiredRoles.join(" OR ")}`
      );
    }

    this.logger.debug(
      `User ${user.sub} granted access with roles: ${user.roles?.join(", ")}`
    );
  }

  /**
   * Primary authorization method using Casbin
   * Returns null if no Casbin decorators found (fallback to legacy)
   * Returns true/false if Casbin decorators present
   */
  private async checkCasbinPermissions(
    context: ExecutionContext,
    user: any
  ): Promise<boolean | null> {
    // Get resource and action from Casbin decorators
    const resource = this.reflector.getAllAndOverride<string>(
      CASBIN_RESOURCE_KEY,
      [context.getHandler(), context.getClass()]
    );

    const action = this.reflector.getAllAndOverride<string>(CASBIN_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No Casbin decorators found, fallback to legacy system
    if (!resource || !action) {
      return null;
    }

    // SUPERADMIN bypass for Casbin too
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      this.logger.debug(
        `SUPERADMIN ${user.sub} granted Casbin access: ${action} ${resource}`
      );
      return true;
    }

    try {
      // Check permission using Casbin
      const hasPermission = await this.casbinService.enforceForCompanyUser(
        user.companySlug,
        user.sub,
        resource,
        action
      );

      if (!hasPermission) {
        this.logger.warn(
          `Casbin: Access denied for user ${user.sub} in company ${user.companySlug}. ` +
            `Resource: ${resource}, Action: ${action}`
        );

        throw new ForbiddenException(
          `Insufficient permissions to ${action} ${resource}`
        );
      }

      this.logger.debug(
        `Casbin: Access granted for user ${user.sub} in company ${user.companySlug}. ` +
          `Resource: ${resource}, Action: ${action}`
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Casbin: Error checking permissions for user ${user.sub}:`,
        error
      );

      throw new ForbiddenException("Permission check failed");
    }
  }

  /**
   * Legacy authorization system for backward compatibility
   */
  private async checkLegacyPermissions(
    context: ExecutionContext,
    user: any
  ): Promise<void> {
    // Check @RequireAuth decorator
    const authRequirements = this.reflector.getAllAndMerge<AuthRequirement[]>(
      REQUIRE_AUTH_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (authRequirements && authRequirements.length > 0) {
      this.processAuthRequirements(authRequirements, user);
    }

    // Check @Permissions decorator
    this.checkPermissions(context, user);

    // Check @Roles decorator
    this.checkCompanyRoles(context, user);

    this.logger.debug(`Legacy authorization passed for user ${user.sub}`);
  }
}
