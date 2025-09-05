import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { EnhancedRateLimitGuard } from "../../common/guards/rate-limit.guard";
import { CompanyRegistrationRateLimit } from "../../common/decorators/rate-limit.decorator";
import { UseGuards } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { RegisterCompanyDto } from "./dto/register-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { CompanyResponseDto } from "./dto/company-response.dto";
import { RequireAuth } from "../../common/decorators/require-auth.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CacheKey, CacheTTL } from "../../common/decorators/cache.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Companies")
@Controller("companies")
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @RequireAuth("SUPERADMIN")
  @ApiOperation({ summary: "Create new company (SuperAdmin only)" })
  @ApiResponse({
    status: 201,
    description: "Company created successfully",
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 409, description: "Company already exists" })
  async create(
    @Body() createCompanyDto: CreateCompanyDto
  ): Promise<CompanyResponseDto> {
    return this.companiesService.create(createCompanyDto);
  }

  @Post("register")
  @Public()
  @UseGuards(EnhancedRateLimitGuard)
  @CompanyRegistrationRateLimit()
  @ApiOperation({
    summary: "Register new company with admin user (Public endpoint)",
  })
  @ApiResponse({
    status: 201,
    description: "Company and admin user registered successfully",
    schema: {
      type: "object",
      properties: {
        company: { $ref: "#/components/schemas/CompanyResponseDto" },
        adminUser: {
          type: "object",
          properties: {
            id: { type: "number" },
            email: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            systemRole: { type: "string" },
            status: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({
    status: 409,
    description: "Company or admin email already exists",
  })
  async register(@Body() registerCompanyDto: RegisterCompanyDto): Promise<{
    company: CompanyResponseDto;
    adminUser: any;
  }> {
    return this.companiesService.registerCompany(registerCompanyDto);
  }

  @Get()
  @RequireAuth("SUPERADMIN")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("companies:list:page:{query.page}:limit:{query.limit}")
  @CacheTTL(300) // 5 minutes
  @ApiOperation({
    summary: "Get all companies with pagination (SuperAdmin only)",
  })
  @ApiResponse({
    status: 200,
    description: "Companies retrieved successfully",
    type: [CompanyResponseDto],
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  async findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.companiesService.findAll(page, limit);
  }

  @Get("my-company")
  @RequireAuth("company.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("company:{companyId}:details")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Get current user's company details" })
  @ApiResponse({
    status: 200,
    description: "Company details retrieved successfully",
    type: CompanyResponseDto,
  })
  async getMyCompany(
    @CurrentUser("companyId") companyId: number
  ): Promise<CompanyResponseDto> {
    return this.companiesService.findOne(companyId);
  }

  @Get("search/slug/:slug")
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheKey("company:slug:{params.slug}")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Find company by slug (Public for registration)" })
  @ApiResponse({
    status: 200,
    description: "Company found",
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: "Company not found" })
  async findBySlug(@Param("slug") slug: string): Promise<CompanyResponseDto> {
    return this.companiesService.findBySlug(slug);
  }

  @Get("search/domain/:domain")
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheKey("company:domain:{params.domain}")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Find company by domain (Public for registration)" })
  @ApiResponse({
    status: 200,
    description: "Company found",
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: "Company not found" })
  async findByDomain(
    @Param("domain") domain: string
  ): Promise<CompanyResponseDto> {
    return this.companiesService.findByDomain(domain);
  }

  @Get(":id")
  @RequireAuth("SUPERADMIN")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("company:{params.id}:details")
  @CacheTTL(600) // 10 minutes
  @ApiOperation({ summary: "Get company by ID (SuperAdmin only)" })
  @ApiResponse({
    status: 200,
    description: "Company found",
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: "Company not found" })
  async findOne(
    @Param("id", ParseIntPipe) id: number
  ): Promise<CompanyResponseDto> {
    return this.companiesService.findOne(id);
  }

  @Patch("my-company")
  @RequireAuth("company.write")
  @ApiOperation({ summary: "Update current user's company" })
  @ApiResponse({
    status: 200,
    description: "Company updated successfully",
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: "Company not found" })
  async updateMyCompany(
    @CurrentUser("companyId") companyId: number,
    @Body() updateCompanyDto: UpdateCompanyDto
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(companyId, updateCompanyDto);
  }

  @Patch(":id")
  @RequireAuth("SUPERADMIN")
  @ApiOperation({ summary: "Update company (SuperAdmin only)" })
  @ApiResponse({
    status: 200,
    description: "Company updated successfully",
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: "Company not found" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCompanyDto: UpdateCompanyDto
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(":id")
  @RequireAuth("SUPERADMIN")
  @ApiOperation({ summary: "Delete company (SuperAdmin only)" })
  @ApiResponse({ status: 200, description: "Company deleted successfully" })
  @ApiResponse({ status: 404, description: "Company not found" })
  @ApiResponse({ status: 400, description: "Cannot delete company with users" })
  async remove(
    @Param("id", ParseIntPipe) id: number
  ): Promise<{ message: string }> {
    await this.companiesService.remove(id);
    return { message: "Company deleted successfully" };
  }

  @Get(":id/users")
  @RequireAuth("SUPERADMIN")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("company:{params.id}:users:page:{query.page}")
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get company users (SuperAdmin only)" })
  @ApiResponse({
    status: 200,
    description: "Company users retrieved successfully",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  async getCompanyUsers(
    @Param("id", ParseIntPipe) companyId: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.companiesService.getCompanyUsers(companyId, page, limit);
  }

  @Get("my-company/users")
  @RequireAuth("users.read")
  @UseInterceptors(CacheInterceptor)
  @CacheKey("company:{companyId}:users:page:{query.page}")
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get current company's users" })
  @ApiResponse({
    status: 200,
    description: "Company users retrieved successfully",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  async getMyCompanyUsers(
    @CurrentUser("companyId") companyId: number,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.companiesService.getCompanyUsers(companyId, page, limit);
  }
}
