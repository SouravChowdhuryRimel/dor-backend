import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/core/database/database.service';
import * as argon2 from 'argon2';
import { Role } from './src/common/constants/role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const email = 'superadmin@example.com';
  const plainPassword = 'password123';
  
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (user) {
    if (!user.roles.includes('SUPER_ADMIN' as any)) {
      await prisma.user.update({
        where: { email },
        data: { roles: { push: 'SUPER_ADMIN' as any } }
      });
      console.log('Upgraded existing user to SUPER_ADMIN.');
    } else {
      console.log('SUPER_ADMIN already exists!');
    }
  } else {
    const hashedPassword = await argon2.hash(plainPassword);
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Super Admin',
        roles: ['SUPER_ADMIN' as any],
      }
    });
    console.log('Successfully created SUPER_ADMIN!');
  }
  
  console.log(`Email: ${email}`);
  console.log(`Password: ${plainPassword}`);

  await app.close();
}

bootstrap();
