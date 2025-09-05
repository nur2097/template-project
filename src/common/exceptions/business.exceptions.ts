import { HttpStatus } from "@nestjs/common";
import { BaseException } from "./base.exception";

/**
 * Business logic related exceptions
 */

export class EntityNotFoundException extends BaseException {
  constructor(entityType: string, identifier: string | number) {
    super(
      `${entityType} with identifier '${identifier}' not found`,
      HttpStatus.NOT_FOUND,
      "ENTITY_NOT_FOUND",
      { entityType, identifier }
    );
  }
}

export class EntityAlreadyExistsException extends BaseException {
  constructor(
    entityType: string,
    field: string,
    value: string,
    existingId?: number
  ) {
    super(
      `${entityType} with ${field} '${value}' already exists`,
      HttpStatus.CONFLICT,
      "ENTITY_ALREADY_EXISTS",
      { entityType, field, value, existingId }
    );
  }
}

export class InvalidCompanySlugException extends BaseException {
  constructor(slug: string) {
    super(
      `Company slug '${slug}' is invalid or not found`,
      HttpStatus.BAD_REQUEST,
      "INVALID_COMPANY_SLUG",
      { slug }
    );
  }
}

export class InvalidCompanyInvitationException extends BaseException {
  constructor(invitationCode: string) {
    super(
      `Company invitation code '${invitationCode}' is invalid or expired`,
      HttpStatus.BAD_REQUEST,
      "INVALID_COMPANY_INVITATION",
      { invitationCode }
    );
  }
}

export class CompanyInactiveException extends BaseException {
  constructor(companyId: number) {
    super(
      "Company is inactive and cannot be accessed",
      HttpStatus.FORBIDDEN,
      "COMPANY_INACTIVE",
      { companyId }
    );
  }
}

export class UserNotInCompanyException extends BaseException {
  constructor(userId: number, companyId: number) {
    super(
      "User does not belong to the specified company",
      HttpStatus.FORBIDDEN,
      "USER_NOT_IN_COMPANY",
      { userId, companyId }
    );
  }
}

export class RoleNotFoundException extends BaseException {
  constructor(roleId: number, companyId: number) {
    super(
      `Role with ID ${roleId} not found in company ${companyId}`,
      HttpStatus.NOT_FOUND,
      "ROLE_NOT_FOUND",
      { roleId, companyId }
    );
  }
}

export class PermissionNotFoundException extends BaseException {
  constructor(permissionId: number, companyId: number) {
    super(
      `Permission with ID ${permissionId} not found in company ${companyId}`,
      HttpStatus.NOT_FOUND,
      "PERMISSION_NOT_FOUND",
      { permissionId, companyId }
    );
  }
}

export class RoleAssignmentException extends BaseException {
  constructor(userId: number, roleId: number, reason: string) {
    super(
      `Cannot assign role ${roleId} to user ${userId}: ${reason}`,
      HttpStatus.BAD_REQUEST,
      "ROLE_ASSIGNMENT_FAILED",
      { userId, roleId, reason }
    );
  }
}

export class SystemRoleModificationException extends BaseException {
  constructor() {
    super(
      "System roles cannot be modified",
      HttpStatus.FORBIDDEN,
      "SYSTEM_ROLE_MODIFICATION_FORBIDDEN"
    );
  }
}

export class CircularRoleDependencyException extends BaseException {
  constructor(roleIds: number[]) {
    super(
      "Circular dependency detected in role hierarchy",
      HttpStatus.BAD_REQUEST,
      "CIRCULAR_ROLE_DEPENDENCY",
      { roleIds }
    );
  }
}

export class DataIntegrityException extends BaseException {
  constructor(operation: string, details: string) {
    super(
      `Data integrity violation during ${operation}: ${details}`,
      HttpStatus.CONFLICT,
      "DATA_INTEGRITY_VIOLATION",
      { operation, details }
    );
  }
}

export class ResourceLimitExceededException extends BaseException {
  constructor(
    resource: string,
    limit: number,
    current: number,
    companyId?: number
  ) {
    super(
      `${resource} limit of ${limit} exceeded (current: ${current})`,
      HttpStatus.FORBIDDEN,
      "RESOURCE_LIMIT_EXCEEDED",
      { resource, limit, current, companyId }
    );
  }
}

export class ConcurrentModificationException extends BaseException {
  constructor(entityType: string, entityId: string | number) {
    super(
      `${entityType} '${entityId}' was modified by another user. Please refresh and try again.`,
      HttpStatus.CONFLICT,
      "CONCURRENT_MODIFICATION",
      { entityType, entityId }
    );
  }
}

export class OperationNotAllowedException extends BaseException {
  constructor(operation: string, reason: string) {
    super(
      `Operation '${operation}' is not allowed: ${reason}`,
      HttpStatus.FORBIDDEN,
      "OPERATION_NOT_ALLOWED",
      { operation, reason }
    );
  }
}
