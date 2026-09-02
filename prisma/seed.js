const { PrismaClient, Role } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await argon2.hash('123456');

  // 1. Ensure at least one Category exists (needed for Company and Party)
  let category = await prisma.category.findFirst();
  if (!category) {
    console.log('Creating default category...');
    category = await prisma.category.create({
      data: {
        categoryName: 'General Category',
      },
    });
  }

  // 2. Create Admin (User with ADMIN/SUPER_ADMIN roles)
  console.log('Upserting Admin user...');
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: '01600000000' },
    update: {
      password: hashedPassword,
      roles: [Role.ADMIN, Role.SUPER_ADMIN],
    },
    create: {
      phoneNumber: '01600000000',
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Seed Admin',
      roles: [Role.ADMIN, Role.SUPER_ADMIN],
      isActive: true,
    },
  });

  // Assign Category to Admin
  await prisma.adminCategory.upsert({
    where: {
      userId_categoryId: {
        userId: adminUser.id,
        categoryId: category.categoryId,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      categoryId: category.categoryId,
    },
  });

  // 3. Create Company
  console.log('Upserting Company...');
  await prisma.company.upsert({
    where: { email: 'company@example.com' },
    update: {
      phoneNumber: '01500000000',
      password: hashedPassword,
    },
    create: {
      phoneNumber: '01500000000',
      email: 'company@example.com',
      password: hashedPassword,
      companyName: 'Seed Company',
      ownerName: 'Seed Company Owner',
      district: 'Dhaka',
      upozela: 'Mirpur',
      latitude: 23.8103,
      longitude: 90.4125,
      address: 'Mirpur, Dhaka',
      categoryId: category.categoryId,
      isVerified: true,
      status: 'APPROVED',
    },
  });

  // 4. Create Customer / Party
  console.log('Upserting Customer / Party...');
  await prisma.party.upsert({
    where: { phoneNumber: '01400000000' },
    update: {
      password: hashedPassword,
    },
    create: {
      partyName: 'Seed Party',
      businessName: 'Seed Party Business',
      phoneNumber: '01400000000',
      email: 'party@example.com',
      password: hashedPassword,
      address: 'Uttara, Dhaka',
      district: 'Dhaka',
      upozela: 'Uttara',
      bazzarArea: 'Uttara Sector 3',
      description: 'Seed Customer Party Account',
      openingDue: 0,
      creditLimit: 100000,
      categoryId: category.categoryId,
      isVerified: true,
    },
  });

  // 5. Create Driver
  console.log('Upserting Driver...');
  await prisma.driver.upsert({
    where: { email: 'driver@example.com' },
    update: {
      phoneNumber: '01300000000',
      password: hashedPassword,
    },
    create: {
      phoneNumber: '01300000000',
      email: 'driver@example.com',
      password: hashedPassword,
      driverName: 'Seed Driver',
      address: 'Tejgaon, Dhaka',
      district: 'Dhaka',
      upozela: 'Tejgaon',
      drivingLicenceNumber: 'DL-SEED12345',
      nidNumber: 'NID-SEED12345',
      driverDocument: [],
      isVerified: true,
    },
  });

  console.log('Database seeding complete successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
