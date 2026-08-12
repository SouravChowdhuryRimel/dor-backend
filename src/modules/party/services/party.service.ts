import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';
import * as argon2 from 'argon2';
import { createPaginatedResponse, PaginationQueryDto } from '../../../shared/pagination/pagination.util';

@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createPartyDto: CreatePartyDto) {

    const category = await this.prisma.category.findUnique({
      where: { categoryId: createPartyDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${createPartyDto.categoryId}" not found`);
    }

    const hashedPassword = await argon2.hash(createPartyDto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    return this.prisma.party.create({
      data: {
        ...createPartyDto,
        password: hashedPassword,
      } as any,
      include: {
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
      },
    });
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
        include: {
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
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
      include: {
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
      },
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

  async update(id: string, updatePartyDto: UpdatePartyDto) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    return this.prisma.party.update({
      where: { partyId: id },
      data: updatePartyDto as any,
    });
  }

  async verify(id: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    return this.prisma.party.update({
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
            category: {
              select: {
                categoryId: true,
                categoryName: true,
              },
            },
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
      const { companyDrivers, partyDrivers, password, ...driverInfo } = driver as any;
      return {
        ...driverInfo,
        companies,
      };
    });
  }

  async remove(id: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    return this.prisma.party.delete({ where: { partyId: id } });
  }
}
