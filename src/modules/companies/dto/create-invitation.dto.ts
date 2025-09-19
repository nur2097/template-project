import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { SystemUserRole } from "@prisma/client";

export class CreateInvitationDto {
  @ApiProperty({
    description: "Email address to invite",
    example: "user@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Role to assign to the invited user",
    enum: SystemUserRole,
    example: SystemUserRole.USER,
    default: SystemUserRole.USER,
  })
  @IsOptional()
  @IsEnum(SystemUserRole)
  role?: SystemUserRole = SystemUserRole.USER;
}
