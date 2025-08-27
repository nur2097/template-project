import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { UserRole, UserStatus } from "../entities/user.entity";

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

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: UserRole;

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

  @Exclude()
  password: string;

  @Exclude()
  refreshToken: string;

  @Exclude()
  deletedAt: Date;
}