import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PermissionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  resource: string;

  @ApiProperty()
  action: string;
}

export class RoleResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  companyId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [PermissionResponseDto] })
  permissions?: PermissionResponseDto[];

  @ApiPropertyOptional()
  userCount?: number;
}
