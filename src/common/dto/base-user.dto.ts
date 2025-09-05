import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from "class-validator";
import { SystemUserRole } from "@prisma/client";
import { IsAllowedEmailDomain, IsValidPhoneNumber } from "../validators";
import { PasswordStrengthValidator } from "../validators/password-strength.validator";
import { Validate } from "class-validator";

export class BaseUserDto {
  @ApiProperty({
    example: "user@company.com",
    description: "User email address",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsAllowedEmailDomain(
    [], // No specific allowed domains (allow all)
    ["tempmail.org", "10minutemail.com", "guerrillamail.com", "mailinator.com"], // Block temporary email providers
    { message: "Temporary email addresses are not allowed" }
  )
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
    example: "MySecure123!",
    description:
      "User password (minimum 8 characters, must contain uppercase, lowercase, number and special character)",
    minLength: 8,
  })
  @IsString()
  @Validate(PasswordStrengthValidator)
  password: string;

  @ApiProperty({
    example: "+1234567890",
    description: "User phone number in international format",
    required: false,
  })
  @IsOptional()
  @IsValidPhoneNumber({
    message: "Phone number must be in international format (e.g., +1234567890)",
  })
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
