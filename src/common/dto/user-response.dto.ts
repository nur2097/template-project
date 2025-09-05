import { ApiProperty } from "@nestjs/swagger";
import { StandardResponseDto, ErrorResponseDto } from "./standard-response.dto";

export class UserDto {
  @ApiProperty({
    description: "User unique identifier",
    example: "user_123456",
  })
  id: string;

  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  email: string;

  @ApiProperty({
    description: "User first name",
    example: "John",
  })
  firstName: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
  })
  lastName: string;

  @ApiProperty({
    description: "User phone number (optional)",
    required: false,
    example: "+1234567890",
  })
  phone?: string;

  @ApiProperty({
    description: "User status",
    enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"],
    example: "ACTIVE",
  })
  status: string;

  @ApiProperty({
    description: "Whether email is verified",
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: "User roles",
    type: "array",
    items: { type: "string" },
  })
  roles: string[];

  @ApiProperty({
    description: "Associated company information",
    type: "object",
    required: false,
  })
  company?: {
    id: string;
    name: string;
    status: string;
  };

  @ApiProperty({
    description: "User permissions",
    type: "array",
    items: { type: "string" },
  })
  permissions: string[];

  @ApiProperty({
    description: "User preferences",
    type: "object",
  })
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
    };
  };

  @ApiProperty({
    description: "User profile picture URL (optional)",
    required: false,
    example: "https://example.com/avatar.jpg",
  })
  avatar?: string;

  @ApiProperty({
    description: "Last login timestamp (optional)",
    required: false,
    example: "2024-01-01T12:00:00.000Z",
  })
  lastLoginAt?: string;

  @ApiProperty({
    description: "User creation timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  createdAt: string;

  @ApiProperty({
    description: "User last update timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  updatedAt: string;
}

export class UserProfileDto {
  @ApiProperty({
    description: "User basic information",
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: "User activity statistics",
    type: "object",
  })
  activityStats: {
    totalLogins: number;
    lastActiveDevices: number;
    totalSessions: number;
    averageSessionDuration: number;
  };

  @ApiProperty({
    description: "User security information",
    type: "object",
  })
  security: {
    twoFactorEnabled: boolean;
    passwordLastChanged: string;
    activeDevices: number;
    recentLogins: {
      timestamp: string;
      ip: string;
      userAgent: string;
      location?: string;
    }[];
  };
}

export class PaginatedUsersDto {
  @ApiProperty({
    description: "List of users",
    type: [UserDto],
  })
  users: UserDto[];

  @ApiProperty({
    description: "Total number of users",
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: "Current page number",
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: "Number of items per page",
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: "Total number of pages",
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: "Whether there is a next page",
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: "Whether there is a previous page",
    example: false,
  })
  hasPrev: boolean;
}

export class UserCreationResultDto {
  @ApiProperty({
    description: "Created user information",
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: "Temporary password (if generated)",
    required: false,
    example: "TempPass123!",
  })
  temporaryPassword?: string;

  @ApiProperty({
    description: "Verification email sent status",
    example: true,
  })
  verificationEmailSent: boolean;
}

export class PasswordUpdateResultDto {
  @ApiProperty({
    description: "Password change timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  passwordChangedAt: string;

  @ApiProperty({
    description: "Whether existing sessions were invalidated",
    example: true,
  })
  sessionsInvalidated: boolean;

  @ApiProperty({
    description: "Number of devices logged out",
    example: 3,
  })
  devicesLoggedOut: number;
}

// Response DTOs
export class UserResponseDto extends StandardResponseDto<UserDto> {
  @ApiProperty({ type: UserDto })
  data: UserDto;
}

export class UserProfileResponseDto extends StandardResponseDto<UserProfileDto> {
  @ApiProperty({ type: UserProfileDto })
  data: UserProfileDto;
}

export class UsersListResponseDto extends StandardResponseDto<PaginatedUsersDto> {
  @ApiProperty({ type: PaginatedUsersDto })
  data: PaginatedUsersDto;
}

export class UserCreatedResponseDto extends StandardResponseDto<UserCreationResultDto> {
  @ApiProperty({ type: UserCreationResultDto })
  data: UserCreationResultDto;
}

export class UserUpdatedResponseDto extends StandardResponseDto<UserDto> {
  @ApiProperty({ type: UserDto })
  data: UserDto;
}

export class UserDeletedResponseDto extends StandardResponseDto<{
  deletedAt: string;
}> {
  @ApiProperty({
    type: "object",
    properties: {
      deletedAt: { type: "string", format: "date-time" },
    },
  })
  data: { deletedAt: string };
}

export class PasswordUpdatedResponseDto extends StandardResponseDto<PasswordUpdateResultDto> {
  @ApiProperty({ type: PasswordUpdateResultDto })
  data: PasswordUpdateResultDto;
}

// Error Response DTOs
export class UserErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: "User-specific error codes",
    enum: [
      "USER_NOT_FOUND",
      "USER_ALREADY_EXISTS",
      "USER_INACTIVE",
      "USER_SUSPENDED",
      "EMAIL_NOT_VERIFIED",
      "INVALID_PASSWORD_FORMAT",
      "PASSWORD_TOO_WEAK",
      "SAME_PASSWORD_NOT_ALLOWED",
      "USER_DELETION_RESTRICTED",
      "COMPANY_USER_LIMIT_EXCEEDED",
    ],
    example: "USER_NOT_FOUND",
  })
  errorCode: string;
}
