import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

/**
 * Decorator to require specific permissions for endpoint access
 *
 * @param permissions - Array of required permissions (AND logic - user must have ALL)
 *
 * @example
 * @Permissions(['users.read', 'users.write'])
 * @Permissions(['admin.dashboard'])
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
