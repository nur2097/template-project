import { SetMetadata } from "@nestjs/common";

export const CASBIN_RESOURCE_KEY = "casbin_resource";
export const CASBIN_ACTION_KEY = "casbin_action";

/**
 * Decorator to set Casbin resource for authorization
 * @param resource - The resource name (e.g., 'users', 'companies', 'roles')
 */
export const CasbinResource = (resource: string) =>
  SetMetadata(CASBIN_RESOURCE_KEY, resource);

/**
 * Decorator to set Casbin action for authorization
 * @param action - The action name (e.g., 'create', 'read', 'update', 'delete')
 */
export const CasbinAction = (action: string) =>
  SetMetadata(CASBIN_ACTION_KEY, action);

/**
 * Combined decorator for setting both resource and action
 * @param resource - The resource name
 * @param action - The action name
 */
export const CasbinPermission = (resource: string, action: string) => {
  return function (
    target: any,
    propertyName?: string,
    descriptor?: PropertyDescriptor
  ) {
    SetMetadata(CASBIN_RESOURCE_KEY, resource)(
      target,
      propertyName,
      descriptor
    );
    SetMetadata(CASBIN_ACTION_KEY, action)(target, propertyName, descriptor);
  };
};

// Pre-defined resource constants
export const CASBIN_RESOURCES = {
  USERS: "users",
  COMPANIES: "companies",
  ROLES: "roles",
  PERMISSIONS: "permissions",
  HEALTH: "health",
  UPLOAD: "upload",
  AUTH: "auth",
} as const;

// Pre-defined action constants
export const CASBIN_ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  MANAGE: "manage",
} as const;

// Convenience decorators for common permissions
export const CanCreateUsers = () =>
  CasbinPermission(CASBIN_RESOURCES.USERS, CASBIN_ACTIONS.CREATE);

export const CanReadUsers = () =>
  CasbinPermission(CASBIN_RESOURCES.USERS, CASBIN_ACTIONS.READ);

export const CanUpdateUsers = () =>
  CasbinPermission(CASBIN_RESOURCES.USERS, CASBIN_ACTIONS.UPDATE);

export const CanDeleteUsers = () =>
  CasbinPermission(CASBIN_RESOURCES.USERS, CASBIN_ACTIONS.DELETE);

export const CanCreateCompanies = () =>
  CasbinPermission(CASBIN_RESOURCES.COMPANIES, CASBIN_ACTIONS.CREATE);

export const CanReadCompanies = () =>
  CasbinPermission(CASBIN_RESOURCES.COMPANIES, CASBIN_ACTIONS.READ);

export const CanUpdateCompanies = () =>
  CasbinPermission(CASBIN_RESOURCES.COMPANIES, CASBIN_ACTIONS.UPDATE);

export const CanDeleteCompanies = () =>
  CasbinPermission(CASBIN_RESOURCES.COMPANIES, CASBIN_ACTIONS.DELETE);

export const CanCreateRoles = () =>
  CasbinPermission(CASBIN_RESOURCES.ROLES, CASBIN_ACTIONS.CREATE);

export const CanReadRoles = () =>
  CasbinPermission(CASBIN_RESOURCES.ROLES, CASBIN_ACTIONS.READ);

export const CanUpdateRoles = () =>
  CasbinPermission(CASBIN_RESOURCES.ROLES, CASBIN_ACTIONS.UPDATE);

export const CanDeleteRoles = () =>
  CasbinPermission(CASBIN_RESOURCES.ROLES, CASBIN_ACTIONS.DELETE);

export const CanReadHealth = () =>
  CasbinPermission(CASBIN_RESOURCES.HEALTH, CASBIN_ACTIONS.READ);

export const CanUpload = () =>
  CasbinPermission(CASBIN_RESOURCES.UPLOAD, CASBIN_ACTIONS.CREATE);

export const CanReadFiles = () =>
  CasbinPermission(CASBIN_RESOURCES.UPLOAD, CASBIN_ACTIONS.READ);
