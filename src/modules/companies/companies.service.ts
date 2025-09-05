import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../shared/database/prisma.service";
import { CacheService } from "../../shared/cache/cache.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { RegisterCompanyDto } from "./dto/register-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { CompanyResponseDto } from "./dto/company-response.dto";
import { SystemUserRole } from "@prisma/client";
import { ValidationUtil } from "../../common/utils";
import { PasswordUtil } from "../../common/utils/password.util";
import {
  EntityNotFoundException,
  EntityAlreadyExistsException,
  InvalidDomainException,
  DataIntegrityException,
} from "../../common/exceptions";

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  async create(
    createCompanyDto: CreateCompanyDto
  ): Promise<CompanyResponseDto> {
    this.logger.debug(`Creating company: ${createCompanyDto.name}`);

    // Check if company with slug already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { slug: createCompanyDto.slug },
    });

    if (existingCompany) {
      throw new EntityAlreadyExistsException(
        "Company",
        "slug",
        createCompanyDto.slug,
        existingCompany.id
      );
    }

    // Check if domain is already used (if provided)
    if (createCompanyDto.domain) {
      if (!ValidationUtil.isValidDomain(createCompanyDto.domain)) {
        throw new InvalidDomainException(createCompanyDto.domain);
      }

      const existingDomain = await this.prisma.company.findUnique({
        where: { domain: createCompanyDto.domain },
      });

      if (existingDomain) {
        throw new EntityAlreadyExistsException(
          "Company",
          "domain",
          createCompanyDto.domain,
          existingDomain.id
        );
      }
    }

    try {
      const company = await this.prisma.company.create({
        data: createCompanyDto,
      });

      this.logger.log(
        `Company created successfully: ${company.name} (ID: ${company.id})`
      );

      return this.transformToCompanyResponse(company);
    } catch (error) {
      this.logger.error(`Failed to create company: ${error.message}`);
      throw error;
    }
  }

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
      throw new EntityAlreadyExistsException(
        "Company",
        "slug",
        registerCompanyDto.slug,
        existingCompany.id
      );
    }

    // Check if domain is already used (if provided)
    if (registerCompanyDto.domain) {
      if (!ValidationUtil.isValidDomain(registerCompanyDto.domain)) {
        throw new InvalidDomainException(registerCompanyDto.domain);
      }

      const existingDomain = await this.prisma.company.findUnique({
        where: { domain: registerCompanyDto.domain },
      });

      if (existingDomain) {
        throw new EntityAlreadyExistsException(
          "Company",
          "domain",
          registerCompanyDto.domain,
          existingDomain.id
        );
      }
    }

    // Check if admin email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerCompanyDto.adminEmail },
    });

    if (existingUser) {
      throw new EntityAlreadyExistsException(
        "User",
        "email",
        registerCompanyDto.adminEmail,
        existingUser.id
      );
    }

    // Validate admin password strength
    PasswordUtil.validatePassword(registerCompanyDto.adminPassword, undefined, {
      firstName: registerCompanyDto.adminFirstName,
      lastName: registerCompanyDto.adminLastName,
      email: registerCompanyDto.adminEmail,
    });

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

        // Hash admin password using PasswordUtil
        const hashedPassword = await PasswordUtil.hash(
          registerCompanyDto.adminPassword
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
      throw new DataIntegrityException("company registration", error.message);
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
      throw new EntityNotFoundException("Company", id.toString());
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
      throw new EntityNotFoundException("Company", slug);
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
      throw new EntityNotFoundException("Company", domain);
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
      throw new EntityNotFoundException("Company", id.toString());
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
        throw new EntityAlreadyExistsException(
          "Company",
          "slug",
          updateCompanyDto.slug,
          slugExists.id
        );
      }
    }

    // Check domain uniqueness if being updated
    if (
      updateCompanyDto.domain &&
      updateCompanyDto.domain !== existingCompany.domain
    ) {
      if (!ValidationUtil.isValidDomain(updateCompanyDto.domain)) {
        throw new InvalidDomainException(updateCompanyDto.domain);
      }

      const domainExists = await this.prisma.company.findUnique({
        where: { domain: updateCompanyDto.domain },
      });

      if (domainExists) {
        throw new EntityAlreadyExistsException(
          "Company",
          "domain",
          updateCompanyDto.domain,
          domainExists.id
        );
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
      throw new DataIntegrityException("company update", error.message);
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
      throw new EntityNotFoundException("Company", id.toString());
    }

    if (company._count.users > 0) {
      throw new DataIntegrityException(
        "company deletion",
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
      throw new DataIntegrityException("company deletion", error.message);
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
