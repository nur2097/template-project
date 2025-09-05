import { ApiProperty } from "@nestjs/swagger";
import { StandardResponseDto, ErrorResponseDto } from "./standard-response.dto";

export class CompanyDto {
  @ApiProperty({
    description: "Company unique identifier",
    example: "comp_123456",
  })
  id: string;

  @ApiProperty({
    description: "Company name",
    example: "Acme Corporation",
  })
  name: string;

  @ApiProperty({
    description: "Company domain",
    example: "acme.com",
  })
  domain: string;

  @ApiProperty({
    description: "Company industry",
    example: "Technology",
  })
  industry: string;

  @ApiProperty({
    description: "Company size category",
    enum: ["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"],
    example: "MEDIUM",
  })
  size: string;

  @ApiProperty({
    description: "Company status",
    enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"],
    example: "ACTIVE",
  })
  status: string;

  @ApiProperty({
    description: "Company settings",
    type: "object",
  })
  settings: {
    maxUsers: number;
    features: string[];
    subscriptionTier: string;
  };

  @ApiProperty({
    description: "Company creation timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  createdAt: string;

  @ApiProperty({
    description: "Company last update timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  updatedAt: string;
}

export class CompanyStatsDto {
  @ApiProperty({
    description: "Total number of users",
    example: 25,
  })
  totalUsers: number;

  @ApiProperty({
    description: "Number of active users",
    example: 22,
  })
  activeUsers: number;

  @ApiProperty({
    description: "Number of admin users",
    example: 3,
  })
  adminUsers: number;

  @ApiProperty({
    description: "Total number of roles",
    example: 8,
  })
  totalRoles: number;

  @ApiProperty({
    description: "Storage usage in bytes",
    example: 1073741824,
  })
  storageUsage: number;

  @ApiProperty({
    description: "API requests this month",
    example: 15432,
  })
  apiRequestsThisMonth: number;
}

export class CompanyWithStatsDto extends CompanyDto {
  @ApiProperty({
    description: "Company statistics",
    type: CompanyStatsDto,
  })
  stats: CompanyStatsDto;
}

export class PaginatedCompaniesDto {
  @ApiProperty({
    description: "List of companies",
    type: [CompanyDto],
  })
  companies: CompanyDto[];

  @ApiProperty({
    description: "Total number of companies",
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: "Current page number",
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: "Number of items per page",
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: "Total number of pages",
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: "Whether there is a next page",
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: "Whether there is a previous page",
    example: false,
  })
  hasPrev: boolean;
}

// Response DTOs
export class CompanyResponseDto extends StandardResponseDto<CompanyDto> {
  @ApiProperty({ type: CompanyDto })
  data: CompanyDto;
}

export class CompanyWithStatsResponseDto extends StandardResponseDto<CompanyWithStatsDto> {
  @ApiProperty({ type: CompanyWithStatsDto })
  data: CompanyWithStatsDto;
}

export class CompaniesListResponseDto extends StandardResponseDto<PaginatedCompaniesDto> {
  @ApiProperty({ type: PaginatedCompaniesDto })
  data: PaginatedCompaniesDto;
}

export class CompanyCreatedResponseDto extends StandardResponseDto<CompanyDto> {
  @ApiProperty({ type: CompanyDto })
  data: CompanyDto;
}

export class CompanyUpdatedResponseDto extends StandardResponseDto<CompanyDto> {
  @ApiProperty({ type: CompanyDto })
  data: CompanyDto;
}

export class CompanyDeletedResponseDto extends StandardResponseDto<{
  deletedAt: string;
}> {
  @ApiProperty({
    type: "object",
    properties: {
      deletedAt: { type: "string", format: "date-time" },
    },
  })
  data: { deletedAt: string };
}

// Error Response DTOs
export class CompanyErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: "Company-specific error codes",
    enum: [
      "COMPANY_NOT_FOUND",
      "COMPANY_ALREADY_EXISTS",
      "COMPANY_DOMAIN_IN_USE",
      "COMPANY_INACTIVE",
      "COMPANY_SUSPENDED",
      "USER_LIMIT_EXCEEDED",
      "INVALID_COMPANY_SIZE",
      "COMPANY_DELETION_RESTRICTED",
    ],
    example: "COMPANY_NOT_FOUND",
  })
  errorCode: string;
}
