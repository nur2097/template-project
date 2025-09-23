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
import { ConfigurationService } from "../../config/configuration.service";
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
    private casbinService: CasbinService,
    private configService: ConfigurationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. PUBLIC ENDPOINT CHECK
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug(
      `UnifiedAuthGuard: ${request.method} ${request.path} - isPublic: ${isPublic}`
    );

    if (isPublic) {
      this.logger.debug(`Public endpoint, allowing access: ${request.path}`);
      return true;
    }

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

      // Enhanced JWT verification with all security claims
      const payload = await this.jwtService.verifyAsync(token, {
        issuer: this.configService.jwtIssuer,
        audience: this.configService.jwtAudience,
        clockTolerance: 30,
        maxAge: this.configService.jwtExpiresIn,
        ignoreNotBefore: false,
      });

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

  private buildRequirementErrorMessage(
    requirement: AuthRequirement,
    user: any
  ): string {
    this.logger.debug(
      `Building error message for requirement: ${JSON.stringify(requirement)}, type: ${typeof requirement}, isArray: ${Array.isArray(requirement)}`
    );

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
    this.logger.debug(
      `checkSingleAuthRequirement called with: ${JSON.stringify(requirement)}, type: ${typeof requirement}`
    );

    if (Array.isArray(requirement)) {
      // AND logic - all must pass
      return requirement.every((req) =>
        this.checkSingleAuthRequirement(req, user)
      );
    }

    if (typeof requirement === "string") {
      this.logger.debug(`Processing string requirement: "${requirement}"`);

      // System role check
      if (["SUPERADMIN", "ADMIN", "MODERATOR", "USER"].includes(requirement)) {
        return this.hasSystemRole(
          requirement as keyof typeof SystemUserRole,
          user
        );
      }

      // Permission check
      if (requirement.includes(".")) {
        this.logger.debug(`Permission check for: "${requirement}"`);
        return this.hasPermission(requirement, user);
      }

      // Special case
      if (requirement === "AUTHENTICATED") {
        return true; // Already authenticated
      }
    }

    this.logger.debug(
      `No match found for requirement: ${JSON.stringify(requirement)}`
    );
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

    this.logger.debug(
      `Checking permission "${permission}" for user ${user.sub}. User permissions: ${JSON.stringify(user.permissions)}`
    );

    const hasPermission = user.permissions?.includes(permission) || false;
    this.logger.debug(`Permission check result: ${hasPermission}`);

    return hasPermission;
  }

  private enforceCompanyIsolation(request: any, user: any): void {
    // SUPERADMIN bypasses company isolation but with security controls
    if (user.systemRole === SystemUserRole.SUPERADMIN) {
      // Validate target company access for SUPERADMIN
      const targetCompanyId = this.validateSuperAdminCompanyAccess(
        request,
        user
      );

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
        `SUPERADMIN context: companyId=${request.companyId}, globalAccess=${!targetCompanyId}`,
        { userId: user.sub, originalCompanyId: user.companyId }
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
      // Check permission using Casbin - use companyId from token
      // Convert companyId to companySlug if needed by CasbinService
      const companyIdentifier = user.companySlug || user.companyId;
      const hasPermission = await this.casbinService.enforceForCompanyUser(
        companyIdentifier,
        user.sub,
        resource,
        action
      );

      if (!hasPermission) {
        this.logger.warn(
          `Casbin: Access denied for user ${user.sub} in company ${companyIdentifier}. ` +
            `Resource: ${resource}, Action: ${action}`
        );

        throw new ForbiddenException(
          `Insufficient permissions to ${action} ${resource}`
        );
      }

      this.logger.debug(
        `Casbin: Access granted for user ${user.sub} in company ${companyIdentifier}. ` +
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
    const handlerAuth = this.reflector.get<AuthRequirement>(
      REQUIRE_AUTH_KEY,
      context.getHandler()
    );
    const classAuth = this.reflector.get<AuthRequirement>(
      REQUIRE_AUTH_KEY,
      context.getClass()
    );

    this.logger.debug(
      `Handler auth: ${JSON.stringify(handlerAuth)}, Class auth: ${JSON.stringify(classAuth)}`
    );

    // Process individual auth requirements
    if (handlerAuth) {
      this.logger.debug(
        `Processing handler auth requirement: ${JSON.stringify(handlerAuth)}`
      );
      if (!this.checkSingleAuthRequirement(handlerAuth, user)) {
        const errorMessage = this.buildRequirementErrorMessage(
          handlerAuth,
          user
        );
        this.logger.warn(`Access denied for user ${user.sub}: ${errorMessage}`);
        throw new ForbiddenException(errorMessage);
      }
    }

    if (classAuth && !handlerAuth) {
      this.logger.debug(
        `Processing class auth requirement: ${JSON.stringify(classAuth)}`
      );
      if (!this.checkSingleAuthRequirement(classAuth, user)) {
        const errorMessage = this.buildRequirementErrorMessage(classAuth, user);
        this.logger.warn(`Access denied for user ${user.sub}: ${errorMessage}`);
        throw new ForbiddenException(errorMessage);
      }
    }

    // Check @Permissions decorator
    this.checkPermissions(context, user);

    // Check @Roles decorator
    this.checkCompanyRoles(context, user);

    this.logger.debug(`Legacy authorization passed for user ${user.sub}`);
  }

  /**
   * Validates SUPERADMIN company access with security controls
   */
  private validateSuperAdminCompanyAccess(
    request: any,
    user: any
  ): number | null {
    const requestedCompanyId = request.query?.companyId
      ? parseInt(request.query.companyId, 10)
      : null;

    // Security validation for company ID parameter
    if (requestedCompanyId !== null) {
      // Validate that companyId is a valid positive integer
      if (!Number.isInteger(requestedCompanyId) || requestedCompanyId <= 0) {
        this.logger.warn(
          `SUPERADMIN ${user.sub} attempted to access invalid company ID: ${request.query.companyId}`,
          { ip: request.ip, userAgent: request.get("User-Agent") }
        );
        throw new ForbiddenException("Invalid company ID format");
      }

      // Check if the requested company actually exists (basic validation)
      // Note: This is a lightweight check - full validation happens in business logic
      if (requestedCompanyId > 999999) {
        // Reasonable upper bound
        this.logger.warn(
          `SUPERADMIN ${user.sub} attempted to access suspiciously high company ID: ${requestedCompanyId}`,
          { ip: request.ip, userAgent: request.get("User-Agent") }
        );
        throw new ForbiddenException("Company ID out of valid range");
      }

      // Log SUPERADMIN company access for audit trail
      this.logger.log(
        `SUPERADMIN ${user.sub} accessing company ${requestedCompanyId}`,
        {
          superAdminId: user.sub,
          targetCompanyId: requestedCompanyId,
          originalCompanyId: user.companyId,
          ip: request.ip,
          userAgent: request.get("User-Agent"),
          path: request.path,
          method: request.method,
        }
      );

      return requestedCompanyId;
    }

    // If no specific company requested, use SUPERADMIN's own company or global access
    return user.companyId || null;
  }
}
