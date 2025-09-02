import { SetMetadata } from "@nestjs/common";

export const SUPER_ADMIN_ONLY_KEY = "superAdminOnly";

/**
 * Decorator to restrict endpoint access to SuperAdmin only
 * This bypasses all other permission/role checks
 *
 * @example
 * @SuperAdminOnly()
 * async getSensitiveData() {}
 */
export const SuperAdminOnly = () => SetMetadata(SUPER_ADMIN_ONLY_KEY, true);
