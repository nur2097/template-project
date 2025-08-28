import { z } from 'zod';

// Enums
export const UserRoleSchema = z.enum(['USER', 'ADMIN', 'MODERATOR']);
export const UserStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

// Base User Schema
export const UserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(6),
  role: UserRoleSchema.default('USER'),
  status: UserStatusSchema.default('ACTIVE'),
  avatar: z.string().url().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  emailVerified: z.boolean().default(false),
  emailVerifiedAt: z.date().nullable().optional(),
  lastLoginAt: z.date().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

// Create User Schema
export const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(6),
  role: UserRoleSchema.optional(),
  phoneNumber: z.string().optional(),
});

// Update User Schema
export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  avatar: z.string().url().optional(),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
});

// User Response Schema (without password)
export const UserResponseSchema = UserSchema.omit({ 
  password: true, 
  refreshToken: true 
});

// Login Schema
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Refresh Token Schema
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// Change Password Schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;