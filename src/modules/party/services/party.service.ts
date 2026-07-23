import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';
import * as argon2 from 'argon2';

@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPartyDto: CreatePartyDto) {
    const company = await this.prisma.company.findUnique({
      where: { companyId: createPartyDto.companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
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
    });
  }

  async findAll() {
    return this.prisma.party.findMany();
  }

  async findOne(id: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
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

  async remove(id: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    return this.prisma.party.delete({ where: { partyId: id } });
  }
}
