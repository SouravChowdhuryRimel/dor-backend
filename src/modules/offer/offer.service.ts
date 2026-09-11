import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { GetOffersQueryDto } from './dto/get-offers-query.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { Role } from '../../common/constants/role.enum';

import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OfferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createOfferDto: CreateOfferDto, reqUser?: any) {
    // Verify party exists
    const partyExists = await this.prisma.party.findUnique({
      where: { partyId: createOfferDto.partyId },
    });
    if (!partyExists) {
      throw new NotFoundException(
        `Party with ID "${createOfferDto.partyId}" not found`,
      );
    }

    // Verify product exists
    const productExists = await this.prisma.product.findUnique({
      where: { productId: createOfferDto.productId },
    });
    if (!productExists) {
      throw new NotFoundException(
        `Product with ID "${createOfferDto.productId}" not found`,
      );
    }

    // Enforce ownership if user is VENDOR
    if (reqUser && reqUser.roles && reqUser.roles.includes(Role.VENDOR)) {
      if (productExists.companyId !== reqUser.sub) {
        throw new ForbiddenException(
          'You can only create offers for your own products',
        );
      }
    }

    const offer = await this.prisma.offer.create({
      data: {
        ...createOfferDto,
        startDate: new Date(createOfferDto.startDate),
        endDate: new Date(createOfferDto.endDate),
      },
    });

    await this.notificationService.sendNotification({
      title: 'নতুন অফার প্রাপ্তি',
      message: `"${productExists.productName}" পণ্যের জন্য আপনার অ্যাকাউন্টে বিশেষ অফার মূল্য: ৳${createOfferDto.offerPrice} (ডিসকাউন্ট: ${createOfferDto.discountRate}%)।`,
      partyId: createOfferDto.partyId,
      data: {
        type: 'NEW_OFFER',
        offerId: offer.offerId,
        productId: createOfferDto.productId,
        offerPrice: String(createOfferDto.offerPrice),
        discountRate: String(createOfferDto.discountRate),
      },
    });

    return offer;
  }

  async findAll(query?: GetOffersQueryDto, reqUser?: any) {
    const where: any = {};
    if (query?.partyId) {
      where.partyId = query.partyId;
    }
    if (query?.status) {
      where.status = query.status;
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        where.product = { companyId: reqUser.sub };
      } else if (reqUser.roles.includes(Role.PARTY)) {
        where.partyId = reqUser.sub;
      }
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.offer.count({ where }),
      this.prisma.offer.findMany({
        where,
        skip,
        take: limit,
        include: {
          party: true,
          product: true,
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, reqUser?: any) {
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

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        if (offer.product.companyId !== reqUser.sub) {
          throw new ForbiddenException(
            'You do not have permission to access this offer',
          );
        }
      } else if (reqUser.roles.includes(Role.PARTY)) {
        if (offer.partyId !== reqUser.sub) {
          throw new ForbiddenException(
            'You do not have permission to access this offer',
          );
        }
      }
    }

    return offer;
  }

  async update(id: string, updateOfferDto: UpdateOfferDto, reqUser?: any) {
    const offer = await this.findOne(id, reqUser);

    if (updateOfferDto.partyId) {
      const partyExists = await this.prisma.party.findUnique({
        where: { partyId: updateOfferDto.partyId },
      });
      if (!partyExists) {
        throw new NotFoundException(
          `Party with ID "${updateOfferDto.partyId}" not found`,
        );
      }
    }

    if (updateOfferDto.productId) {
      const productExists = await this.prisma.product.findUnique({
        where: { productId: updateOfferDto.productId },
      });
      if (!productExists) {
        throw new NotFoundException(
          `Product with ID "${updateOfferDto.productId}" not found`,
        );
      }

      if (reqUser && reqUser.roles && reqUser.roles.includes(Role.VENDOR)) {
        if (productExists.companyId !== reqUser.sub) {
          throw new ForbiddenException(
            'You can only assign your own products to this offer',
          );
        }
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

  async remove(id: string, reqUser?: any) {
    await this.findOne(id, reqUser);
    return this.prisma.offer.delete({
      where: { offerId: id },
    });
  }
}

