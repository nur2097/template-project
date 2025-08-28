// User Entity - exporting enums from Prisma generated types
// This file provides a central place for user-related type exports
import { UserRole, UserStatus } from '@prisma/client';

export { UserRole, UserStatus };

// Additional type definitions if needed
export interface UserEntity {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}