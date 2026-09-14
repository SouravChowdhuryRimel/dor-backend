import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/core/database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetPartyProductRateDto } from './dto/set-party-rate.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../shared/pagination/pagination.util';
import { NotificationGateway } from '../notification/notification.gateway';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createProductDto: CreateProductDto, reqUser?: any) {
    let categoryId = createProductDto.categoryId;

    if (createProductDto.subCategoryId) {
      const subCategory = await this.prisma.subCategory.findUnique({
        where: { subCategoryId: createProductDto.subCategoryId },
      });
      if (!subCategory) {
        throw new NotFoundException(
          `SubCategory with ID "${createProductDto.subCategoryId}" not found.`,
        );
      }
      categoryId = categoryId || subCategory.categoryId;
    }

    if (!categoryId) {
      throw new BadRequestException(
        'Either categoryId or subCategoryId must be provided',
      );
    }

    const category = await this.prisma.category.findUnique({
      where: { categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    let companyId = createProductDto.companyId;
    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      companyId = reqUser.sub;
    }

    if (!companyId) {
      throw new BadRequestException(
        'Company ID is required to create a product',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const productData = { ...createProductDto };

    const offerPrice = productData.offerPrice ?? productData.defaultPrice ?? 0;
    const regularPrice =
      productData.regularPrice ?? productData.defaultPrice ?? offerPrice;
    const defaultPrice = offerPrice;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        companyId,
        categoryId,
        subCategoryId: createProductDto.subCategoryId || null,
        offerPrice,
        regularPrice,
        defaultPrice,
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'VENDOR',
      actorId: reqUser?.sub || companyId,
      action: 'CREATE_PRODUCT',
      description: `Created product: ${product.productName} for company ${companyId}`,
      companyId,
    });

    // Notify parties registered under this company or category in Bangla
    const targetParties = await this.prisma.party.findMany({
      where: {
        OR: [{ companyId }, { categoryId }],
      },
      select: { partyId: true },
    });

    for (const p of targetParties) {
      await this.notificationService.sendNotification({
        title: 'নতুন প্রোডাক্ট যুক্ত হয়েছে',
        message: `কোম্পানি "${company.companyName}" একটি নতুন প্রোডাক্ট যুক্ত করেছে: "${product.productName}"`,
        partyId: p.partyId,
        data: {
          type: 'NEW_PRODUCT',
          productId: product.productId,
          companyId,
        },
      });
    }

    return product;
  }

  async findAll(query?: GetProductsQueryDto, reqUser?: any) {
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

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('VENDOR')) {
        where.companyId = reqUser.sub;
      } else if (reqUser.roles.includes('PARTY')) {
        const party = await this.prisma.party.findUnique({
          where: { partyId: reqUser.sub },
          select: { companyId: true },
        });
        if (party && party.companyId) {
          where.companyId = party.companyId;
        } else if (query?.companyId) {
          where.companyId = query.companyId;
        }
      } else if (reqUser.roles.includes('ADMIN') && !reqUser.roles.includes('SUPER_ADMIN')) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.categoryId = { in: categoryIds };
      }
    } else if (query?.companyId) {
      where.companyId = query.companyId;
    }

    if (query?.categoryId) {
      if (where.categoryId && typeof where.categoryId === 'object' && 'in' in where.categoryId) {
        if (where.categoryId.in.includes(query.categoryId)) {
          where.categoryId = query.categoryId;
        } else {
          where.categoryId = 'none';
        }
      } else {
        where.categoryId = query.categoryId;
      }
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
    const allowedSortFields = [
      'defaultPrice',
      'productName',
      'createdAt',
      'stockSize',
    ];
    const sortBy =
      query?.sortBy && allowedSortFields.includes(query.sortBy)
        ? query.sortBy
        : 'defaultPrice';
    const sortOrder = query?.sortOrder === 'desc' ? 'desc' : 'asc';
    orderBy[sortBy] = sortOrder;

    const hasPartyRole =
      reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
    const partyId = hasPartyRole ? reqUser.sub : null;

    const includeQuery: any = {
      category: true,
      subCategory: true,
      company: {
        include: {
          category: true,
        },
      },
    };

    if (partyId) {
      includeQuery.partyRates = {
        where: { partyId },
      };
      includeQuery.offers = {
        where: {
          partyId,
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: includeQuery,
        orderBy,
      }),
    ]);

    const mappedData = data.map((p: any) => this.formatProductDetails(p, partyId));

    return createPaginatedResponse(mappedData, total, page, limit);
  }

  private formatProductDetails(p: any, partyId?: string | null) {
    const customRateObj = p.partyRates?.[0];
    const activeOfferObj = p.offers?.find(
      (o: any) => o.status === 'ACTIVE' && new Date(o.endDate) >= new Date(),
    ) || p.offers?.[0];

    const regularPrice = p.regularPrice ?? p.defaultPrice ?? 0;
    const offerPrice = p.offerPrice ?? 0;

    let specialPrice: number | null = null;
    let hasSpecialPrice = false;
    let hasActiveOffer = false;
    let activeOffer: any = null;
    let appliedPricingType = 'REGULAR_PRICE';
    let appliedPricingReason = 'রেগুলার মূল্য প্রযোজ্য';

    if (customRateObj && customRateObj.rate !== undefined && customRateObj.rate !== null) {
      specialPrice = customRateObj.rate;
      hasSpecialPrice = true;
      appliedPricingType = 'SPECIAL_PRICE';
      appliedPricingReason = 'পার্টির জন্য স্পেশাল রেট প্রযোজ্য';
    } else if (activeOfferObj && activeOfferObj.offerPrice > 0) {
      specialPrice = activeOfferObj.offerPrice;
      hasSpecialPrice = true;
      hasActiveOffer = true;
      activeOffer = activeOfferObj;
      appliedPricingType = 'SPECIAL_PRICE';
      appliedPricingReason = 'চলমান অফার মূল্য প্রযোজ্য';
    } else if (offerPrice > 0) {
      hasActiveOffer = true;
      appliedPricingType = 'OFFER_PRICE';
      appliedPricingReason = 'প্রোডাক্টের অফার মূল্য প্রযোজ্য';
    } else {
      appliedPricingType = 'REGULAR_PRICE';
      appliedPricingReason = 'রেগুলার মূল্য প্রযোজ্য';
    }

    const currentPrice =
      specialPrice !== null
        ? specialPrice
        : offerPrice > 0
          ? offerPrice
          : regularPrice;

    const discountAmount = regularPrice > currentPrice ? Math.round((regularPrice - currentPrice) * 100) / 100 : 0;
    const discountPercentage = regularPrice > 0 && regularPrice > currentPrice
      ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
      : 0;

    const unitText = p.unit ? `প্রতি ${p.unit} ${p.unitType || ''}`.trim() : `প্রতি ${p.unitType || 'ব্যাগ'}`;
    const stockText = `${p.stockSize} ${p.unitType || p.unit || 'ব্যাগ'}`;
    const minOrderText = `সর্বনিম্ন অর্ডার: ${p.minimumOrder} ${p.unitType || p.unit || 'ব্যাগ'}`;

    return {
      productId: p.productId,
      productName: p.productName,
      productImage: Array.isArray(p.productImage) ? p.productImage : (p.productImage ? [p.productImage] : []),
      description: p.description || '',
      unit: p.unit,
      unitType: p.unitType,
      unitText,
      bagSize: p.bagSize,
      packagingType: p.packagingType,
      packagingTypeText: p.packagingType || 'ব্যাগ',
      stockSize: p.stockSize,
      stockText,
      stockStatus: p.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      stockStatusText: p.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
      minimumOrder: p.minimumOrder,
      minOrderText,
      status: p.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
      statusText: p.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',

      // Pricing details
      regularPrice,
      offerPrice,
      specialPrice,
      hasSpecialPrice,
      hasActiveOffer,
      activeOffer: activeOffer || null,
      appliedPricingType,
      appliedPricingReason,
      discountAmount,
      discountPercentage,

      // Relations & Metadata
      categoryId: p.categoryId,
      categoryName: p.category?.categoryName || null,
      category: p.category || null,
      subCategoryId: p.subCategoryId || null,
      subCategoryName: p.subCategory?.title || null,
      subCategory: p.subCategory || null,
      companyId: p.companyId,
      companyName: p.company?.companyName || null,
      companyPhone: p.company?.phoneNumber || null,
      company: p.company || null,
      partyRates: p.partyRates || [],
      partyRate: customRateObj || null,
      offers: p.offers || [],

      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async findOne(id: string, reqUser?: any) {
    const hasPartyRole =
      reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
    const partyId = hasPartyRole ? reqUser.sub : null;

    const includeQuery: any = {
      category: true,
      subCategory: true,
      company: {
        include: {
          category: true,
        },
      },
    };

    if (partyId) {
      includeQuery.partyRates = {
        where: { partyId },
      };
      includeQuery.offers = {
        where: {
          partyId,
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
      };
    }

    const product = await this.prisma.product.findUnique({
      where: { productId: id },
      include: includeQuery,
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('VENDOR')) {
        if (product.companyId !== reqUser.sub) {
          throw new NotFoundException(`Product not found`);
        }
      } else if (reqUser.roles.includes('PARTY')) {
        const party = await this.prisma.party.findUnique({
          where: { partyId: reqUser.sub },
          select: { companyId: true },
        });
        if (party && party.companyId && party.companyId !== product.companyId) {
          throw new ForbiddenException(`You do not have permission to access this product`);
        }
      } else if (reqUser.roles.includes('ADMIN') && !reqUser.roles.includes('SUPER_ADMIN')) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        if (!categoryIds.includes(product.categoryId)) {
          throw new ForbiddenException(`You do not have permission to access this product`);
        }
      }
    }

    return this.formatProductDetails(product, partyId);
  }

  async update(id: string, updateProductDto: UpdateProductDto, reqUser?: any) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    const updateData: any = { ...updateProductDto };

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('VENDOR')) {
        if (product.companyId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to update this product`,
          );
        }
        delete updateData.companyId;
      } else if (reqUser.roles.includes('ADMIN') && !reqUser.roles.includes('SUPER_ADMIN')) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        if (!categoryIds.includes(product.categoryId)) {
          throw new ForbiddenException(`You do not have permission to modify this product`);
        }
      }
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
      updateData.categoryId = updateData.categoryId || subCategory.categoryId;
    }

    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { categoryId: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${updateProductDto.categoryId}" not found`,
        );
      }
    }

    if (updateData.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { companyId: updateData.companyId },
      });
      if (!company) {
        throw new NotFoundException(
          `Company with ID "${updateData.companyId}" not found`,
        );
      }
    }

    if (
      updateProductDto.offerPrice !== undefined ||
      updateProductDto.defaultPrice !== undefined ||
      updateProductDto.regularPrice !== undefined
    ) {
      const newOfferPrice =
        updateProductDto.offerPrice ??
        updateProductDto.defaultPrice ??
        product.offerPrice;
      const newRegularPrice =
        updateProductDto.regularPrice ?? product.regularPrice;
      updateData.offerPrice = newOfferPrice;
      updateData.regularPrice = newRegularPrice;
      updateData.defaultPrice = newOfferPrice;
    }

    const updatedProduct = await this.prisma.product.update({
      where: { productId: id },
      data: updateData,
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'VENDOR',
      actorId: reqUser?.sub || updatedProduct.companyId,
      action: 'UPDATE_PRODUCT',
      description: `Updated product: ${updatedProduct.productName}`,
      companyId: updatedProduct.companyId,
    });

    return updatedProduct;
  }

  async remove(id: string, reqUser?: any) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('VENDOR')) {
        if (product.companyId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to delete this product`,
          );
        }
      } else if (reqUser.roles.includes('ADMIN') && !reqUser.roles.includes('SUPER_ADMIN')) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        if (!categoryIds.includes(product.categoryId)) {
          throw new ForbiddenException(`You do not have permission to modify this product`);
        }
      }
    }

    const existingOrdersCount = await this.prisma.order.count({
      where: { productId: id },
    });
    if (existingOrdersCount > 0) {
      throw new BadRequestException(
        `Cannot delete product "${product.productName}" because it is associated with ${existingOrdersCount} existing order(s).`,
      );
    }

    const existingOffersCount = await this.prisma.offer.count({
      where: { productId: id },
    });
    if (existingOffersCount > 0) {
      throw new BadRequestException(
        `Cannot delete product "${product.productName}" because it is associated with ${existingOffersCount} existing offer(s).`,
      );
    }

    try {
      const deletedProduct = await this.prisma.product.delete({
        where: { productId: id },
      });

      await this.activityLogService.log({
        actorType: reqUser?.roles?.[0] || 'VENDOR',
        actorId: reqUser?.sub || deletedProduct.companyId,
        action: 'DELETE_PRODUCT',
        description: `Deleted product: ${deletedProduct.productName}`,
        companyId: deletedProduct.companyId,
      });

      return deletedProduct;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          `Cannot delete product "${product.productName}" because other database records reference it.`,
        );
      }
      throw error;
    }
  }

  async findLowStock(query?: PaginationQueryDto, reqUser?: any) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { stockSize: { lte: 0 } },
        {
          stockSize: {
            lt: this.prisma.product.fields.minimumOrder,
          },
        },
      ],
    };

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('VENDOR')) {
        where.companyId = reqUser.sub;
      } else if (reqUser.roles.includes('ADMIN') && !reqUser.roles.includes('SUPER_ADMIN')) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.categoryId = { in: categoryIds };
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          subCategory: true,
          company: {
            select: {
              companyName: true,
              ownerName: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: {
          stockSize: 'asc',
        },
      }),
    ]);

    const mappedData = data.map((p: any) => {
      const companyObj = p.company
        ? {
            companyName: p.company.companyName,
            ownerName: p.company.ownerName,
            companyPhone: p.company.phoneNumber || null,
          }
        : null;

      return {
        ...p,
        company: companyObj,
        stockStatus: p.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        stockStatusText: p.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
        companyName: p.company?.companyName || null,
        companyPhone: p.company?.phoneNumber || null,
        categoryName: p.category?.categoryName || null,
        subCategoryName: p.subCategory?.title || null,
        status: p.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
        statusText: p.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
        unitText: p.unit ? 'প্রতি ' + p.unit : 'প্রতি ব্যাগ',
        stockText: `${p.stockSize} ${p.unit || 'ব্যাগ'}`,
        minOrderText: `সর্বনিম্ন অর্ডার: ${p.minimumOrder}`,
      };
    });

    return createPaginatedResponse(mappedData, total, page, limit);
  }

  async setPartyRate(dto: Partial<SetPartyProductRateDto>, reqUser?: any) {
    if (!dto.partyId) {
      throw new BadRequestException('partyId is required');
    }
    if (!dto.productId) {
      throw new BadRequestException('productId is required');
    }
    if (dto.rate === undefined) {
      throw new BadRequestException('rate is required');
    }

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
      throw new NotFoundException(
        `Product with ID "${dto.productId}" not found`,
      );
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

    await this.notificationService.sendNotification({
      title: 'বিশেষ মূল্য অফার',
      message: `আপনাকে "${product.productName}" পণ্যের জন্য একটি বিশেষ কাস্টম মূল্য (${dto.rate} টাকা) অফার করা হয়েছে।`,
      partyId: dto.partyId,
      data: {
        type: 'SPECIAL_PRICE_OFFER',
        productId: dto.productId,
        rate: String(dto.rate),
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'VENDOR',
      actorId: reqUser?.sub || product.companyId,
      action: 'SET_PARTY_PRODUCT_RATE',
      description: `Set customized rate of ${dto.rate} for party ${party.partyName} on product ${product.productName}`,
      partyId: dto.partyId,
      companyId: product.companyId,
    });

    return rate;
  }

  async getPartyRates(partyId: string, companyId?: string, reqUser?: any) {
    const party = await this.prisma.party.findUnique({
      where: { partyId },
    });
    if (!party) {
      throw new NotFoundException(`Party with ID "${partyId}" not found`);
    }

    const where: any = {};
    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('PARTY')) {
        if (partyId !== reqUser.sub) {
          throw new ForbiddenException(`You do not have permission to view other parties' rates`);
        }
        if (companyId) {
          where.companyId = companyId;
        } else if (party.companyId) {
          where.companyId = party.companyId;
        }
      } else if (reqUser.roles.includes('VENDOR')) {
        where.companyId = reqUser.sub;
      } else if (reqUser.roles.includes('ADMIN') && !reqUser.roles.includes('SUPER_ADMIN')) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.categoryId = { in: categoryIds };
        if (companyId) {
          where.companyId = companyId;
        }
      } else if (reqUser.roles.includes('SUPER_ADMIN')) {
        if (companyId) {
          where.companyId = companyId;
        }
      }
    } else if (companyId) {
      where.companyId = companyId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        subCategory: true,
        company: {
          include: {
            category: true,
          },
        },
        partyRates: {
          where: { partyId },
        },
        offers: {
          where: {
            partyId,
            status: 'ACTIVE',
            endDate: { gte: new Date() },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product: any) =>
      this.formatProductDetails(product, partyId),
    );
  }

  async getProductPartyRates(productId: string, reqUser?: any) {
    const product = await this.prisma.product.findUnique({
      where: { productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      if (product.companyId !== reqUser.sub) {
        throw new ForbiddenException(
          `You do not have permission to view party rates for this product`,
        );
      }
    }

    const rates = await this.prisma.partyProductRate.findMany({
      where: { productId },
      include: {
        party: {
          select: {
            partyId: true,
            partyName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    return rates.map((r) => ({
      partyId: r.partyId,
      partyName: r.party?.partyName || null,
      email: r.party?.email || null,
      phoneNumber: r.party?.phoneNumber || null,
      customRate: r.rate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getSingleProductPartyRate(
    productId: string,
    partyId: string,
    reqUser?: any,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    if (reqUser && reqUser.roles) {
      if (
        reqUser.roles.includes('VENDOR') &&
        product.companyId !== reqUser.sub
      ) {
        throw new ForbiddenException(
          `You do not have permission to view this custom rate`,
        );
      }
      if (reqUser.roles.includes('PARTY') && partyId !== reqUser.sub) {
        throw new ForbiddenException(
          `You do not have permission to view this custom rate`,
        );
      }
    }

    const customRateObj = await this.prisma.partyProductRate.findUnique({
      where: {
        partyId_productId: {
          partyId,
          productId,
        },
      },
      include: {
        party: {
          select: {
            partyId: true,
            partyName: true,
          },
        },
      },
    });

    if (!customRateObj) {
      throw new NotFoundException(
        `Custom rate not found for product "${productId}" and party "${partyId}"`,
      );
    }

    return {
      productId: customRateObj.productId,
      productName: product.productName,
      partyId: customRateObj.partyId,
      partyName: customRateObj.party?.partyName || null,
      customRate: customRateObj.rate,
      defaultPrice: product.defaultPrice,
      createdAt: customRateObj.createdAt,
      updatedAt: customRateObj.updatedAt,
    };
  }

  async deletePartyRate(productId: string, partyId: string, reqUser?: any) {
    const product = await this.prisma.product.findUnique({
      where: { productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      if (product.companyId !== reqUser.sub) {
        throw new ForbiddenException(
          `You do not have permission to delete custom rate for this product`,
        );
      }
    }

    const customRateObj = await this.prisma.partyProductRate.findUnique({
      where: {
        partyId_productId: {
          partyId,
          productId,
        },
      },
    });

    if (!customRateObj) {
      throw new NotFoundException(
        `Custom rate not found for product "${productId}" and party "${partyId}"`,
      );
    }

    const deletedRate = await this.prisma.partyProductRate.delete({
      where: {
        partyId_productId: {
          partyId,
          productId,
        },
      },
    });

    const party = await this.prisma.party.findUnique({
      where: { partyId },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'VENDOR',
      actorId: reqUser?.sub || product.companyId,
      action: 'DELETE_PARTY_PRODUCT_RATE',
      description: `Deleted custom rate for party ${party?.partyName || partyId} on product ${product.productName}`,
      partyId,
      companyId: product.companyId,
    });

    return deletedRate;
  }

  async findCategoryProducts(
    categoryId: string,
    query?: PaginationQueryDto,
    reqUser?: any,
  ) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { categoryId };

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('VENDOR')) {
        where.companyId = reqUser.sub;
      } else if (reqUser.roles.includes('PARTY')) {
        const party = await this.prisma.party.findUnique({
          where: { partyId: reqUser.sub },
          select: { companyId: true },
        });
        if (party && party.companyId) {
          where.companyId = party.companyId;
        } else {
          where.companyId = 'none';
        }
      } else if (
        reqUser.roles.includes('ADMIN') &&
        !reqUser.roles.includes('SUPER_ADMIN')
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        if (!categoryIds.includes(categoryId)) {
          throw new ForbiddenException(
            'You do not have permission to access products of this category',
          );
        }
      }
    }

    const hasPartyRole =
      reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
    const partyId = hasPartyRole ? reqUser.sub : null;

    const includeQuery: any = {
      category: true,
      subCategory: true,
      company: {
        select: {
          companyName: true,
          ownerName: true,
        },
      },
    };

    if (partyId) {
      includeQuery.partyRates = {
        where: { partyId },
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: includeQuery,
        orderBy: {
          defaultPrice: 'asc',
        },
      }),
    ]);

    const mappedData = data.map((p: any) => {
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      }

      const { defaultPrice: _dp, ...rest } = p;

      return {
        ...rest,
        regularPrice: p.regularPrice ?? 0,
        offerPrice: p.offerPrice ?? 0,
        specialPrice,
        hasSpecialPrice,
        stockStatus: p.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        stockStatusText: p.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
        companyName: p.company?.companyName || null,
        categoryName: p.category?.categoryName || null,
        subCategoryName: p.subCategory?.title || null,
        status: p.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
        statusText: p.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
        unitText: p.unit ? 'প্রতি ' + p.unit : 'প্রতি ব্যাগ',
        stockText: `${p.stockSize} ${p.unit || 'ব্যাগ'}`,
        minOrderText: `সর্বনিম্ন অর্ডার: ${p.minimumOrder}`,
      };
    });

    return createPaginatedResponse(mappedData, total, page, limit);
  }

  async findSubCategoryProducts(
    subCategoryId: string,
    query?: PaginationQueryDto,
    reqUser?: any,
  ) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where = { subCategoryId };

    const hasPartyRole =
      reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
    const partyId = hasPartyRole ? reqUser.sub : null;

    const includeQuery: any = {
      category: true,
      subCategory: true,
      company: {
        select: {
          companyName: true,
          ownerName: true,
        },
      },
    };

    if (partyId) {
      includeQuery.partyRates = {
        where: { partyId },
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: includeQuery,
        orderBy: {
          defaultPrice: 'asc',
        },
      }),
    ]);

    const mappedData = data.map((p: any) => {
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      }

      const { defaultPrice: _dp, ...rest } = p;

      return {
        ...rest,
        regularPrice: p.regularPrice ?? 0,
        offerPrice: p.offerPrice ?? 0,
        specialPrice,
        hasSpecialPrice,
        stockStatus: p.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        stockStatusText: p.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
        companyName: p.company?.companyName || null,
        categoryName: p.category?.categoryName || null,
        subCategoryName: p.subCategory?.title || null,
        status: p.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
        statusText: p.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
        unitText: p.unit ? 'প্রতি ' + p.unit : 'প্রতি ব্যাগ',
        stockText: `${p.stockSize} ${p.unit || 'ব্যাগ'}`,
        minOrderText: `সর্বনিম্ন অর্ডার: ${p.minimumOrder}`,
      };
    });

    return createPaginatedResponse(mappedData, total, page, limit);
  }

  async findCompanyProducts(
    companyId: string,
    query?: GetProductsQueryDto,
    reqUser?: any,
  ) {
    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes('PARTY')) {
        const party = await this.prisma.party.findUnique({
          where: { partyId: reqUser.sub },
          select: { companyId: true },
        });
        if (!party || party.companyId !== companyId) {
          throw new ForbiddenException(`You do not have permission to access products of this company`);
        }
      } else if (reqUser.roles.includes('ADMIN') && !reqUser.roles.includes('SUPER_ADMIN')) {
        const company = await this.prisma.company.findUnique({
          where: { companyId },
          select: { categoryId: true },
        });
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        if (!company || !categoryIds.includes(company.categoryId)) {
          throw new ForbiddenException(`You do not have permission to access products of this company`);
        }
      }
    }

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

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
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
    const allowedSortFields = [
      'defaultPrice',
      'productName',
      'createdAt',
      'stockSize',
    ];
    const sortBy =
      query?.sortBy && allowedSortFields.includes(query.sortBy)
        ? query.sortBy
        : 'defaultPrice';
    const sortOrder = query?.sortOrder === 'desc' ? 'desc' : 'asc';
    orderBy[sortBy] = sortOrder;

    const hasPartyRole =
      reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
    const partyId = hasPartyRole ? reqUser.sub : null;

    const includeQuery: any = {
      category: true,
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
    };

    if (partyId) {
      includeQuery.partyRates = {
        where: { partyId },
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: includeQuery,
        orderBy,
      }),
    ]);

    const mappedData = data.map((p: any) => {
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      }

      const { defaultPrice: _dp, ...rest } = p;

      return {
        ...rest,
        regularPrice: p.regularPrice ?? 0,
        offerPrice: p.offerPrice ?? 0,
        specialPrice,
        hasSpecialPrice,
        stockStatus: p.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
        stockStatusText: p.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
        companyCategoryName: p.company?.category?.categoryName || null,
        companyName: p.company?.companyName || null,
        categoryName: p.category?.categoryName || null,
        subCategoryName: p.subCategory?.title || null,
        status: p.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
        statusText: p.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
        unitText: p.unit ? 'প্রতি ' + p.unit : 'প্রতি ব্যাগ',
        stockText: `${p.stockSize} ${p.unit || 'ব্যাগ'}`,
        minOrderText: `সর্বনিম্ন অর্ডার: ${p.minimumOrder}`,
      };
    });

    return createPaginatedResponse(mappedData, total, page, limit);
  }
}
