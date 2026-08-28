import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';
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

@Injectable()
export class PartyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
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

    return party;
  }

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.party.count(),
      this.prisma.party.findMany({
        skip,
        take: limit,
        select: partyDetailsSelect,
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

    const updated = await this.prisma.party.update({
      where: { partyId: id },
      data: updatePartyDto as any,
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
