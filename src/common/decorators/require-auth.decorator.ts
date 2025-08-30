import { SetMetadata } from "@nestjs/common";
import { AuthRequirement } from "../types/auth.types";

export const REQUIRE_AUTH_KEY = "requireAuth";

/**
 * Unified authentication decorator - TEK DOĞRU SİSTEM
 *
 * @param requirement - Auth requirement(s)
 *
 * @example
 * // Basic authentication
 * @RequireAuth()
 *
 * // System role
 * @RequireAuth("SUPERADMIN")
 * @RequireAuth("ADMIN")
 *
 * // Permission
 * @RequireAuth("users.read")
 * @RequireAuth("company.settings.write")
 *
 * // Multiple requirements (AND logic)
 * @RequireAuth(["ADMIN", "users.write"])
 *
 * // Complex combinations
 * @RequireAuth([["ADMIN", "users.write"], "SUPERADMIN"]) // (ADMIN AND users.write) OR SUPERADMIN
 */
export const RequireAuth = (requirement?: AuthRequirement) =>
  SetMetadata(REQUIRE_AUTH_KEY, requirement || "AUTHENTICATED");
