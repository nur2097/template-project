import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";
import { CacheService } from "../../shared/cache/cache.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { RegisterCompanyDto } from "./dto/register-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { CompanyResponseDto } from "./dto/company-response.dto";
import { SystemUserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async registerCompany(registerCompanyDto: RegisterCompanyDto): Promise<{
    company: CompanyResponseDto;
    adminUser: any;
  }> {
    this.logger.debug(`Registering company: ${registerCompanyDto.name}`);

    // Check if company with slug already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { slug: registerCompanyDto.slug },
    });

    if (existingCompany) {
      throw new ConflictException("Company with this slug already exists");
    }

    // Check if domain is already used (if provided)
    if (registerCompanyDto.domain) {
      const existingDomain = await this.prisma.company.findUnique({
        where: { domain: registerCompanyDto.domain },
      });

      if (existingDomain) {
        throw new ConflictException("Company with this domain already exists");
      }
    }

    // Check if admin email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerCompanyDto.adminEmail },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Use transaction to ensure data consistency
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create company
        const company = await prisma.company.create({
          data: {
            name: registerCompanyDto.name,
            slug: registerCompanyDto.slug,
            domain: registerCompanyDto.domain,
            settings: registerCompanyDto.settings || {},
            status: "ACTIVE",
          },
          include: {
            _count: {
              select: { users: true },
            },
          },
        });

        // Hash admin password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(
          registerCompanyDto.adminPassword,
          saltRounds
        );

        // Create admin user
        const adminUser = await prisma.user.create({
          data: {
            email: registerCompanyDto.adminEmail,
            firstName: registerCompanyDto.adminFirstName,
            lastName: registerCompanyDto.adminLastName,
            password: hashedPassword,
            phoneNumber: registerCompanyDto.adminPhoneNumber,
            systemRole: SystemUserRole.ADMIN,
            companyId: company.id,
            status: "ACTIVE",
            emailVerified: false,
          },
        });

        // Create default permissions for the company
        const defaultPermissions = [
          {
            name: "users.read",
            resource: "users",
            action: "read",
            description: "View users",
          },
          {
            name: "users.write",
            resource: "users",
            action: "write",
            description: "Create and update users",
          },
          {
            name: "users.delete",
            resource: "users",
            action: "delete",
            description: "Delete users",
          },
          {
            name: "roles.read",
            resource: "roles",
            action: "read",
            description: "View roles and permissions",
          },
          {
            name: "roles.write",
            resource: "roles",
            action: "write",
            description: "Manage roles and permissions",
          },
          {
            name: "company.read",
            resource: "company",
            action: "read",
            description: "View company details",
          },
          {
            name: "company.write",
            resource: "company",
            action: "write",
            description: "Update company settings",
          },
        ];

        const createdPermissions = await Promise.all(
          defaultPermissions.map(async (perm) =>
            prisma.permission.create({
              data: {
                name: perm.name,
                description: perm.description,
                resource: perm.resource,
                action: perm.action,
                companyId: company.id,
              },
            })
          )
        );

        // Create default admin role
        const adminRole = await prisma.role.create({
          data: {
            name: "Company Admin",
            description: "Full administrative access to company resources",
            companyId: company.id,
          },
        });

        // Assign all permissions to admin role
        await Promise.all(
          createdPermissions.map(async (permission) =>
            prisma.rolePermission.create({
              data: {
                roleId: adminRole.id,
                permissionId: permission.id,
              },
            })
          )
        );

        // Assign admin role to admin user
        await prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id,
          },
        });

        return { company, adminUser };
      });

      // Transform response
      const companyResponse = this.transformToCompanyResponse(result.company);

      // Remove sensitive data from admin user
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...adminUserSafe } = result.adminUser;

      this.logger.log(
        `Company registered successfully: ${registerCompanyDto.name} with admin: ${registerCompanyDto.adminEmail}`
      );

      return {
        company: companyResponse,
        adminUser: adminUserSafe,
      };
    } catch (error) {
      this.logger.error(`Failed to register company: ${error.message}`);
      throw new BadRequestException("Failed to register company");
    }
  }

  async create(
    createCompanyDto: CreateCompanyDto,
    creatorUserId?: number
  ): Promise<CompanyResponseDto> {
    this.logger.debug(`Creating company: ${createCompanyDto.name}`);

    // Check if company with slug already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { slug: createCompanyDto.slug },
    });

    if (existingCompany) {
      throw new ConflictException("Company with this slug already exists");
    }

    // Check if domain is already used (if provided)
    if (createCompanyDto.domain) {
      const existingDomain = await this.prisma.company.findUnique({
        where: { domain: createCompanyDto.domain },
      });

      if (existingDomain) {
        throw new ConflictException("Company with this domain already exists");
      }
    }

    try {
      const company = await this.prisma.company.create({
        data: {
          name: createCompanyDto.name,
          slug: createCompanyDto.slug,
          domain: createCompanyDto.domain,
          settings: createCompanyDto.settings || {},
          status: "ACTIVE",
        },
        include: {
          _count: {
            select: { users: true },
          },
        },
      });

      // If creatorUserId is provided, update user's company
      if (creatorUserId) {
        await this.prisma.user.update({
          where: { id: creatorUserId },
          data: { companyId: company.id },
        });

        // Invalidate user cache
        await this.cacheService.invalidateUserCache(creatorUserId);
      }

      return this.transformToCompanyResponse(company);
    } catch (error) {
      this.logger.error(`Failed to create company: ${error.message}`);
      throw new BadRequestException("Failed to create company");
    }
  }

  async findAll(
    page = 1,
    limit = 10
  ): Promise<{
    data: CompanyResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { users: true },
          },
        },
      }),
      this.prisma.company.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: companies.map((company) =>
        this.transformToCompanyResponse(company)
      ),
      meta: { total, page, limit, totalPages },
    };
  }

  async findOne(id: number): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return this.transformToCompanyResponse(company);
  }

  async findBySlug(slug: string): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with slug ${slug} not found`);
    }

    return this.transformToCompanyResponse(company);
  }

  async findByDomain(domain: string): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { domain },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with domain ${domain} not found`);
    }

    return this.transformToCompanyResponse(company);
  }

  async update(
    id: number,
    updateCompanyDto: UpdateCompanyDto
  ): Promise<CompanyResponseDto> {
    const existingCompany = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Check slug uniqueness if being updated
    if (
      updateCompanyDto.slug &&
      updateCompanyDto.slug !== existingCompany.slug
    ) {
      const slugExists = await this.prisma.company.findUnique({
        where: { slug: updateCompanyDto.slug },
      });

      if (slugExists) {
        throw new ConflictException("Company with this slug already exists");
      }
    }

    // Check domain uniqueness if being updated
    if (
      updateCompanyDto.domain &&
      updateCompanyDto.domain !== existingCompany.domain
    ) {
      const domainExists = await this.prisma.company.findUnique({
        where: { domain: updateCompanyDto.domain },
      });

      if (domainExists) {
        throw new ConflictException("Company with this domain already exists");
      }
    }

    try {
      const updatedCompany = await this.prisma.company.update({
        where: { id },
        data: updateCompanyDto,
        include: {
          _count: {
            select: { users: true },
          },
        },
      });

      // Invalidate company cache
      await this.cacheService.invalidateCompanyCache(id);

      return this.transformToCompanyResponse(updatedCompany);
    } catch (error) {
      this.logger.error(`Failed to update company ${id}: ${error.message}`);
      throw new BadRequestException("Failed to update company");
    }
  }

  async remove(id: number): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    if (company._count.users > 0) {
      throw new BadRequestException(
        "Cannot delete company with existing users"
      );
    }

    try {
      await this.prisma.company.delete({
        where: { id },
      });

      // Invalidate company cache
      await this.cacheService.invalidateCompanyCache(id);
    } catch (error) {
      this.logger.error(`Failed to delete company ${id}: ${error.message}`);
      throw new BadRequestException("Failed to delete company");
    }
  }

  async getCompanyUsers(companyId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { companyId },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          systemRole: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where: { companyId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      meta: { total, page, limit, totalPages },
    };
  }

  private transformToCompanyResponse(company: any): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      domain: company.domain,
      status: company.status,
      settings: company.settings,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      userCount: company._count?.users || 0,
    };
  }
}
