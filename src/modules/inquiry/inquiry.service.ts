import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { GetInquiriesQueryDto } from './dto/get-inquiries-query.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class InquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(partyId: string, createInquiryDto: CreateInquiryDto) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: createInquiryDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${createInquiryDto.categoryId}" not found`,
      );
    }

    const party = await this.prisma.party.findUnique({
      where: { partyId },
    });
    if (!party) {
      throw new NotFoundException(`Party with ID "${partyId}" not found`);
    }

    // 1. Create Inquiry
    const inquiry = await this.prisma.inquiry.create({
      data: {
        title: createInquiryDto.title,
        description: createInquiryDto.description,
        imageUrl: createInquiryDto.imageUrl || null,
        partyId,
        categoryId: createInquiryDto.categoryId,
      },
      include: {
        category: {
          select: {
            categoryId: true,
            categoryName: true,
          },
        },
        party: {
          select: {
            partyId: true,
            partyName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    // 2. Find all companies in the same category
    const companies = await this.prisma.company.findMany({
      where: { categoryId: createInquiryDto.categoryId },
      select: { companyId: true },
    });

    // 3. Automatically dispatch notification to those companies
    if (companies.length > 0) {
      await this.prisma.notification.createMany({
        data: companies.map((company) => ({
          title: 'নতুন ইনকোয়ারি (New Inquiry)',
          message: `আপনার ক্যাটাগরিতে একটি নতুন ইনকোয়ারি জমা হয়েছে: "${inquiry.title}"`,
          companyId: company.companyId,
          inquiryId: inquiry.inquiryId,
        })),
      });

      // Emit WebSocket real-time events to all companies in the category
      for (const company of companies) {
        this.notificationGateway.sendNotificationToCompany(company.companyId, {
          title: 'নতুন ইনকোয়ারি (New Inquiry)',
          message: `আপনার ক্যাটাগরিতে একটি নতুন ইনকোয়ারি জমা হয়েছে: "${inquiry.title}"`,
          inquiryId: inquiry.inquiryId,
          inquiry,
          createdAt: new Date(),
          isRead: false,
        });
      }
    }

    return inquiry;
  }

  async findAll(query?: GetInquiriesQueryDto) {
    const where: any = {};
    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query?.partyId) {
      where.partyId = query.partyId;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.inquiry.count({ where }),
      this.prisma.inquiry.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              categoryId: true,
              categoryName: true,
            },
          },
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
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { inquiryId: id },
      include: {
        category: {
          select: {
            categoryId: true,
            categoryName: true,
          },
        },
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
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID "${id}" not found`);
    }

    return inquiry;
  }

  async update(
    id: string,
    partyId: string,
    updateInquiryDto: UpdateInquiryDto,
  ) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { inquiryId: id },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry not found`);
    }

    if (inquiry.partyId !== partyId) {
      throw new ForbiddenException(`You can only update your own inquiries`);
    }

    if (updateInquiryDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { categoryId: updateInquiryDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category not found`);
      }
    }

    return this.prisma.inquiry.update({
      where: { inquiryId: id },
      data: updateInquiryDto,
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

  async remove(id: string, partyId: string) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { inquiryId: id },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry not found`);
    }

    if (inquiry.partyId !== partyId) {
      throw new ForbiddenException(`You can only delete your own inquiries`);
    }

    return this.prisma.inquiry.delete({
      where: { inquiryId: id },
    });
  }
}
