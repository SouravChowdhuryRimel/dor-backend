import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { GetInquiriesQueryDto } from './dto/get-inquiries-query.dto';
import { CreateInquiryResponseDto } from './dto/create-inquiry-response.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { NotificationService } from '../notification/notification.service';
import { InquiryStatus, CompanyStatus } from '@prisma/client';

@Injectable()
export class InquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(partyId: string, createInquiryDto: CreateInquiryDto) {
    const party = await this.prisma.party.findUnique({
      where: { partyId },
    });
    if (!party) {
      throw new NotFoundException(`Party with ID "${partyId}" not found`);
    }

    // Auto-retrieve categoryId from Party profile if omitted
    const categoryId = createInquiryDto.categoryId || party.categoryId;

    if (!categoryId) {
      throw new BadRequestException(
        'Category ID must be provided or configured in the Party profile.',
      );
    }

    const category = await this.prisma.category.findUnique({
      where: { categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${categoryId}" not found`,
      );
    }

    const deadlineDate = createInquiryDto.deadline
      ? new Date(createInquiryDto.deadline)
      : null;

    const inquiryKeywords = (createInquiryDto.keywords || [])
      .map((k) => k.trim())
      .filter(Boolean);

    // 1. Create Inquiry
    const inquiry = await this.prisma.inquiry.create({
      data: {
        title: createInquiryDto.title,
        productName: createInquiryDto.productName || null,
        description: createInquiryDto.description,
        quantity: createInquiryDto.quantity || null,
        deadline: deadlineDate,
        imageUrls: createInquiryDto.imageUrls || [],
        keywords: inquiryKeywords,
        partyId,
        categoryId,
        status: InquiryStatus.OPEN,
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

    // 2. Find matching companies:
    // a) Companies in the same category
    const categoryCompanies = await this.prisma.company.findMany({
      where: {
        categoryId,
        status: { not: CompanyStatus.BLOCKED },
      },
      select: { companyId: true, companyName: true },
    });

    // b) Companies whose keywords match any inquiry keyword
    let keywordCompanies: { companyId: string; companyName: string }[] = [];
    if (inquiryKeywords.length > 0) {
      keywordCompanies = await this.prisma.company.findMany({
        where: {
          keywords: { hasSome: inquiryKeywords },
          status: { not: CompanyStatus.BLOCKED },
        },
        select: { companyId: true, companyName: true },
      });
    }

    // Deduplicate target companies
    const targetMap = new Map<string, string>();
    categoryCompanies.forEach((c) => targetMap.set(c.companyId, c.companyName));
    keywordCompanies.forEach((c) => targetMap.set(c.companyId, c.companyName));

    // 3. Automatically dispatch notifications to all matching companies
    for (const [companyId] of targetMap.entries()) {
      await this.notificationService.sendNotification({
        title: 'নতুন ইনকোয়ারি জমা হয়েছে',
        message: `আপনার ক্যাটাগরি/কীওয়ার্ড অনুযায়ী একটি নতুন ইনকোয়ারি এসেছে: "${inquiry.title}"`,
        companyId,
        inquiryId: inquiry.inquiryId,
        data: {
          type: 'NEW_INQUIRY',
          inquiryId: inquiry.inquiryId,
          categoryId: inquiry.categoryId,
        },
      });
    }

    return inquiry;
  }

  async respond(
    inquiryId: string,
    companyId: string,
    dto: CreateInquiryResponseDto,
  ) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { inquiryId },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID "${inquiryId}" not found`);
    }

    if (inquiry.status === InquiryStatus.CLOSED) {
      throw new BadRequestException(
        'This inquiry is closed. No new responses or comments can be submitted.',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { productId: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID "${dto.productId}" not found`,
        );
      }
    }

    const response = await this.prisma.inquiryResponse.upsert({
      where: {
        inquiryId_companyId: {
          inquiryId,
          companyId,
        },
      },
      update: {
        comment: dto.comment ?? null,
        offeredPrice: dto.offeredPrice ?? null,
        productId: dto.productId ?? null,
      },
      create: {
        inquiryId,
        companyId,
        comment: dto.comment ?? null,
        offeredPrice: dto.offeredPrice ?? null,
        productId: dto.productId ?? null,
      },
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
            companyImage: true,
          },
        },
        product: {
          select: {
            productId: true,
            productName: true,
            regularPrice: true,
            offerPrice: true,
            productImage: true,
            unit: true,
          },
        },
      },
    });

    // Notify the party owner about the new response
    await this.notificationService.sendNotification({
      title: 'নতুন ইনকোয়ারি রেসপন্স পাওয়া গেছে',
      message: `কোম্পানি "${company.companyName}" আপনার ইনকোয়ারি "${inquiry.title}" এ একটি রেসপন্স পাঠিয়েছে।`,
      partyId: inquiry.partyId,
      inquiryId: inquiry.inquiryId,
      data: {
        type: 'INQUIRY_RESPONSE',
        inquiryId: inquiry.inquiryId,
      },
    });

    return response;
  }

  async closeInquiry(inquiryId: string, partyId: string) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { inquiryId },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID "${inquiryId}" not found`);
    }

    if (inquiry.partyId !== partyId) {
      throw new ForbiddenException(`You can only close your own inquiries`);
    }

    return this.prisma.inquiry.update({
      where: { inquiryId },
      data: { status: InquiryStatus.CLOSED },
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

  async findAll(query?: GetInquiriesQueryDto, userId?: string, role?: string) {
    const where: any = {};
    if (query?.partyId) {
      where.partyId = query.partyId;
    }

    if (role === 'COMPANY' && userId) {
      const company = await this.prisma.company.findUnique({
        where: { companyId: userId },
        select: { categoryId: true, keywords: true },
      });

      if (company) {
        const companyKeywords = company.keywords || [];
        const matchConditions: any[] = [{ categoryId: company.categoryId }];
        if (companyKeywords.length > 0) {
          matchConditions.push({
            keywords: { hasSome: companyKeywords },
          });
        }

        if (query?.categoryId) {
          where.AND = [
            { OR: matchConditions },
            { categoryId: query.categoryId },
          ];
        } else {
          where.OR = matchConditions;
        }
      } else if (query?.categoryId) {
        where.categoryId = query.categoryId;
      }
    } else if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, inquiries] = await Promise.all([
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
          responses: {
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
                  companyImage: true,
                },
              },
              product: {
                select: {
                  productId: true,
                  productName: true,
                  regularPrice: true,
                  offerPrice: true,
                  productImage: true,
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: { responses: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const formattedData = inquiries.map((item) => {
      const responseCount = item._count.responses;
      let filteredResponses = item.responses;

      if (role === 'COMPANY') {
        // Companies only see their own response
        filteredResponses = item.responses.filter(
          (r) => r.companyId === userId,
        );
      } else if (role === 'PARTY') {
        // Party owner sees all responses if partyId matches, otherwise empty
        if (item.partyId !== userId) {
          filteredResponses = [];
        }
      }

      const hasResponded = filteredResponses.some(
        (r) => r.companyId === userId,
      );
      const { _count, responses, ...rest } = item;
      return {
        ...rest,
        responseCount,
        hasResponded,
        responses: filteredResponses,
      };
    });

    return createPaginatedResponse(formattedData, total, page, limit);
  }

  async findOne(id: string, userId?: string, role?: string) {
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
        responses: {
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
                companyImage: true,
              },
            },
            product: {
              select: {
                productId: true,
                productName: true,
                regularPrice: true,
                offerPrice: true,
                productImage: true,
                unit: true,
              },
            },
          },
        },
        _count: {
          select: { responses: true },
        },
      },
    });

    if (!inquiry) {
      throw new NotFoundException(`Inquiry with ID "${id}" not found`);
    }

    const responseCount = inquiry._count.responses;
    let filteredResponses = inquiry.responses;

    if (role === 'COMPANY') {
      // Companies only see their own response
      filteredResponses = inquiry.responses.filter(
        (r) => r.companyId === userId,
      );
    } else if (role === 'PARTY') {
      // Party owner sees all responses if partyId matches, otherwise empty
      if (inquiry.partyId !== userId) {
        filteredResponses = [];
      }
    }

    const hasResponded = filteredResponses.some(
      (r) => r.companyId === userId,
    );
    const { _count, responses, ...rest } = inquiry;
    return {
      ...rest,
      responseCount,
      hasResponded,
      responses: filteredResponses,
    };
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

    const deadlineDate = updateInquiryDto.deadline
      ? new Date(updateInquiryDto.deadline)
      : undefined;

    const dataToUpdate: any = { ...updateInquiryDto };
    if (updateInquiryDto.deadline) {
      dataToUpdate.deadline = deadlineDate;
    }

    return this.prisma.inquiry.update({
      where: { inquiryId: id },
      data: dataToUpdate,
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
