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

/**
 * Unified Authentication Guard - TEK VE DOĞRU SİSTEM
 *
 * Tüm auth kontrollerini tek guard'da yapar:
 * - JWT authentication
 * - Public endpoint check
 * - System role hierarchy
 * - Company isolation
 * - RBAC permissions
 * - Company roles
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService
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

    // 3. SYSTEM ROLE HIERARCHY CHECK
    const systemRoleResult = this.checkSystemRoles(context, user);
    if (!systemRoleResult) {
      return false;
    }

    // 4. COMPANY ISOLATION
    this.enforceCompanyIsolation(request, user);

    // 5. PERMISSIONS CHECK
    this.checkPermissions(context, user);

    // 6. COMPANY ROLES CHECK
    this.checkCompanyRoles(context, user);

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

  private checkSystemRoles(context: ExecutionContext, user: any): boolean {
    // Check @RequireAuth decorator
    const authRequirements = this.reflector.getAllAndMerge<AuthRequirement[]>(
      REQUIRE_AUTH_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Check @SuperAdminOnly decorator
    const requiresSuperAdmin = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_ONLY_KEY,
      [context.getHandler(), context.getClass()]
    );

    // SUPERADMIN bypass - highest priority
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      return true;
    }

    // SuperAdmin required but user is not superadmin
    if (requiresSuperAdmin) {
      throw new ForbiddenException("SuperAdmin access required");
    }

    // Process @RequireAuth requirements
    if (authRequirements && authRequirements.length > 0) {
      return this.processAuthRequirements(authRequirements, user);
    }

    // No specific system role requirements
    return true;
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
}
