import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Validate,
} from "class-validator";
import { BaseCompanyDto } from "../../../common/dto/base-company.dto";
import { PasswordStrengthValidator } from "../../../common/validators";

export class RegisterCompanyDto extends BaseCompanyDto {
  // Admin User Information
  @ApiProperty({
    description: "Admin user email address",
    example: "admin@acme.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Admin email is required" })
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
    description: "Admin user phone number",
    example: "+1234567890",
    required: false,
  })
  @IsOptional()
  @IsString()
  adminPhoneNumber?: string;
}
