import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsEmail,
} from "class-validator";
import { BaseCompanyDto } from "../../../common/dto/base-company.dto";

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
    description: "Admin user password (minimum 6 characters)",
    example: "password123",
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: "Admin password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
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
