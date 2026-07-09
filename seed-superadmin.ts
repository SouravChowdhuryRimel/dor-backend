import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@example.com';
  const plainPassword = 'password123';

  // Check if exists
  let superAdmin = await prisma.user.findUnique({ where: { email } });
  
  if (superAdmin) {
    if (!superAdmin.roles.includes('SUPER_ADMIN' as any)) {
      superAdmin = await prisma.user.update({
        where: { email },
        data: {
          roles: {
            push: 'SUPER_ADMIN' as any
          }
        }
      });
      console.log(`User existed, but upgraded to SUPER_ADMIN. Email - ${email}`);
    } else {
      console.log(`Super admin already exists: Email - ${email}, ID - ${superAdmin.id}`);
    }
  } else {
    const hashedPassword = await argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    superAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        roles: ['SUPER_ADMIN' as any],
      },
    });
    console.log(`Super admin created: Email - ${email}, Password - ${plainPassword}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
