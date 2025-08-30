import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { SystemUserRole, UserStatus } from "@prisma/client";

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  fullName: string;

  @ApiProperty({ enum: SystemUserRole })
  @Expose()
  systemRole: SystemUserRole;

  @ApiProperty({ enum: UserStatus })
  @Expose()
  status: UserStatus;

  @ApiProperty({ required: false })
  @Expose()
  avatar?: string;

  @ApiProperty({ required: false })
  @Expose()
  phoneNumber?: string;

  @ApiProperty()
  @Expose()
  emailVerified: boolean;

  @ApiProperty({ required: false })
  @Expose()
  emailVerifiedAt?: Date;

  @ApiProperty({ required: false })
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty()
  @Expose()
  companyId: number;

  @ApiProperty({ required: false })
  @Expose()
  deletedAt?: Date;
}
