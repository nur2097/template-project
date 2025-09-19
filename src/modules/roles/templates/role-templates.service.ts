import { Injectable } from "@nestjs/common";
import { SystemUserRole } from "@prisma/client";

export interface PermissionTemplate {
  name: string;
  description: string;
  resource: string;
  action: string;
  category: string;
}

export interface RoleTemplate {
  name: string;
  description: string;
  systemRole?: SystemUserRole;
  permissions: PermissionTemplate[];
  category:
    | "administration"
    | "management"
    | "operations"
    | "support"
    | "custom";
  isDefault?: boolean;
}

@Injectable()
export class RoleTemplatesService {
  /**
   * Get all available role templates
   */
  getAvailableTemplates(): RoleTemplate[] {
    return [
      ...this.getAdministrativeTemplates(),
      ...this.getManagementTemplates(),
      ...this.getOperationalTemplates(),
      ...this.getSupportTemplates(),
    ];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): RoleTemplate[] {
    return this.getAvailableTemplates().filter(
      (template) => template.category === category
    );
  }

  /**
   * Get template by name
   */
  getTemplateByName(name: string): RoleTemplate | undefined {
    return this.getAvailableTemplates().find(
      (template) => template.name === name
    );
  }

  /**
   * Get default permission categories
   */
  getPermissionCategories(): Record<string, PermissionTemplate[]> {
    const allTemplates = this.getAvailableTemplates();
    const allPermissions = allTemplates.flatMap((t) => t.permissions);

    return allPermissions.reduce(
      (acc, permission) => {
        if (!acc[permission.category]) {
          acc[permission.category] = [];
        }

        // Avoid duplicates
        const exists = acc[permission.category].some(
          (p) =>
            p.name === permission.name && p.resource === permission.resource
        );

        if (!exists) {
          acc[permission.category].push(permission);
        }

        return acc;
      },
      {} as Record<string, PermissionTemplate[]>
    );
  }

  /**
   * Administrative role templates
   */
  private getAdministrativeTemplates(): RoleTemplate[] {
    return [
      {
        name: "Super Administrator",
        description: "Full system access with all permissions",
        systemRole: SystemUserRole.SUPERADMIN,
        category: "administration",
        isDefault: true,
        permissions: [
          // System Administration
          {
            name: "system.admin",
            description: "Full system administration",
            resource: "system",
            action: "admin",
            category: "System Administration",
          },
          {
            name: "users.admin",
            description: "Full user management",
            resource: "users",
            action: "admin",
            category: "User Management",
          },
          {
            name: "companies.admin",
            description: "Full company management",
            resource: "companies",
            action: "admin",
            category: "Company Management",
          },
          {
            name: "roles.admin",
            description: "Full role and permission management",
            resource: "roles",
            action: "admin",
            category: "Access Control",
          },

          // Data Management
          {
            name: "data.export",
            description: "Export all data",
            resource: "data",
            action: "export",
            category: "Data Management",
          },
          {
            name: "data.import",
            description: "Import data",
            resource: "data",
            action: "import",
            category: "Data Management",
          },
          {
            name: "data.backup",
            description: "Create and restore backups",
            resource: "data",
            action: "backup",
            category: "Data Management",
          },

          // Security
          {
            name: "security.audit",
            description: "View security logs and audits",
            resource: "security",
            action: "audit",
            category: "Security",
          },
          {
            name: "security.config",
            description: "Configure security settings",
            resource: "security",
            action: "config",
            category: "Security",
          },
        ],
      },
      {
        name: "Company Administrator",
        description: "Full administrative access within company",
        systemRole: SystemUserRole.ADMIN,
        category: "administration",
        isDefault: true,
        permissions: [
          // User Management
          {
            name: "users.read",
            description: "View company users",
            resource: "users",
            action: "read",
            category: "User Management",
          },
          {
            name: "users.write",
            description: "Create and update users",
            resource: "users",
            action: "write",
            category: "User Management",
          },
          {
            name: "users.delete",
            description: "Delete users",
            resource: "users",
            action: "delete",
            category: "User Management",
          },
          {
            name: "users.invite",
            description: "Invite new users",
            resource: "users",
            action: "invite",
            category: "User Management",
          },

          // Role Management
          {
            name: "roles.read",
            description: "View roles and permissions",
            resource: "roles",
            action: "read",
            category: "Access Control",
          },
          {
            name: "roles.write",
            description: "Manage roles and permissions",
            resource: "roles",
            action: "write",
            category: "Access Control",
          },
          {
            name: "roles.assign",
            description: "Assign roles to users",
            resource: "roles",
            action: "assign",
            category: "Access Control",
          },

          // Company Settings
          {
            name: "company.read",
            description: "View company details",
            resource: "company",
            action: "read",
            category: "Company Management",
          },
          {
            name: "company.write",
            description: "Update company settings",
            resource: "company",
            action: "write",
            category: "Company Management",
          },
          {
            name: "company.billing",
            description: "Manage billing and subscriptions",
            resource: "company",
            action: "billing",
            category: "Company Management",
          },

          // Reports and Analytics
          {
            name: "reports.read",
            description: "View company reports",
            resource: "reports",
            action: "read",
            category: "Analytics",
          },
          {
            name: "analytics.read",
            description: "View analytics dashboard",
            resource: "analytics",
            action: "read",
            category: "Analytics",
          },
        ],
      },
    ];
  }

  /**
   * Management role templates
   */
  private getManagementTemplates(): RoleTemplate[] {
    return [
      {
        name: "Team Manager",
        description: "Manage team members and projects",
        systemRole: SystemUserRole.MODERATOR,
        category: "management",
        isDefault: true,
        permissions: [
          // Team Management
          {
            name: "users.read",
            description: "View team members",
            resource: "users",
            action: "read",
            category: "User Management",
          },
          {
            name: "users.write",
            description: "Update team member profiles",
            resource: "users",
            action: "write",
            category: "User Management",
          },
          {
            name: "users.invite",
            description: "Invite team members",
            resource: "users",
            action: "invite",
            category: "User Management",
          },

          // Project Management
          {
            name: "projects.read",
            description: "View all projects",
            resource: "projects",
            action: "read",
            category: "Project Management",
          },
          {
            name: "projects.write",
            description: "Create and update projects",
            resource: "projects",
            action: "write",
            category: "Project Management",
          },
          {
            name: "projects.assign",
            description: "Assign users to projects",
            resource: "projects",
            action: "assign",
            category: "Project Management",
          },

          // Task Management
          {
            name: "tasks.read",
            description: "View all tasks",
            resource: "tasks",
            action: "read",
            category: "Task Management",
          },
          {
            name: "tasks.write",
            description: "Create and update tasks",
            resource: "tasks",
            action: "write",
            category: "Task Management",
          },
          {
            name: "tasks.assign",
            description: "Assign tasks to team members",
            resource: "tasks",
            action: "assign",
            category: "Task Management",
          },

          // Reporting
          {
            name: "reports.read",
            description: "View team reports",
            resource: "reports",
            action: "read",
            category: "Analytics",
          },
          {
            name: "reports.team",
            description: "Generate team performance reports",
            resource: "reports",
            action: "team",
            category: "Analytics",
          },
        ],
      },
      {
        name: "Department Head",
        description: "Departmental oversight and management",
        systemRole: SystemUserRole.MODERATOR,
        category: "management",
        permissions: [
          // Department Management
          {
            name: "department.read",
            description: "View department information",
            resource: "department",
            action: "read",
            category: "Department Management",
          },
          {
            name: "department.write",
            description: "Update department settings",
            resource: "department",
            action: "write",
            category: "Department Management",
          },
          {
            name: "department.budget",
            description: "Manage department budget",
            resource: "department",
            action: "budget",
            category: "Department Management",
          },

          // Staff Management
          {
            name: "users.read",
            description: "View department staff",
            resource: "users",
            action: "read",
            category: "User Management",
          },
          {
            name: "users.evaluate",
            description: "Evaluate staff performance",
            resource: "users",
            action: "evaluate",
            category: "User Management",
          },
          {
            name: "users.approve",
            description: "Approve staff requests",
            resource: "users",
            action: "approve",
            category: "User Management",
          },

          // Strategic Planning
          {
            name: "planning.read",
            description: "View strategic plans",
            resource: "planning",
            action: "read",
            category: "Strategic Planning",
          },
          {
            name: "planning.write",
            description: "Create and update plans",
            resource: "planning",
            action: "write",
            category: "Strategic Planning",
          },

          // Advanced Reporting
          {
            name: "reports.advanced",
            description: "Access advanced reporting",
            resource: "reports",
            action: "advanced",
            category: "Analytics",
          },
          {
            name: "analytics.department",
            description: "Department analytics",
            resource: "analytics",
            action: "department",
            category: "Analytics",
          },
        ],
      },
    ];
  }

  /**
   * Operational role templates
   */
  private getOperationalTemplates(): RoleTemplate[] {
    return [
      {
        name: "Standard User",
        description: "Basic user access with standard permissions",
        systemRole: SystemUserRole.USER,
        category: "operations",
        isDefault: true,
        permissions: [
          // Basic Access
          {
            name: "profile.read",
            description: "View own profile",
            resource: "profile",
            action: "read",
            category: "Profile Management",
          },
          {
            name: "profile.write",
            description: "Update own profile",
            resource: "profile",
            action: "write",
            category: "Profile Management",
          },

          // Content Access
          {
            name: "content.read",
            description: "View assigned content",
            resource: "content",
            action: "read",
            category: "Content Management",
          },
          {
            name: "content.comment",
            description: "Comment on content",
            resource: "content",
            action: "comment",
            category: "Content Management",
          },

          // Task Participation
          {
            name: "tasks.read",
            description: "View assigned tasks",
            resource: "tasks",
            action: "read",
            category: "Task Management",
          },
          {
            name: "tasks.update",
            description: "Update task status",
            resource: "tasks",
            action: "update",
            category: "Task Management",
          },

          // Communication
          {
            name: "messages.read",
            description: "Read messages",
            resource: "messages",
            action: "read",
            category: "Communication",
          },
          {
            name: "messages.write",
            description: "Send messages",
            resource: "messages",
            action: "write",
            category: "Communication",
          },
        ],
      },
      {
        name: "Content Editor",
        description: "Content creation and editing permissions",
        systemRole: SystemUserRole.USER,
        category: "operations",
        permissions: [
          // Content Management
          {
            name: "content.read",
            description: "View all content",
            resource: "content",
            action: "read",
            category: "Content Management",
          },
          {
            name: "content.write",
            description: "Create and edit content",
            resource: "content",
            action: "write",
            category: "Content Management",
          },
          {
            name: "content.publish",
            description: "Publish content",
            resource: "content",
            action: "publish",
            category: "Content Management",
          },
          {
            name: "content.moderate",
            description: "Moderate user content",
            resource: "content",
            action: "moderate",
            category: "Content Management",
          },

          // Media Management
          {
            name: "media.read",
            description: "View media library",
            resource: "media",
            action: "read",
            category: "Media Management",
          },
          {
            name: "media.upload",
            description: "Upload media files",
            resource: "media",
            action: "upload",
            category: "Media Management",
          },
          {
            name: "media.organize",
            description: "Organize media library",
            resource: "media",
            action: "organize",
            category: "Media Management",
          },

          // Basic User Permissions
          {
            name: "profile.read",
            description: "View own profile",
            resource: "profile",
            action: "read",
            category: "Profile Management",
          },
          {
            name: "profile.write",
            description: "Update own profile",
            resource: "profile",
            action: "write",
            category: "Profile Management",
          },
        ],
      },
      {
        name: "Project Coordinator",
        description: "Coordinate projects and team activities",
        systemRole: SystemUserRole.USER,
        category: "operations",
        permissions: [
          // Project Coordination
          {
            name: "projects.read",
            description: "View assigned projects",
            resource: "projects",
            action: "read",
            category: "Project Management",
          },
          {
            name: "projects.coordinate",
            description: "Coordinate project activities",
            resource: "projects",
            action: "coordinate",
            category: "Project Management",
          },
          {
            name: "projects.schedule",
            description: "Manage project schedules",
            resource: "projects",
            action: "schedule",
            category: "Project Management",
          },

          // Task Coordination
          {
            name: "tasks.read",
            description: "View all project tasks",
            resource: "tasks",
            action: "read",
            category: "Task Management",
          },
          {
            name: "tasks.coordinate",
            description: "Coordinate task assignments",
            resource: "tasks",
            action: "coordinate",
            category: "Task Management",
          },
          {
            name: "tasks.track",
            description: "Track task progress",
            resource: "tasks",
            action: "track",
            category: "Task Management",
          },

          // Communication
          {
            name: "communications.read",
            description: "View project communications",
            resource: "communications",
            action: "read",
            category: "Communication",
          },
          {
            name: "communications.send",
            description: "Send project updates",
            resource: "communications",
            action: "send",
            category: "Communication",
          },

          // Basic Reporting
          {
            name: "reports.project",
            description: "Generate project reports",
            resource: "reports",
            action: "project",
            category: "Analytics",
          },
        ],
      },
    ];
  }

  /**
   * Support role templates
   */
  private getSupportTemplates(): RoleTemplate[] {
    return [
      {
        name: "Customer Support",
        description: "Customer service and support permissions",
        systemRole: SystemUserRole.USER,
        category: "support",
        permissions: [
          // Customer Management
          {
            name: "customers.read",
            description: "View customer information",
            resource: "customers",
            action: "read",
            category: "Customer Management",
          },
          {
            name: "customers.communicate",
            description: "Communicate with customers",
            resource: "customers",
            action: "communicate",
            category: "Customer Management",
          },

          // Support Tickets
          {
            name: "tickets.read",
            description: "View support tickets",
            resource: "tickets",
            action: "read",
            category: "Support Management",
          },
          {
            name: "tickets.write",
            description: "Create and update tickets",
            resource: "tickets",
            action: "write",
            category: "Support Management",
          },
          {
            name: "tickets.assign",
            description: "Assign tickets to team members",
            resource: "tickets",
            action: "assign",
            category: "Support Management",
          },
          {
            name: "tickets.resolve",
            description: "Resolve support tickets",
            resource: "tickets",
            action: "resolve",
            category: "Support Management",
          },

          // Knowledge Base
          {
            name: "knowledge.read",
            description: "Access knowledge base",
            resource: "knowledge",
            action: "read",
            category: "Knowledge Management",
          },
          {
            name: "knowledge.write",
            description: "Create and edit knowledge articles",
            resource: "knowledge",
            action: "write",
            category: "Knowledge Management",
          },

          // Basic User Permissions
          {
            name: "profile.read",
            description: "View own profile",
            resource: "profile",
            action: "read",
            category: "Profile Management",
          },
          {
            name: "profile.write",
            description: "Update own profile",
            resource: "profile",
            action: "write",
            category: "Profile Management",
          },
        ],
      },
      {
        name: "Technical Support",
        description: "Technical support and system maintenance",
        systemRole: SystemUserRole.USER,
        category: "support",
        permissions: [
          // System Access
          {
            name: "system.read",
            description: "View system information",
            resource: "system",
            action: "read",
            category: "System Management",
          },
          {
            name: "system.diagnose",
            description: "Diagnose system issues",
            resource: "system",
            action: "diagnose",
            category: "System Management",
          },
          {
            name: "system.maintenance",
            description: "Perform system maintenance",
            resource: "system",
            action: "maintenance",
            category: "System Management",
          },

          // Technical Support
          {
            name: "support.technical",
            description: "Provide technical support",
            resource: "support",
            action: "technical",
            category: "Support Management",
          },
          {
            name: "support.escalate",
            description: "Escalate support issues",
            resource: "support",
            action: "escalate",
            category: "Support Management",
          },

          // Logs and Monitoring
          {
            name: "logs.read",
            description: "View system logs",
            resource: "logs",
            action: "read",
            category: "System Management",
          },
          {
            name: "monitoring.read",
            description: "View system monitoring",
            resource: "monitoring",
            action: "read",
            category: "System Management",
          },

          // User Assistance
          {
            name: "users.assist",
            description: "Assist users with technical issues",
            resource: "users",
            action: "assist",
            category: "User Management",
          },
          {
            name: "users.impersonate",
            description: "Temporarily access user accounts for support",
            resource: "users",
            action: "impersonate",
            category: "User Management",
          },
        ],
      },
    ];
  }

  /**
   * Create company-specific role from template
   */
  async applyRoleTemplate(
    templateName: string,
    customizations?: {
      name?: string;
      description?: string;
      additionalPermissions?: PermissionTemplate[];
      excludePermissions?: string[];
    }
  ) {
    const template = this.getTemplateByName(templateName);

    if (!template) {
      throw new Error(`Role template '${templateName}' not found`);
    }

    // Apply customizations
    let permissions = [...template.permissions];

    if (customizations?.excludePermissions?.length) {
      permissions = permissions.filter(
        (p) => !customizations.excludePermissions.includes(p.name)
      );
    }

    if (customizations?.additionalPermissions?.length) {
      permissions.push(...customizations.additionalPermissions);
    }

    return {
      name: customizations?.name || template.name,
      description: customizations?.description || template.description,
      systemRole: template.systemRole,
      permissions,
      template: templateName,
    };
  }

  /**
   * Get recommended templates based on company size and industry
   */
  getRecommendedTemplates(companySize: "small" | "medium" | "large"): string[] {
    const baseTemplates = ["Company Administrator", "Standard User"];

    if (companySize === "small") {
      return [...baseTemplates, "Team Manager"];
    } else if (companySize === "medium") {
      return [
        ...baseTemplates,
        "Team Manager",
        "Content Editor",
        "Customer Support",
      ];
    } else {
      return [
        ...baseTemplates,
        "Team Manager",
        "Department Head",
        "Content Editor",
        "Project Coordinator",
        "Customer Support",
        "Technical Support",
      ];
    }
  }
}
