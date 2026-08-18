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

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly activityLogService: ActivityLogService,
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
        categoryId: subCategory.categoryId,
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

    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      where.companyId = reqUser.sub;
    } else if (query?.companyId) {
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

    const hasPartyRole = reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
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
      let effectivePrice = p.offerPrice || p.regularPrice || p.defaultPrice || 0;
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        effectivePrice = p.partyRates[0].rate;
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      } else if (p.offerPrice !== undefined && p.offerPrice !== null && p.offerPrice > 0) {
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
        companyCategoryName: (p.company as any)?.category?.categoryName || null,
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
    const hasPartyRole = reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
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

    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      if (product.companyId !== reqUser.sub) {
        throw new NotFoundException(`Product not found`);
      }
    }

    let effectivePrice = product.offerPrice || product.regularPrice || product.defaultPrice || 0;
    let hasSpecialPrice = false;
    let specialPrice = null;

    const pAny = product as any;
    if (pAny.partyRates && pAny.partyRates.length > 0) {
      effectivePrice = pAny.partyRates[0].rate;
      hasSpecialPrice = true;
      specialPrice = pAny.partyRates[0].rate;
    } else if (product.offerPrice !== undefined && product.offerPrice !== null && product.offerPrice > 0) {
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
      companyCategoryName:
        (pAny.company as any)?.category?.categoryName || null,
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

    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      if (product.companyId !== reqUser.sub) {
        throw new ForbiddenException(
          `You do not have permission to update this product`,
        );
      }
      delete updateData.companyId;
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
      updateData.categoryId = subCategory.categoryId;
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

    if (reqUser && reqUser.roles && reqUser.roles.includes('VENDOR')) {
      if (product.companyId !== reqUser.sub) {
        throw new ForbiddenException(
          `You do not have permission to delete this product`,
        );
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

  async setPartyRate(dto: SetPartyProductRateDto, reqUser?: any) {
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

  async findSubCategoryProducts(
    subCategoryId: string,
    query?: PaginationQueryDto,
    reqUser?: any,
  ) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where = { subCategoryId };

    const hasPartyRole = reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
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
      let effectivePrice = p.offerPrice || p.regularPrice || p.defaultPrice || 0;
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        effectivePrice = p.partyRates[0].rate;
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      } else if (p.offerPrice !== undefined && p.offerPrice !== null && p.offerPrice > 0) {
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

  async findCompanyProducts(companyId: string, query?: GetProductsQueryDto, reqUser?: any) {
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

    const hasPartyRole = reqUser && reqUser.roles && reqUser.roles.includes('PARTY');
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
      let effectivePrice = p.offerPrice || p.regularPrice || p.defaultPrice || 0;
      let hasSpecialPrice = false;
      let specialPrice = null;

      if (p.partyRates && p.partyRates.length > 0) {
        effectivePrice = p.partyRates[0].rate;
        hasSpecialPrice = true;
        specialPrice = p.partyRates[0].rate;
      } else if (p.offerPrice !== undefined && p.offerPrice !== null && p.offerPrice > 0) {
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
        companyCategoryName: (p.company as any)?.category?.categoryName || null,
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
