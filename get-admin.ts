import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const superAdmin = await prisma.user.findFirst({ where: { roles: { has: 'SUPER_ADMIN' } } });
  console.log('Super Admin: ', superAdmin);
}
main();
