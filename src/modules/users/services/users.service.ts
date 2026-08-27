import {
  Injectable,
  OnApplicationBootstrap,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/database.service';
import { Prisma, User, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AdminStatusFilter } from '../dto/admin-status-filter.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';

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
        this.configService.get<string>('SUPER_ADMIN_PHONE') || '01700000000';
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
      this.logger.log(
        `Super Admin created successfully with phone: ${phoneNumber}`,
      );
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

  private mapAdminCategories(user: any) {
    if (!user) return user;
    const categoryIds =
      user.adminCategories?.map(
        (ac: any) => ac.category?.categoryId || ac.categoryId,
      ) || [];
    const category = user.adminCategories?.[0]?.category || null;
    const categoryId = categoryIds[0] || null;
    const { adminCategories, ...rest } = user;
    return {
      ...rest,
      categoryId,
      categoryIds,
      category,
      adminCategories,
    };
  }

  async createAdmin(data: CreateAdminDto): Promise<User> {
    const hashedPassword = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    let catIds: string[] = [];
    if (data.categoryIds && data.categoryIds.length > 0) {
      catIds = data.categoryIds;
    } else if ((data as any).categoryId) {
      catIds = [(data as any).categoryId];
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        name: data.name,
        isActive: data.isActive ?? true,
        roles: [Role.ADMIN],
        adminCategories: {
          create: catIds.map((cid) => ({ categoryId: cid })),
        },
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        profileImage: true,
        roles: true,
        isActive: true,
        adminCategories: {
          select: {
            categoryId: true,
            category: {
              select: {
                categoryId: true,
                categoryName: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      } as Prisma.UserSelect,
    });

    return this.mapAdminCategories(user) as unknown as User;
  }

  async findAllAdmins(
    status: AdminStatusFilter = AdminStatusFilter.ALL,
  ): Promise<Partial<User>[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        roles: {
          has: Role.ADMIN,
        },
        ...(status === AdminStatusFilter.ALL
          ? {}
          : { isActive: status === AdminStatusFilter.ACTIVE }),
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        profileImage: true,
        roles: true,
        isActive: true,
        adminCategories: {
          select: {
            categoryId: true,
            category: {
              select: {
                categoryId: true,
                categoryName: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return admins.map((admin) => this.mapAdminCategories(admin));
  }

  async findAdminById(id: string): Promise<Partial<User>> {
    const admin = await this.prisma.user.findFirst({
      where: {
        id,
        roles: { has: Role.ADMIN },
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        profileImage: true,
        roles: true,
        isActive: true,
        adminCategories: {
          select: {
            categoryId: true,
            category: {
              select: {
                categoryId: true,
                categoryName: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return this.mapAdminCategories(admin);
  }

  async updateAdmin(id: string, data: UpdateAdminDto): Promise<Partial<User>> {
    await this.findAdminById(id);

    let catIds: string[] | undefined = undefined;
    if (data.categoryIds && data.categoryIds.length > 0) {
      catIds = data.categoryIds;
    } else if ((data as any).categoryId) {
      catIds = [(data as any).categoryId];
    }

    // Update categories by deleting existing ones and inserting new ones if provided
    if (catIds !== undefined) {
      await this.prisma.adminCategory.deleteMany({
        where: { userId: id },
      });
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name,
        profileImage: data.profileImage,
        ...(catIds !== undefined
          ? {
            adminCategories: {
              create: catIds.map((cid) => ({ categoryId: cid })),
            },
          }
          : {}),
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        profileImage: true,
        roles: true,
        isActive: true,
        adminCategories: {
          select: {
            categoryId: true,
            category: {
              select: {
                categoryId: true,
                categoryName: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapAdminCategories(user);
  }

  async removeAdmin(id: string): Promise<Partial<User>> {
    await this.findAdminById(id);

    // Delete relation records manually before deleting user due to foreign key cascade
    await this.prisma.adminCategory.deleteMany({
      where: { userId: id },
    });

    const user = await this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        adminCategories: {
          select: {
            categoryId: true,
          },
        },
      },
    });
    return this.mapAdminCategories(user);
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        adminCategories: {
          select: {
            categoryId: true,
          },
        },
      },
    });
    return this.mapAdminCategories(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        adminCategories: {
          select: {
            categoryId: true,
            category: {
              select: {
                categoryId: true,
                categoryName: true,
              },
            },
          },
        },
      },
    });
    return this.mapAdminCategories(user);
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
