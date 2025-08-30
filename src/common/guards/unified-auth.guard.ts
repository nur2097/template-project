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
export const SUPER_ADMIN_ONLY_KEY = "superAdminOnly";
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
    const permissionsResult = this.checkPermissions(context, user);
    if (!permissionsResult) {
      throw new ForbiddenException("Insufficient permissions");
    }

    // 6. COMPANY ROLES CHECK
    const rolesResult = this.checkCompanyRoles(context, user);
    if (!rolesResult) {
      throw new ForbiddenException("Insufficient role privileges");
    }

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
        throw new ForbiddenException(
          `Access denied: ${JSON.stringify(requirement)}`
        );
      }
    }
    return true;
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
    // SUPERADMIN bypasses company isolation but still needs company context for services
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      // CRITICAL FIX: Set global context for SUPERADMIN
      request.companyId = user.companyId || null;
      request.company = user.companyId
        ? { id: user.companyId, isSuperAdminContext: true }
        : { id: null, isSuperAdminContext: true, isGlobalAccess: true };
      request.isSuperAdmin = true;
      return;
    }

    // All other users must belong to a company
    if (!user.companyId) {
      throw new ForbiddenException("User must belong to a company");
    }

    // Set company context for services
    request.companyId = user.companyId;
    request.company = { id: user.companyId, isSuperAdminContext: false };
    request.isSuperAdmin = false;
  }

  private checkPermissions(context: ExecutionContext, user: any): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // SUPERADMIN has all permissions
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every((permission) =>
      user.permissions?.includes(permission)
    );
  }

  private checkCompanyRoles(context: ExecutionContext, user: any): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // SUPERADMIN bypasses company role checks
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      return true;
    }

    // Check if user has any of the required roles
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
