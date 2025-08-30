import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class JoinCompanyDto {
  @ApiProperty({
    description: "Company slug or domain to join",
    example: "acme-corp",
  })
  @IsString()
  @IsNotEmpty()
  companyIdentifier: string;

  @ApiProperty({
    description: "Join code or invitation token (if required)",
    example: "INV123456",
    required: false,
  })
  @IsOptional()
  @IsString()
  invitationCode?: string;
}
