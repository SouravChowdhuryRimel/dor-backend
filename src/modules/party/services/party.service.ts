import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';

@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPartyDto: CreatePartyDto) {
    return this.prisma.party.create({
      data: createPartyDto,
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

  async update(id: string, updatePartyDto: UpdatePartyDto) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: id },
    });
    if (!party) throw new NotFoundException('Party not found');

    return this.prisma.party.update({
      where: { partyId: id },
      data: updatePartyDto,
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
