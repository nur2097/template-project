import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from "class-validator";
import { SystemUserRole } from "@prisma/client";

export class BaseUserDto {
  @ApiProperty({
    example: "user@company.com",
    description: "User email address",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "John",
    description: "User first name",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    example: "Doe",
    description: "User last name",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    example: "password123",
    description: "User password (minimum 6 characters)",
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: "+1234567890",
    description: "User phone number",
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    example: "USER",
    description: "User system role",
    enum: SystemUserRole,
    default: SystemUserRole.USER,
  })
  @IsOptional()
  role?: SystemUserRole = SystemUserRole.USER;
}
