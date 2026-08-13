import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetPartyProductRateDto } from './dto/set-party-rate.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { createPaginatedResponse, PaginationQueryDto } from '../../shared/pagination/pagination.util';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createProductDto: CreateProductDto, reqUser?: any) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { subCategoryId: createProductDto.subCategoryId },
    });
    if (!subCategory) {
      throw new NotFoundException(
        `SubCategory with ID "${createProductDto.subCategoryId}" not found.`,
      );
    }

    let companyId = createProductDto.companyId;
    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      companyId = reqUser.sub;
    }

    if (companyId) {
      const company = await this.prisma.company.findUnique({
        where: { companyId },
      });
      if (!company) {
        throw new NotFoundException(`Company with ID "${companyId}" not found`);
      }
    }

    const offerPrice = createProductDto.offerPrice ?? createProductDto.defaultPrice ?? 0;
    const regularPrice = createProductDto.regularPrice ?? createProductDto.defaultPrice ?? offerPrice;
    const defaultPrice = offerPrice;

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        companyId,
        offerPrice,
        regularPrice,
        defaultPrice,
      },
    });
  }

  async findAll(query?: GetProductsQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.search) {
      where.productName = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query?.subCategoryId) {
      where.subCategoryId = query.subCategoryId;
    }

    if (query?.companyId) {
      where.companyId = query.companyId;
    }

    if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
      where.defaultPrice = {};
      if (query.minPrice !== undefined) {
        where.defaultPrice.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.defaultPrice.lte = query.maxPrice;
      }
    }

    const orderBy: any = {};
    const allowedSortFields = ['defaultPrice', 'productName', 'createdAt', 'stockSize'];
    const sortBy = query?.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'defaultPrice';
    const sortOrder = query?.sortOrder === 'desc' ? 'desc' : 'asc';
    orderBy[sortBy] = sortOrder;

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          subCategory: true,
          company: {
            select: {
              companyName: true,
              ownerName: true,
              category: {
                select: {
                  categoryName: true,
                },
              },
            },
          },
        },
        orderBy,
      }),
    ]);

    const mappedData = data.map((p) => ({
      ...p,
      stockStatus: p.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      stockStatusText: p.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
      companyCategoryName: (p.company as any)?.category?.categoryName || null,
      subCategoryName: p.subCategory?.title || null,
      status: p.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
      statusText: p.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      unitText: p.unit ? 'প্রতি ' + p.unit : 'প্রতি ব্যাগ',
      stockText: `${p.stockSize} ${p.unit || 'ব্যাগ'}`,
      minOrderText: `সর্বনিম্ন অর্ডার: ${p.minimumOrder}`,
    }));

    return createPaginatedResponse(mappedData, total, page, limit);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
      include: {
        subCategory: true,
        company: {
          select: {
            companyName: true,
            ownerName: true,
            category: {
              select: {
                categoryName: true,
              },
            },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }
    return {
      ...product,
      stockStatus: product.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      stockStatusText: product.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
      companyCategoryName: (product.company as any)?.category?.categoryName || null,
      subCategoryName: product.subCategory?.title || null,
      status: product.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
      statusText: product.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      unitText: product.unit ? 'প্রতি ' + product.unit : 'প্রতি ব্যাগ',
      stockText: `${product.stockSize} ${product.unit || 'ব্যাগ'}`,
      minOrderText: `সর্বনিম্ন অর্ডার: ${product.minimumOrder}`,
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    if (updateProductDto.subCategoryId) {
      const subCategory = await this.prisma.subCategory.findUnique({
        where: { subCategoryId: updateProductDto.subCategoryId },
      });
      if (!subCategory) {
        throw new NotFoundException(
          `SubCategory with ID "${updateProductDto.subCategoryId}" not found.`,
        );
      }
    }

    if (updateProductDto.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { companyId: updateProductDto.companyId },
      });
      if (!company) {
        throw new NotFoundException(`Company with ID "${updateProductDto.companyId}" not found`);
      }
    }

    const updateData: any = { ...updateProductDto };
    if (
      updateProductDto.offerPrice !== undefined ||
      updateProductDto.defaultPrice !== undefined ||
      updateProductDto.regularPrice !== undefined
    ) {
      const newOfferPrice = updateProductDto.offerPrice ?? updateProductDto.defaultPrice ?? product.offerPrice;
      const newRegularPrice = updateProductDto.regularPrice ?? product.regularPrice;
      updateData.offerPrice = newOfferPrice;
      updateData.regularPrice = newRegularPrice;
      updateData.defaultPrice = newOfferPrice;
    }

    return this.prisma.product.update({
      where: { productId: id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    return this.prisma.product.delete({
      where: { productId: id },
    });
  }

  async findLowStock(query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    // Out of stock or stock size less than minimumOrder
    const where = {
      OR: [
        { stockSize: { lte: 0 } },
        {
          stockSize: {
            lt: this.prisma.product.fields.minimumOrder,
          },
        },
      ],
    };

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          subCategory: true,
          company: {
            select: {
              companyName: true,
            },
          },
        },
        orderBy: {
          stockSize: 'asc',
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async setPartyRate(dto: SetPartyProductRateDto) {
    const party = await this.prisma.party.findUnique({
      where: { partyId: dto.partyId },
    });
    if (!party) {
      throw new NotFoundException(`Party with ID "${dto.partyId}" not found`);
    }

    const product = await this.prisma.product.findUnique({
      where: { productId: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
    }

    const rate = await this.prisma.partyProductRate.upsert({
      where: {
        partyId_productId: {
          partyId: dto.partyId,
          productId: dto.productId,
        },
      },
      create: {
        partyId: dto.partyId,
        productId: dto.productId,
        rate: dto.rate,
      },
      update: {
        rate: dto.rate,
      },
    });

    const notifTitle = 'বিশেষ মূল্য অফার (Special Price Offer)';
    const notifMessage = `আপনাকে "${product.productName}" পণ্যের জন্য একটি বিশেষ কাস্টম মূল্য (${dto.rate} টাকা) অফার করা হয়েছে।`;

    await this.prisma.notification.create({
      data: {
        title: notifTitle,
        message: notifMessage,
        partyId: dto.partyId,
      },
    });

    this.notificationGateway.sendNotificationToParty(dto.partyId, {
      title: notifTitle,
      message: notifMessage,
      productId: dto.productId,
      rate: dto.rate,
      createdAt: new Date(),
    });

    return rate;
  }

  async getPartyRates(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId },
    });
    if (!party) {
      throw new NotFoundException(`Party with ID "${partyId}" not found`);
    }

    const products = await this.prisma.product.findMany({
      include: {
        partyRates: {
          where: { partyId },
        },
      },
    });

    return products.map((product) => {
      const customRateObj = product.partyRates[0];
      return {
        productId: product.productId,
        productName: product.productName,
        productImage: product.productImage,
        unit: product.unit,
        bagSize: product.bagSize,
        defaultPrice: product.defaultPrice,
        customPrice: customRateObj ? customRateObj.rate : null,
        activePrice: customRateObj ? customRateObj.rate : product.defaultPrice,
        minimumOrder: product.minimumOrder,
        description: product.description,
        stockSize: product.stockSize,
        subCategoryId: product.subCategoryId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });
  }

  async findSubCategoryProducts(subCategoryId: string, query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where = { subCategoryId };

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          subCategory: true,
          company: {
            select: {
              companyName: true,
            },
          },
        },
        orderBy: {
          defaultPrice: 'asc',
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findCompanyProducts(companyId: string, query?: GetProductsQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query?.search) {
      where.productName = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query?.subCategoryId) {
      where.subCategoryId = query.subCategoryId;
    }

    if (query?.minPrice !== undefined || query?.maxPrice !== undefined) {
      where.defaultPrice = {};
      if (query.minPrice !== undefined) {
        where.defaultPrice.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.defaultPrice.lte = query.maxPrice;
      }
    }

    const orderBy: any = {};
    const allowedSortFields = ['defaultPrice', 'productName', 'createdAt', 'stockSize'];
    const sortBy = query?.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'defaultPrice';
    const sortOrder = query?.sortOrder === 'desc' ? 'desc' : 'asc';
    orderBy[sortBy] = sortOrder;

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          subCategory: true,
          company: {
            select: {
              companyName: true,
              ownerName: true,
              category: {
                select: {
                  categoryName: true,
                },
              },
            },
          },
        },
        orderBy,
      }),
    ]);

    const mappedData = data.map((p) => ({
      ...p,
      stockStatus: p.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      stockStatusText: p.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
      companyCategoryName: (p.company as any)?.category?.categoryName || null,
      subCategoryName: p.subCategory?.title || null,
      status: p.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
      statusText: p.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      unitText: p.unit ? 'প্রতি ' + p.unit : 'প্রতি ব্যাগ',
      stockText: `${p.stockSize} ${p.unit || 'ব্যাগ'}`,
      minOrderText: `সর্বনিম্ন অর্ডার: ${p.minimumOrder}`,
    }));

    return createPaginatedResponse(mappedData, total, page, limit);
  }
}
