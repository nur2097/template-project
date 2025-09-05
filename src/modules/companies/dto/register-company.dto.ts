import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Validate,
} from "class-validator";
import { BaseCompanyDto } from "../../../common/dto/base-company.dto";
import {
  IsAllowedEmailDomain,
  IsValidPhoneNumber,
} from "../../../common/validators";
import { PasswordStrengthValidator } from "../../../common/validators/password-strength.validator";

export class RegisterCompanyDto extends BaseCompanyDto {
  // Admin User Information
  @ApiProperty({
    description: "Admin user email address",
    example: "admin@acme.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Admin email is required" })
  @IsAllowedEmailDomain(
    [], // No specific allowed domains
    ["tempmail.org", "10minutemail.com", "guerrillamail.com", "mailinator.com"],
    { message: "Temporary email addresses are not allowed for admin accounts" }
  )
  adminEmail: string;

  @ApiProperty({
    description: "Admin user first name",
    example: "John",
  })
  @IsString()
  @IsNotEmpty({ message: "Admin first name is required" })
  adminFirstName: string;

  @ApiProperty({
    description: "Admin user last name",
    example: "Doe",
  })
  @IsString()
  @IsNotEmpty({ message: "Admin last name is required" })
  adminLastName: string;

  @ApiProperty({
    description:
      "Admin user password (minimum 8 characters, must contain uppercase, lowercase, number and special character)",
    example: "MySecure123!",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: "Admin password is required" })
  @Validate(PasswordStrengthValidator)
  adminPassword: string;

  @ApiProperty({
    description: "Admin user phone number in international format",
    example: "+1234567890",
    required: false,
  })
  @IsOptional()
  @IsValidPhoneNumber({
    message: "Phone number must be in international format (e.g., +1234567890)",
  })
  adminPhoneNumber?: string;
}
