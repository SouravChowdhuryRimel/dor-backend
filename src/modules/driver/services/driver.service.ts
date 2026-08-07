import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import * as argon2 from 'argon2';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDriverDto: CreateDriverDto) {
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
      throw new NotFoundException(`Category with ID "${driverData.categoryId}" not found`);
    }

    const hashedPassword = await argon2.hash(driverData.password);
    return this.prisma.driver.create({
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


  async findAll() {
    return this.prisma.driver.findMany({
      include: {
        category: {
          select: {
            categoryId: true,
            categoryName: true,
          },
        },
      },
    });
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

  async update(id: string, updateDriverDto: UpdateDriverDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const dataToUpdate = { ...updateDriverDto };
    if (dataToUpdate.password) {
      dataToUpdate.password = await argon2.hash(dataToUpdate.password);
    }

    return this.prisma.driver.update({
      where: { driverId: id },
      data: dataToUpdate as any,
    });
  }

  async verify(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    return this.prisma.driver.update({
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
  }

  async remove(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: id },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    return this.prisma.driver.delete({ where: { driverId: id } });
  }
}
