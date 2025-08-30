export type AuthRequirement =
  | string // Permission like "users.read" or role like "ADMIN"
  | AuthRequirement[]; // Multiple requirements (AND logic)
