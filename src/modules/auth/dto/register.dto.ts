import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty } from "class-validator";
import { BaseUserDto } from "@common/dto/base-user.dto";

export class RegisterDto extends BaseUserDto {
  // Company joining - REQUIRED (one must be provided)
  @ApiProperty({
    description: "Company slug to join",
    example: "acme-corp",
  })
  @IsString()
  @IsNotEmpty({ message: "Company slug is required to join a company" })
  companySlug: string;

  @ApiPropertyOptional({
    description: "Invitation code for joining company (if required)",
    example: "INV123456",
  })
  @IsOptional()
  @IsString()
  invitationCode?: string;
}
