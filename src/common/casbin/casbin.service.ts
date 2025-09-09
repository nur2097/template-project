import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { newEnforcer, Enforcer } from "casbin";
import { join } from "path";
import { ConfigurationService } from "../../config/configuration.service";
import { PrismaService } from "../../shared/database/prisma.service";

@Injectable()
export class CasbinService implements OnModuleInit {
  private readonly logger = new Logger(CasbinService.name);
  private enforcer: Enforcer;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly prisma: PrismaService
  ) {}

  async onModuleInit() {
    await this.initializeEnforcer();
  }

  private async initializeEnforcer(): Promise<void> {
    try {
      const modelPath = join(process.cwd(), "casbin", "model.conf");
      const policyPath = join(process.cwd(), "casbin", "policy.csv");

      this.enforcer = await newEnforcer(modelPath, policyPath);

      // Load policies from database if needed
      await this.loadPoliciesFromDatabase();

      this.logger.log("✅ Casbin enforcer initialized successfully");
    } catch (error) {
      this.logger.error("❌ Failed to initialize Casbin enforcer:", error);
      throw error;
    }
  }

  /**
   * Check if user has permission for specific resource and action
   */
  async enforce(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      return await this.enforcer.enforce(userId, resource, action);
    } catch (error) {
      this.logger.error(
        `Failed to enforce permission for user ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Check if user has permission with role-based access
   */
  async enforceWithRole(
    userRole: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      return await this.enforcer.enforce(userRole, resource, action);
    } catch (error) {
      this.logger.error(
        `Failed to enforce permission for role ${userRole}:`,
        error
      );
      return false;
    }
  }

  /**
   * Add role for user
   */
  async addRoleForUser(userId: string, role: string): Promise<boolean> {
    try {
      const result = await this.enforcer.addRoleForUser(userId, role);
      if (result) {
        this.logger.log(`✅ Role '${role}' added for user '${userId}'`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to add role '${role}' for user '${userId}':`,
        error
      );
      return false;
    }
  }

  /**
   * Remove role from user
   */
  async deleteRoleForUser(userId: string, role: string): Promise<boolean> {
    try {
      const result = await this.enforcer.deleteRoleForUser(userId, role);
      if (result) {
        this.logger.log(`✅ Role '${role}' removed from user '${userId}'`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to remove role '${role}' from user '${userId}':`,
        error
      );
      return false;
    }
  }

  /**
   * Get roles for user
   */
  async getRolesForUser(userId: string): Promise<string[]> {
    try {
      return await this.enforcer.getRolesForUser(userId);
    } catch (error) {
      this.logger.error(`Failed to get roles for user '${userId}':`, error);
      return [];
    }
  }

  /**
   * Get users with specific role
   */
  async getUsersForRole(role: string): Promise<string[]> {
    try {
      return await this.enforcer.getUsersForRole(role);
    } catch (error) {
      this.logger.error(`Failed to get users for role '${role}':`, error);
      return [];
    }
  }

  /**
   * Add permission policy
   */
  async addPolicy(
    subject: string,
    object: string,
    action: string
  ): Promise<boolean> {
    try {
      const result = await this.enforcer.addPolicy(subject, object, action);
      if (result) {
        this.logger.log(`✅ Policy added: ${subject} can ${action} ${object}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to add policy:`, error);
      return false;
    }
  }

  /**
   * Remove permission policy
   */
  async removePolicy(
    subject: string,
    object: string,
    action: string
  ): Promise<boolean> {
    try {
      const result = await this.enforcer.removePolicy(subject, object, action);
      if (result) {
        this.logger.log(
          `✅ Policy removed: ${subject} can ${action} ${object}`
        );
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to remove policy:`, error);
      return false;
    }
  }

  /**
   * Get all subjects (users/roles)
   */
  async getAllSubjects(): Promise<string[]> {
    try {
      return await this.enforcer.getAllSubjects();
    } catch (error) {
      this.logger.error(`Failed to get all subjects:`, error);
      return [];
    }
  }

  /**
   * Get all objects (resources)
   */
  async getAllObjects(): Promise<string[]> {
    try {
      return await this.enforcer.getAllObjects();
    } catch (error) {
      this.logger.error(`Failed to get all objects:`, error);
      return [];
    }
  }

  /**
   * Get all actions
   */
  async getAllActions(): Promise<string[]> {
    try {
      return await this.enforcer.getAllActions();
    } catch (error) {
      this.logger.error(`Failed to get all actions:`, error);
      return [];
    }
  }

  /**
   * Load policies from database and sync with Casbin
   */
  private async loadPoliciesFromDatabase(): Promise<void> {
    try {
      // Get all companies with their roles and permissions
      const companies = await this.prisma.company.findMany({
        include: {
          roles: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          users: {
            include: {
              roles: {
                include: {
                  role: true,
                },
              },
            },
          },
        },
      });

      // Clear existing policies
      this.enforcer.clearPolicy();

      for (const company of companies) {
        // Add role-permission mappings
        for (const role of company.roles) {
          for (const rolePermission of role.permissions) {
            const permission = rolePermission.permission;
            const subject = `${company.slug}:${role.name}`;
            const object = permission.resource;
            const action = permission.action;

            await this.enforcer.addPolicy(subject, object, action);
          }
        }

        // Add user-role mappings
        for (const user of company.users) {
          for (const userRole of user.roles) {
            const userId = `${company.slug}:${user.id}`;
            const roleName = `${company.slug}:${userRole.role.name}`;

            await this.enforcer.addRoleForUser(userId, roleName);
          }
        }
      }

      this.logger.log("✅ Policies loaded from database successfully");
    } catch (error) {
      this.logger.error("❌ Failed to load policies from database:", error);
    }
  }

  /**
   * Sync policies with database
   */
  async syncPolicies(): Promise<void> {
    await this.loadPoliciesFromDatabase();
  }

  /**
   * Check permission for company-scoped user
   */
  async enforceForCompanyUser(
    companySlug: string,
    userId: number,
    resource: string,
    action: string
  ): Promise<boolean> {
    const subject = `${companySlug}:${userId}`;
    return this.enforce(subject, resource, action);
  }

  /**
   * Get enforcer instance (for advanced usage)
   */
  getEnforcer(): Enforcer {
    return this.enforcer;
  }
}
