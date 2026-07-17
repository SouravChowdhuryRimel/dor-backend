import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/database.service';
import { Prisma, User, Role } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  async onApplicationBootstrap() {
    this.logger.log('Checking for Super Admin existence...');
    const superAdmin = await this.prisma.user.findFirst({
      where: {
        roles: {
          has: Role.SUPER_ADMIN,
        },
      },
      select: {
        id: true,
      },
    });

    if (!superAdmin) {
      this.logger.log(
        'Super Admin not found. Seeding from environment variables...',
      );
      const email =
        this.configService.get<string>('SUPER_ADMIN_EMAIL') ||
        'superadmin@example.com';
      const phoneNumber =
        this.configService.get<string>('SUPER_ADMIN_PHONE') ||
        '01700000000';
      const password =
        this.configService.get<string>('SUPER_ADMIN_PASSWORD') || 'password123';

      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
      });

      await this.prisma.user.create({
        data: {
          email,
          phoneNumber,
          password: hashedPassword,
          name: 'Super Admin',
          roles: [Role.SUPER_ADMIN],
        },
      });
      this.logger.log(`Super Admin created successfully with phone: ${phoneNumber}`);
      this.logger.log('--- EXAMPLE LOGIN ROUTE ---');
      this.logger.log(
        `curl -X POST http://localhost:3000/api/v1/auth/signin \\`,
      );
      this.logger.log(`  -H "Content-Type: application/json" \\`);
      this.logger.log(
        `  -d '{"phoneNumber": "${phoneNumber}", "password": "${password}"}'`,
      );
      this.logger.log('---------------------------');
    } else {
      this.logger.log('Super Admin already exists.');
    }
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async createAdmin(data: Prisma.UserCreateInput): Promise<User> {
    const hashedPassword = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        roles: [Role.ADMIN],
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        roles: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      } as Prisma.UserSelect,
    }) as unknown as Promise<User>;
  }

  async findAllAdmins(): Promise<Partial<User>[]> {
    return this.prisma.user.findMany({
      where: {
        roles: {
          has: Role.ADMIN,
        },
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        roles: true,
        categoryId: true,
        category: {
          select: {
            categoryId: true,
            title: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
