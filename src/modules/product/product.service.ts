import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
        } else {
          where.companyId = 'none';
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
      let effectivePrice =
        p.offerPrice || p.regularPrice || p.defaultPrice || 0;
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        effectivePrice = p.partyRates[0].rate;
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      } else if (
        p.offerPrice !== undefined &&
        p.offerPrice !== null &&
        p.offerPrice > 0
      ) {
        effectivePrice = p.offerPrice;
      } else {
        effectivePrice = p.regularPrice;
      }

      return {
        ...p,
        effectivePrice,
        hasSpecialPrice,
        specialPrice,
        activePrice: effectivePrice,
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

  async findOne(id: string, reqUser?: any) {
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
        if (!party || party.companyId !== product.companyId) {
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

    let effectivePrice =
      product.offerPrice || product.regularPrice || product.defaultPrice || 0;
    let hasSpecialPrice = false;
    let specialPrice = null;

    const pAny = product as any;
    if (pAny.partyRates && pAny.partyRates.length > 0) {
      effectivePrice = pAny.partyRates[0].rate;
      hasSpecialPrice = true;
      specialPrice = pAny.partyRates[0].rate;
    } else if (
      product.offerPrice !== undefined &&
      product.offerPrice !== null &&
      product.offerPrice > 0
    ) {
      effectivePrice = product.offerPrice;
    } else {
      effectivePrice = product.regularPrice;
    }

    return {
      ...product,
      effectivePrice,
      hasSpecialPrice,
      specialPrice,
      activePrice: effectivePrice,
      stockStatus: product.stockSize > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      stockStatusText: product.stockSize > 0 ? 'মজুদ' : 'স্টক আউট',
      companyCategoryName: pAny.company?.category?.categoryName || null,
      companyName: pAny.company?.companyName || null,
      categoryName: pAny.category?.categoryName || null,
      subCategoryName: pAny.subCategory?.title || null,
      status: product.stockSize > 0 ? 'ACTIVE' : 'INACTIVE',
      statusText: product.stockSize > 0 ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      unitText: product.unit ? 'প্রতি ' + product.unit : 'প্রতি ব্যাগ',
      stockText: `${product.stockSize} ${product.unit || 'ব্যাগ'}`,
      minOrderText: `সর্বনিম্ন অর্ডার: ${product.minimumOrder}`,
    };
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
            },
          },
        },
        orderBy: {
          stockSize: 'asc',
        },
      }),
    ]);

    const mappedData = data.map((p) => ({
      ...p,
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
    }));

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
        where.companyId = party.companyId || 'none';
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
      }
    } else if (companyId) {
      where.companyId = companyId;
    }

    const products = await this.prisma.product.findMany({
      where,
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
      let effectivePrice =
        p.offerPrice || p.regularPrice || p.defaultPrice || 0;
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        effectivePrice = p.partyRates[0].rate;
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      } else if (
        p.offerPrice !== undefined &&
        p.offerPrice !== null &&
        p.offerPrice > 0
      ) {
        effectivePrice = p.offerPrice;
      } else {
        effectivePrice = p.regularPrice;
      }

      return {
        ...p,
        effectivePrice,
        hasSpecialPrice,
        specialPrice,
        activePrice: effectivePrice,
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
      let effectivePrice =
        p.offerPrice || p.regularPrice || p.defaultPrice || 0;
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        effectivePrice = p.partyRates[0].rate;
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      } else if (
        p.offerPrice !== undefined &&
        p.offerPrice !== null &&
        p.offerPrice > 0
      ) {
        effectivePrice = p.offerPrice;
      } else {
        effectivePrice = p.regularPrice;
      }

      return {
        ...p,
        effectivePrice,
        hasSpecialPrice,
        specialPrice,
        activePrice: effectivePrice,
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
      let effectivePrice =
        p.offerPrice || p.regularPrice || p.defaultPrice || 0;
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        effectivePrice = p.partyRates[0].rate;
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      } else if (
        p.offerPrice !== undefined &&
        p.offerPrice !== null &&
        p.offerPrice > 0
      ) {
        effectivePrice = p.offerPrice;
      } else {
        effectivePrice = p.regularPrice;
      }

      return {
        ...p,
        effectivePrice,
        hasSpecialPrice,
        specialPrice,
        activePrice: effectivePrice,
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
