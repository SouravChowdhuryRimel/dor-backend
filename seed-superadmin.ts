import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@example.com';
  const phoneNumber = '01700000000';
  const plainPassword = 'password123';

  // Check if exists
  let superAdmin = await prisma.user.findUnique({ where: { phoneNumber } });
  
  if (superAdmin) {
    if (!superAdmin.roles.includes('SUPER_ADMIN' as any)) {
      superAdmin = await prisma.user.update({
        where: { phoneNumber },
        data: {
          roles: {
            push: 'SUPER_ADMIN' as any
          }
        }
      });
      console.log(`User existed, but upgraded to SUPER_ADMIN. Phone - ${phoneNumber}`);
    } else {
      console.log(`Super admin already exists: Phone - ${phoneNumber}, ID - ${superAdmin.id}`);
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
        phoneNumber,
        password: hashedPassword,
        name: 'Super Admin',
        roles: ['SUPER_ADMIN' as any],
      },
    });
    console.log(`Super admin created: Phone - ${phoneNumber}, Password - ${plainPassword}`);
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
