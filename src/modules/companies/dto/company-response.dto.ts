import { ApiProperty } from "@nestjs/swagger";

export class CompanyResponseDto {
  @ApiProperty({ description: "Company ID", example: 1 })
  id: number;

  @ApiProperty({ description: "Company name", example: "Acme Corporation" })
  name: string;

  @ApiProperty({ description: "Company slug", example: "acme-corp" })
  slug: string;

  @ApiProperty({
    description: "Company domain",
    example: "acme.com",
    required: false,
  })
  domain?: string;

  @ApiProperty({ description: "Company status", example: "ACTIVE" })
  status: string;

  @ApiProperty({ description: "Company settings", required: false })
  settings?: Record<string, any>;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;

  @ApiProperty({ description: "Number of users in company", required: false })
  userCount?: number;
}
