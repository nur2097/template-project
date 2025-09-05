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
    description: "User status",
    enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
    example: "ACTIVE",
  })
  status: string;

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
}

export class DeviceInfoDto {
  @ApiProperty({
    description: "Device unique identifier",
    example: "device_123456",
  })
  id: string;

  @ApiProperty({
    description: "Device name",
    example: "Chrome on Windows",
  })
  name: string;

  @ApiProperty({
    description: "Device type",
    enum: ["DESKTOP", "MOBILE", "TABLET"],
    example: "DESKTOP",
  })
  type: string;

  @ApiProperty({
    description: "Last activity timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  lastActivity: string;

  @ApiProperty({
    description: "Whether this is the current device",
    example: true,
  })
  isCurrentDevice: boolean;
}

export class AuthTokensDto {
  @ApiProperty({
    description: "JWT access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "Refresh token for obtaining new access tokens",
    example: "rt_123456789abcdef",
  })
  refreshToken: string;

  @ApiProperty({
    description: "Token expiry time in seconds",
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: "Token type",
    example: "Bearer",
  })
  tokenType: string;
}

export class LoginSuccessDataDto {
  @ApiProperty({
    description: "Authenticated user information",
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: "Authentication tokens",
    type: AuthTokensDto,
  })
  tokens: AuthTokensDto;

  @ApiProperty({
    description: "Current device information",
    type: DeviceInfoDto,
  })
  device: DeviceInfoDto;

  @ApiProperty({
    description: "Session information",
    type: "object",
  })
  session: {
    id: string;
    expiresAt: string;
    createdAt: string;
  };
}

export class RefreshTokenDataDto {
  @ApiProperty({
    description: "New authentication tokens",
    type: AuthTokensDto,
  })
  tokens: AuthTokensDto;

  @ApiProperty({
    description: "Updated session information",
    type: "object",
  })
  session: {
    id: string;
    expiresAt: string;
    refreshedAt: string;
  };
}

export class LogoutDataDto {
  @ApiProperty({
    description: "Logout timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  logoutTime: string;

  @ApiProperty({
    description: "Device from which logout occurred",
    type: DeviceInfoDto,
  })
  device: DeviceInfoDto;
}

export class UserDevicesDataDto {
  @ApiProperty({
    description: "List of user devices",
    type: [DeviceInfoDto],
  })
  devices: DeviceInfoDto[];

  @ApiProperty({
    description: "Total device count",
    example: 3,
  })
  totalDevices: number;

  @ApiProperty({
    description: "Maximum allowed devices",
    example: 5,
  })
  maxDevices: number;
}

export class PasswordChangeDataDto {
  @ApiProperty({
    description: "Password change timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  changedAt: string;

  @ApiProperty({
    description: "Whether existing sessions were invalidated",
    example: true,
  })
  sessionsInvalidated: boolean;
}

// Response DTOs
export class LoginResponseDto extends StandardResponseDto<LoginSuccessDataDto> {
  @ApiProperty({ type: LoginSuccessDataDto })
  data: LoginSuccessDataDto;
}

export class RefreshTokenResponseDto extends StandardResponseDto<RefreshTokenDataDto> {
  @ApiProperty({ type: RefreshTokenDataDto })
  data: RefreshTokenDataDto;
}

export class LogoutResponseDto extends StandardResponseDto<LogoutDataDto> {
  @ApiProperty({ type: LogoutDataDto })
  data: LogoutDataDto;
}

export class UserDevicesResponseDto extends StandardResponseDto<UserDevicesDataDto> {
  @ApiProperty({ type: UserDevicesDataDto })
  data: UserDevicesDataDto;
}

export class PasswordChangeResponseDto extends StandardResponseDto<PasswordChangeDataDto> {
  @ApiProperty({ type: PasswordChangeDataDto })
  data: PasswordChangeDataDto;
}

export class MeResponseDto extends StandardResponseDto<UserDto> {
  @ApiProperty({ type: UserDto })
  data: UserDto;
}

// Error Response DTOs
export class AuthErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: "Authentication error codes",
    enum: [
      "INVALID_CREDENTIALS",
      "TOKEN_EXPIRED",
      "REFRESH_TOKEN_INVALID",
      "MAX_DEVICES_EXCEEDED",
      "ACCOUNT_LOCKED",
      "ACCOUNT_INACTIVE",
      "PASSWORD_POLICY_VIOLATION",
      "DEVICE_LIMIT_EXCEEDED",
    ],
    example: "INVALID_CREDENTIALS",
  })
  errorCode: string;
}
