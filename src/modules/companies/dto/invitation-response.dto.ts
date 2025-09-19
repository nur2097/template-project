import { ApiProperty } from "@nestjs/swagger";
import { CompanyInvitationStatus, SystemUserRole } from "@prisma/client";

export class InvitationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "user@example.com" })
  email: string;

  @ApiProperty({ example: "INV123456" })
  code: string;

  @ApiProperty({ enum: SystemUserRole, example: SystemUserRole.USER })
  role: SystemUserRole;

  @ApiProperty({
    enum: CompanyInvitationStatus,
    example: CompanyInvitationStatus.PENDING,
  })
  status: CompanyInvitationStatus;

  @ApiProperty({ example: 1 })
  invitedBy: number;

  @ApiProperty({ example: 1 })
  companyId: number;

  @ApiProperty({ example: "2024-01-01T00:00:00Z" })
  expiresAt: string;

  @ApiProperty({ example: "2024-01-01T00:00:00Z", required: false })
  acceptedAt?: string;

  @ApiProperty({ example: "2024-01-01T00:00:00Z", required: false })
  rejectedAt?: string;

  @ApiProperty({ example: "2024-01-01T00:00:00Z" })
  createdAt: string;

  @ApiProperty({ example: "2024-01-01T00:00:00Z" })
  updatedAt: string;

  @ApiProperty({
    example: { firstName: "John", lastName: "Doe", email: "admin@company.com" },
  })
  inviter: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}
