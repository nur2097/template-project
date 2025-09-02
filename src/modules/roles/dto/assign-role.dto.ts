import { IsInt, IsPositive } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class AssignRoleDto {
  @ApiProperty({
    description: "User ID to assign role to",
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  userId: number;

  @ApiProperty({
    description: "Role ID to assign",
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  roleId: number;
}

export class AssignPermissionToRoleDto {
  @ApiProperty({
    description: "Permission ID to assign to role",
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  permissionId: number;
}
