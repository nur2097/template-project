import { IsString, IsOptional, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRoleDto {
  @ApiProperty({
    description: "Role name",
    example: "Project Manager",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: "Role description",
    example: "Can manage projects and team members",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
