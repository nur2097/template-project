import { IsString, IsOptional, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePermissionDto {
  @ApiProperty({
    description: "Permission name (format: resource.action)",
    example: "projects.read",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: "Permission description",
    example: "Can view projects",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: "Resource the permission applies to",
    example: "projects",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  resource: string;

  @ApiProperty({
    description: "Action that can be performed",
    example: "read",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  action: string;
}
