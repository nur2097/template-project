import { PrismaClient, SystemUserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create default company
  const company = await prisma.company.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Company',
      slug: 'default',
      domain: 'example.com',
      status: 'ACTIVE',
      settings: {
        theme: 'default',
        features: ['logging', 'monitoring', 'rbac'],
      },
    },
  });

  // Create SUPERADMIN user
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      firstName: 'Super',
      lastName: 'Admin',
      password: superAdminPassword,
      systemRole: SystemUserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      companyId: company.id,
    },
  });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      password: adminPassword,
      systemRole: SystemUserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      companyId: company.id,
    },
  });

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      firstName: 'Regular',
      lastName: 'User',
      password: userPassword,
      systemRole: SystemUserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      companyId: company.id,
    },
  });

  // Create moderator user
  const modPassword = await bcrypt.hash('mod123', 10);
  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@example.com' },
    update: {},
    create: {
      email: 'moderator@example.com',
      firstName: 'Moderator',
      lastName: 'User',
      password: modPassword,
      systemRole: SystemUserRole.MODERATOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      companyId: company.id,
    },
  });

  // Create default roles and permissions
  await prisma.role.upsert({
    where: { name_companyId: { name: 'Company Admin', companyId: company.id } },
    update: {},
    create: {
      name: 'Company Admin',
      description: 'Full company access',
      companyId: company.id,
    },
  });

  await prisma.role.upsert({
    where: { name_companyId: { name: 'Company User', companyId: company.id } },
    update: {},
    create: {
      name: 'Company User',
      description: 'Basic user access',
      companyId: company.id,
    },
  });

  // Create permissions
  const permissions = [
    { name: 'users.read', resource: 'users', action: 'read' },
    { name: 'users.write', resource: 'users', action: 'write' },
    { name: 'users.delete', resource: 'users', action: 'delete' },
    { name: 'roles.read', resource: 'roles', action: 'read' },
    { name: 'roles.write', resource: 'roles', action: 'write' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name_companyId: { name: perm.name, companyId: company.id } },
      update: {},
      create: {
        name: perm.name,
        resource: perm.resource,
        action: perm.action,
        companyId: company.id,
      },
    });
  }

  console.log('✅ Seed completed');
  console.log('🏢 Created company:', company.name);
  console.log('👤 Created users:');
  console.log(`   SuperAdmin: ${superAdmin.email} (password: superadmin123)`);
  console.log(`   Admin: ${admin.email} (password: admin123)`);
  console.log(`   User: ${user.email} (password: user123)`);
  console.log(`   Moderator: ${moderator.email} (password: mod123)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });