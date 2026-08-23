import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import * as argon2 from 'argon2';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../../shared/pagination/pagination.util';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(createDriverDto: CreateDriverDto, reqUser?: any) {
    const { companyIds = [], partyIds = [], ...driverData } = createDriverDto;

    if (companyIds.length > 0) {
      const companyCount = await this.prisma.company.count({
        where: { companyId: { in: companyIds } },
      });
      if (companyCount !== new Set(companyIds).size) {
        throw new NotFoundException('One or more companies were not found');
      }
    }

    if (partyIds.length > 0) {
      const partyCount = await this.prisma.party.count({
        where: { partyId: { in: partyIds } },
      });
      if (partyCount !== new Set(partyIds).size) {
        throw new NotFoundException('One or more parties were not found');
      }
    }

    const category = await this.prisma.category.findUnique({
      where: { categoryId: driverData.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${driverData.categoryId}" not found`,
      );
    }

    const hashedPassword = await argon2.hash(driverData.password);
    const driver = await this.prisma.driver.create({
      data: {
        ...driverData,
        password: hashedPassword,
        companyDrivers: {
          create: [...new Set(companyIds)].map((companyId) => ({ companyId })),
        },
        partyDrivers: {
          create: [...new Set(partyIds)].map((partyId) => ({ partyId })),
        },
      } as any,
      include: {
        category: {
          select: {
            categoryId: true,
            categoryName: true,
          },
        },
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'DRIVER',
      actorId: reqUser?.sub || driver.driverId,
      action: 'REGISTER_DRIVER',
      description: `Registered new driver: ${driver.driverName}`,
      driverId: driver.driverId,
    });

    return driver;
  }

  async findByPhone(phoneNumber: string) {
    return this.prisma.driver.findFirst({
      where: { phoneNumber },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.driver.findUnique({ where: { email } });
  }

  async updatePassword(driverId: string, password: string): Promise<void> {
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.driver.update({
      where: { driverId },
      data: { password: hashedPassword },
    });
  }

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.findMany({
        skip,
        take: limit,
        include: {
          category: {
            select: {
              categoryId: true,
              categoryName: true,
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
      include: {
        category: {
          select: {
            categoryId: true,
            categoryName: true,
          },
        },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto, reqUser?: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const dataToUpdate = { ...updateDriverDto };
    if (dataToUpdate.password) {
      dataToUpdate.password = await argon2.hash(dataToUpdate.password);
    }

    const updated = await this.prisma.driver.update({
      where: { driverId: id },
      data: dataToUpdate as any,
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'DRIVER',
      actorId: reqUser?.sub || id,
      action: 'UPDATE_DRIVER',
      description: `Updated driver: ${updated.driverName}`,
      driverId: id,
    });

    return updated;
  }

  async verify(id: string, reqUser?: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const verified = await this.prisma.driver.update({
      where: { driverId: id },
      data: { isVerified: true },
      select: {
        driverId: true,
        driverName: true,
        email: true,
        phoneNumber: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'ADMIN',
      actorId: reqUser?.sub || 'SYSTEM',
      action: 'VERIFY_DRIVER',
      description: `Verified driver: ${verified.driverName}`,
      driverId: id,
    });

    return verified;
  }

  async getDriverAssociations(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
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
                district: true,
                upozela: true,
                address: true,
              },
            },
          },
        },
        partyDrivers: {
          include: {
            party: {
              select: {
                partyId: true,
                partyName: true,
                businessName: true,
                phoneNumber: true,
                email: true,
                district: true,
                upozela: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!driver) throw new NotFoundException('Driver not found');

    const companies = driver.companyDrivers.map((cd) => cd.company);
    const parties = driver.partyDrivers.map((pd) => pd.party);

    return {
      companies,
      parties,
    };
  }

  async remove(id: string, reqUser?: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const deleted = await this.prisma.driver.delete({
      where: { driverId: id },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'ADMIN',
      actorId: reqUser?.sub || 'SYSTEM',
      action: 'DELETE_DRIVER',
      description: `Deleted driver: ${deleted.driverName}`,
      driverId: id,
    });

    return deleted;
  }
}
