import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOfferDto: CreateOfferDto) {
    // Verify party exists
    const partyExists = await this.prisma.party.findUnique({
      where: { partyId: createOfferDto.partyId },
    });
    if (!partyExists) {
      throw new NotFoundException(`Party with ID "${createOfferDto.partyId}" not found`);
    }

    // Verify product exists
    const productExists = await this.prisma.product.findUnique({
      where: { productId: createOfferDto.productId },
    });
    if (!productExists) {
      throw new NotFoundException(`Product with ID "${createOfferDto.productId}" not found`);
    }

    return this.prisma.offer.create({
      data: {
        ...createOfferDto,
        startDate: new Date(createOfferDto.startDate),
        endDate: new Date(createOfferDto.endDate),
      },
    });
  }

  async findAll(query?: { partyId?: string; status?: string }) {
    const where: any = {};
    if (query?.partyId) {
      where.partyId = query.partyId;
    }
    if (query?.status) {
      where.status = query.status;
    }

    return this.prisma.offer.findMany({
      where,
      include: {
        party: true,
        product: true,
      },
    });
  }

  async findOne(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { offerId: id },
      include: {
        party: true,
        product: true,
      },
    });
    if (!offer) {
      throw new NotFoundException(`Offer with ID "${id}" not found`);
    }
    return offer;
  }

  async update(id: string, updateOfferDto: UpdateOfferDto) {
    const offer = await this.findOne(id);

    if (updateOfferDto.partyId) {
      const partyExists = await this.prisma.party.findUnique({
        where: { partyId: updateOfferDto.partyId },
      });
      if (!partyExists) {
        throw new NotFoundException(`Party with ID "${updateOfferDto.partyId}" not found`);
      }
    }

    if (updateOfferDto.productId) {
      const productExists = await this.prisma.product.findUnique({
        where: { productId: updateOfferDto.productId },
      });
      if (!productExists) {
        throw new NotFoundException(`Product with ID "${updateOfferDto.productId}" not found`);
      }
    }

    const updateData: any = { ...updateOfferDto };
    if (updateOfferDto.startDate) {
      updateData.startDate = new Date(updateOfferDto.startDate);
    }
    if (updateOfferDto.endDate) {
      updateData.endDate = new Date(updateOfferDto.endDate);
    }

    return this.prisma.offer.update({
      where: { offerId: id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.offer.delete({
      where: { offerId: id },
    });
  }
}
