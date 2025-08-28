import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

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
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      role: UserRole.MODERATOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Seed completed');
  console.log('👤 Created users:');
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