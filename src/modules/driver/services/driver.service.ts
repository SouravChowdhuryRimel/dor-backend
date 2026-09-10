import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import { GetNearbyDriversQueryDto } from '../dto/get-nearby-drivers-query.dto';
import { UpdateDriverLocationDto } from '../dto/update-driver-location.dto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../../shared/pagination/pagination.util';

const driverDetailsSelect = {
  driverId: true,
  phoneNumber: true,
  email: true,
  driverImage: true,
  driverName: true,
  address: true,
  district: true,
  upozela: true,
  lat: true,
  long: true,
  truckNumber: true,
  truckType: true,
  loadCapacity: true,
  drivingLicenceNumber: true,
  nidNumber: true,
  driverDocument: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DriverSelect;

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(createDriverDto: CreateDriverDto, reqUser?: any) {
    const { companyIds = [], partyIds = [], ...driverData } = createDriverDto;

    const existingDriverByPhone = await this.prisma.driver.findFirst({
      where: { phoneNumber: driverData.phoneNumber },
    });
    if (existingDriverByPhone) {
      throw new ConflictException('Phone number already exists');
    }

    const existingDriverByEmail = await this.prisma.driver.findUnique({
      where: { email: driverData.email },
    });
    if (existingDriverByEmail) {
      throw new ConflictException('Email already exists');
    }

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
      select: driverDetailsSelect,
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
        select: driverDetailsSelect,
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
      select: driverDetailsSelect,
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto, reqUser?: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const { companyIds, partyIds, ...driverData } = updateDriverDto as any;

    if (driverData.password) {
      driverData.password = await argon2.hash(driverData.password);
    }

    delete driverData.districs;
    delete driverData.upazela;
    delete driverData.trackNumber;
    delete driverData.trackType;

    const updateInput: Prisma.DriverUpdateInput = {
      ...driverData,
    };

    if (companyIds !== undefined && Array.isArray(companyIds)) {
      if (companyIds.length > 0) {
        const companyCount = await this.prisma.company.count({
          where: { companyId: { in: companyIds } },
        });
        if (companyCount !== new Set(companyIds).size) {
          throw new NotFoundException('One or more companies were not found');
        }
      }
      updateInput.companyDrivers = {
        deleteMany: {},
        create: [...new Set(companyIds as string[])].map((companyId) => ({
          companyId,
        })),
      };
    }

    if (partyIds !== undefined && Array.isArray(partyIds)) {
      if (partyIds.length > 0) {
        const partyCount = await this.prisma.party.count({
          where: { partyId: { in: partyIds } },
        });
        if (partyCount !== new Set(partyIds).size) {
          throw new NotFoundException('One or more parties were not found');
        }
      }
      updateInput.partyDrivers = {
        deleteMany: {},
        create: [...new Set(partyIds as string[])].map((partyId) => ({
          partyId,
        })),
      };
    }

    const updated = await this.prisma.driver.update({
      where: { driverId: id },
      data: updateInput,
      select: driverDetailsSelect,
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

  async findNearbyDrivers(query: GetNearbyDriversQueryDto, reqUser?: any) {
    let baseLat = query.lat;
    let baseLong = query.long;

    // If coordinates are not provided, fallback to company coordinates if requester is a VENDOR
    if ((baseLat === undefined || baseLong === undefined) && reqUser?.sub) {
      const company = await this.prisma.company.findUnique({
        where: { companyId: reqUser.sub },
        select: { latitude: true, longitude: true },
      });
      if (company && company.latitude != null && company.longitude != null) {
        baseLat = baseLat ?? company.latitude;
        baseLong = baseLong ?? company.longitude;
      }
    }

    const where: Prisma.DriverWhereInput = {};

    if (query.district) {
      where.district = { contains: query.district, mode: 'insensitive' };
    }

    if (query.upozela) {
      where.upozela = { contains: query.upozela, mode: 'insensitive' };
    }

    if (query.truckType) {
      where.truckType = { contains: query.truckType, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { driverName: { contains: query.search, mode: 'insensitive' } },
        { phoneNumber: { contains: query.search, mode: 'insensitive' } },
        { truckNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const drivers = await this.prisma.driver.findMany({
      where,
      select: driverDetailsSelect,
    });

    const maxRadius = query.radius || 50;

    let processedDrivers = drivers.map((driver) => {
      let distanceInKm: number | null = null;
      if (
        baseLat !== undefined &&
        baseLong !== undefined &&
        driver.lat !== null &&
        driver.long !== null
      ) {
        distanceInKm = this.calculateDistance(
          baseLat,
          baseLong,
          driver.lat,
          driver.long,
        );
        distanceInKm = Math.round(distanceInKm * 100) / 100;
      }
      return {
        ...driver,
        distanceInKm,
      };
    });

    // If base coordinates were supplied, filter by radius and sort by distance
    if (baseLat !== undefined && baseLong !== undefined) {
      processedDrivers = processedDrivers
        .filter(
          (d) => d.distanceInKm !== null && d.distanceInKm <= maxRadius,
        )
        .sort((a, b) => (a.distanceInKm || 0) - (b.distanceInKm || 0));
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const total = processedDrivers.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = processedDrivers.slice(
      startIndex,
      startIndex + limit,
    );

    return createPaginatedResponse(paginatedData, total, page, limit);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async updateLocation(
    targetId: string,
    updateLocationDto: UpdateDriverLocationDto,
    reqUser?: any,
  ) {
    const { lat, long, address } = updateLocationDto;

    // 1. Try finding Driver by ID
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: targetId },
    });

    if (driver) {
      const updatedDriver = await this.prisma.driver.update({
        where: { driverId: targetId },
        data: {
          lat,
          long,
          address: address || undefined,
        },
        select: driverDetailsSelect,
      });

      // Update active deliveries for this driver with new location coordinates
      await this.prisma.delivery.updateMany({
        where: {
          driverId: targetId,
          status: { in: ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'REACHED'] },
        },
        data: {
          lat,
          long,
          currentLocation: address || `${lat}, ${long}`,
        },
      });

      await this.activityLogService.log({
        actorType: reqUser?.roles?.[0] || 'DRIVER',
        actorId: reqUser?.sub || targetId,
        action: 'UPDATE_LOCATION',
        description: `Updated driver location to lat: ${lat}, long: ${long}`,
        driverId: targetId,
      });

      return updatedDriver;
    }

    // 2. If Driver not found, try finding Company by ID
    const company = await this.prisma.company.findUnique({
      where: { companyId: targetId },
    });

    if (company) {
      const updatedCompany = await this.prisma.company.update({
        where: { companyId: targetId },
        data: {
          latitude: lat,
          longitude: long,
          address: address || undefined,
        },
      });

      await this.activityLogService.log({
        actorType: reqUser?.roles?.[0] || 'VENDOR',
        actorId: reqUser?.sub || targetId,
        action: 'UPDATE_LOCATION',
        description: `Updated company location to lat: ${lat}, long: ${long}`,
        companyId: targetId,
      });

      return {
        companyId: updatedCompany.companyId,
        companyName: updatedCompany.companyName,
        address: updatedCompany.address,
        latitude: updatedCompany.latitude,
        longitude: updatedCompany.longitude,
      };
    }

    throw new NotFoundException(
      `Driver or Company with ID "${targetId}" not found`,
    );
  }

  async remove(id: string, reqUser?: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const deleted = await this.prisma.driver.delete({
      where: { driverId: id },
      select: driverDetailsSelect,
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
