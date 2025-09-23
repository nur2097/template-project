import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";
import { BaseUserDto } from "@common/dto/base-user.dto";

export class RegisterDto extends BaseUserDto {
  // Company joining - Optional (defaults to 'default' company)
  @ApiPropertyOptional({
    description: "Company slug to join (defaults to 'default')",
    example: "acme-corp",
    default: "default",
  })
  @IsOptional()
  @IsString()
  companySlug?: string;

  @ApiPropertyOptional({
    description: "Invitation code for joining company (if required)",
    example: "INV123456",
  })
  @IsOptional()
  @IsString()
  invitationCode?: string;
}
