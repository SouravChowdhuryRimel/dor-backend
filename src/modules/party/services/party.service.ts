import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { Role } from '../../../common/constants/role.enum';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';
import { GetPartiesQueryDto } from '../dto/get-parties-query.dto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../../shared/pagination/pagination.util';

const partyDetailsSelect = {
  partyId: true,
  partyName: true,
  businessName: true,
  phoneNumber: true,
  email: true,
  address: true,
  district: true,
  upozela: true,
  bazzarArea: true,
  description: true,
  openingDue: true,
  creditLimit: true,
  status: true,
  isVerified: true,
  treadLicense: true,
  partyDocument: true,
  profileImage: true,
  companyId: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      categoryId: true,
      categoryName: true,
    },
  },
  company: {
    select: {
      companyId: true,
      companyName: true,
    },
  },
} satisfies Prisma.PartySelect;

import { NotificationService } from '../../notification/notification.service';
import { NotificationGateway } from '../../notification/notification.gateway';

@Injectable()
export class PartyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createPartyDto: CreatePartyDto, reqUser?: any) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: createPartyDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${createPartyDto.categoryId}" not found`,
      );
    }

    const hashedPassword = await argon2.hash(createPartyDto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    const party = await this.prisma.party.create({
      data: {
        ...createPartyDto,
        password: hashedPassword,
      } as any,
      select: partyDetailsSelect,
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'PARTY',
      actorId: reqUser?.sub || party.partyId,
      action: 'REGISTER_PARTY',
      description: `Registered new party: ${party.partyName}`,
      partyId: party.partyId,
    });

    // Notify all Admins in Bangla
    const adminUsers = await this.prisma.user.findMany({
      where: {
        roles: {
          hasSome: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      select: { id: true },
    });

    const notifTitle = 'নতুন কাস্টমার/পার্টি নিবন্ধন';
    const notifMessage = `নতুন কাস্টমার/পার্টি "${party.partyName}" নিবন্ধিত হয়েছে। (ফোন: ${party.phoneNumber})`;

    for (const admin of adminUsers) {
      await this.notificationService.sendNotification({
        title: notifTitle,
        message: notifMessage,
        userId: admin.id,
        data: {
          type: 'NEW_PARTY_REGISTERED',
          partyId: party.partyId,
        },
      });
    }

    this.notificationGateway.sendNotificationToAdmin({
      title: notifTitle,
      message: notifMessage,
      partyId: party.partyId,
      createdAt: new Date(),
    });

    return party;
  }

  async findAll(query?: GetPartiesQueryDto, reqUser?: any) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;
    const where: any = {};

    if (reqUser && reqUser.roles) {
      if (
        reqUser.roles.includes(Role.ADMIN) &&
        !reqUser.roles.includes(Role.SUPER_ADMIN)
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
          select: { categoryId: true },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.categoryId = { in: categoryIds };
      }
    }

    if (query?.categoryId) {
      if (
        where.categoryId &&
        typeof where.categoryId === 'object' &&
        'in' in where.categoryId
      ) {
        if (where.categoryId.in.includes(query.categoryId)) {
          where.categoryId = query.categoryId;
        } else {
          where.categoryId = { in: [] };
        }
      } else {
        where.categoryId = query.categoryId;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.party.count({ where }),
      this.prisma.party.findMany({
        where,
        skip,
        take: limit,
        select: partyDetailsSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findPending(query?: PaginationQueryDto, reqUser?: any) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;
    const where: any = { isVerified: false };

    if (reqUser && reqUser.roles) {
      if (
        reqUser.roles.includes(Role.ADMIN) &&
        !reqUser.roles.includes(Role.SUPER_ADMIN)
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
          select: { categoryId: true },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.categoryId = { in: categoryIds };
      }
    }

    if ((query as any)?.categoryId) {
      if (where.categoryId?.in) {
        where.categoryId = {
          in: where.categoryId.in.filter(
            (id: string) => id === (query as any).categoryId,
          ),
        };
      } else {
        where.categoryId = (query as any).categoryId;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.party.count({ where }),
      this.prisma.party.findMany({
        where,
        skip,
        take: limit,
        select: partyDetailsSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
      select: partyDetailsSelect,
    });
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  async findByPhone(phoneNumber: string) {
    return this.prisma.party.findUnique({
      where: { phoneNumber },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.party.findUnique({ where: { email } });
  }

  async updatePassword(partyId: string, password: string): Promise<void> {
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.party.update({
      where: { partyId },
      data: { password: hashedPassword },
    });
  }

  async update(id: string, updatePartyDto: UpdatePartyDto, reqUser?: any) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    const dataToUpdate: any = { ...updatePartyDto };

    delete dataToUpdate.bazzar;
    delete dataToUpdate.area;
    delete dataToUpdate.latitude;
    delete dataToUpdate.longitude;

    if (dataToUpdate.password) {
      if (
        typeof dataToUpdate.password === 'string' &&
        dataToUpdate.password.trim() !== ''
      ) {
        dataToUpdate.password = await argon2.hash(dataToUpdate.password, {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
        });
      } else {
        delete dataToUpdate.password;
      }
    }

    if (dataToUpdate.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { categoryId: dataToUpdate.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${dataToUpdate.categoryId}" not found`,
        );
      }
    }

    if (dataToUpdate.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { companyId: dataToUpdate.companyId },
      });
      if (!company) {
        throw new NotFoundException(
          `Company with ID "${dataToUpdate.companyId}" not found`,
        );
      }
    }

    const updated = await this.prisma.party.update({
      where: { partyId: id },
      data: dataToUpdate,
      select: partyDetailsSelect,
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'PARTY',
      actorId: reqUser?.sub || id,
      action: 'UPDATE_PARTY',
      description: `Updated party: ${updated.partyName}`,
      partyId: id,
    });

    return updated;
  }

  async verify(id: string, reqUser?: any) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    if (
      reqUser?.roles?.includes(Role.ADMIN) &&
      !reqUser?.roles?.includes(Role.SUPER_ADMIN)
    ) {
      const hasCategory = await this.prisma.adminCategory.findUnique({
        where: {
          userId_categoryId: {
            userId: reqUser.sub,
            categoryId: party.categoryId,
          },
        },
      });
      if (!hasCategory) {
        throw new ForbiddenException(
          'You do not have permission to verify parties in this category',
        );
      }
    }

    const verified = await this.prisma.party.update({
      where: { partyId: id },
      data: { isVerified: true },
      select: {
        partyId: true,
        partyName: true,
        businessName: true,
        email: true,
        phoneNumber: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'ADMIN',
      actorId: reqUser?.sub || 'SYSTEM',
      action: 'VERIFY_PARTY',
      description: `Verified party: ${verified.partyName}`,
      partyId: id,
    });

    await this.notificationService.sendNotification({
      title: 'অ্যাকাউন্ট ভেরিফিকেশন সম্পন্ন',
      message: `অভিনন্দন! আপনার প্রতিষ্ঠান "${verified.partyName || verified.businessName || 'পার্টি'}" সফলভাবে ভেরিফাইড হয়েছে।`,
      partyId: id,
      data: {
        type: 'PARTY_VERIFIED',
        partyId: id,
      },
    });

    return verified;
  }

  async getPartyDrivers(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId },
    });
    if (!party) throw new NotFoundException('Party not found');

    const partyDrivers = await this.prisma.partyDriver.findMany({
      where: { partyId },
      include: {
        driver: {
          include: {
            companyDrivers: {
              include: {
                company: {
                  select: {
                    companyId: true,
                    companyName: true,
                    ownerName: true,
                    phoneNumber: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return partyDrivers.map((pd) => {
      const driver = pd.driver;
      const companies = driver.companyDrivers.map((cd) => cd.company);
      const { companyDrivers, partyDrivers, password, ...driverInfo } =
        driver as any;
      return {
        ...driverInfo,
        companies,
      };
    });
  }

  async remove(id: string, reqUser?: any) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    const deleted = await this.prisma.party.delete({
      where: { partyId: id },
      select: partyDetailsSelect,
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'ADMIN',
      actorId: reqUser?.sub || 'SYSTEM',
      action: 'DELETE_PARTY',
      description: `Deleted party: ${deleted.partyName}`,
      partyId: id,
    });

    return deleted;
  }
}
