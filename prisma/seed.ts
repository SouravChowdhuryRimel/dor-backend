import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const phone = process.env.SUPERADMIN_PHONE;
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!phone || !email || !password) {
    console.warn(
      'Super Admin init credentials missing from environment. Skipping seed.',
    );
    return;
  }

  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ phone }, { email }],
    },
  });

  if (existingSuperAdmin) {
    console.log('Super Admin user already exists. Skipping seed.');
    return;
  }

  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
  });

  await prisma.user.create({
    data: {
      phone,
      email,
      password: hashedPassword,
      name,
      roles: [Role.SUPER_ADMIN],
    },
  });

  console.log('Super Admin user successfully seeded.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
