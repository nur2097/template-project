import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsObject,
} from "class-validator";
import { IsValidCompanyDomain } from "../validators";

export class BaseCompanyDto {
  @ApiProperty({
    example: "Acme Corporation",
    description: "Company name",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: "acme-corp",
    description: "Company slug (lowercase, numbers, hyphens only)",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug: string;

  @ApiProperty({
    example: "acme.com",
    description: "Company domain (must be a valid domain format)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsValidCompanyDomain({ message: "Please provide a valid company domain" })
  domain?: string;

  @ApiProperty({
    description: "Company settings JSON object",
    required: false,
    type: "object",
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
