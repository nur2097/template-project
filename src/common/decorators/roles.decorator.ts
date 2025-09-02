import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Decorator to require specific company roles for endpoint access
 *
 * @param roles - Array of required roles (OR logic - user must have ANY)
 *
 * @example
 * @Roles(['manager', 'supervisor'])
 * @Roles(['admin'])
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
