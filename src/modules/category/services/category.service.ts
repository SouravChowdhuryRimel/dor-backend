import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../../shared/pagination/pagination.util';
import { QueryCategoryDto } from '../dto/query-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) { }

  private mapCategoryAdmins(category: any) {
    if (!category) return null;
    const admins = category.adminCategories?.map((ac: any) => ac.user) || [];
    const { adminCategories, ...rest } = category;
    return {
      ...rest,
      admins,
    };
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { adminIds = [], ...categoryData } = createCategoryDto;
    await this.ensureAdminsExist(adminIds);

    const category = await this.prisma.category.create({
      data: {
        ...categoryData,
        adminCategories: {
          create: [...new Set(adminIds)].map((userId) => ({ userId })),
        },
      },
      include: {
        adminCategories: {
          include: { user: true },
        },
      },
    });

    return this.mapCategoryAdmins(category);
  }

  async findAll(query?: QueryCategoryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.search && query.search.trim()) {
      const term = query.search.trim();
      where.categoryName = { contains: term, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        include: {
          adminCategories: {
            include: { user: true },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    const mappedData = data.map((category) => this.mapCategoryAdmins(category));
    return createPaginatedResponse(mappedData, total, page, limit);
  }


  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: id },
      include: {
        adminCategories: {
          include: { user: true },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return this.mapCategoryAdmins(category);
  }

  async findCompaniesByCategoryId(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId },
      select: {
        companies: {
          select: {
            companyId: true,
            phoneNumber: true,
            companyName: true,
            ownerName: true,
            email: true,
            district: true,
            upozela: true,
            address: true,
            status: true,
            isVerified: true,
            companyDocument: true,
            categoryId: true,
            adminId: true,
            createdAt: true,
            updatedAt: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category.companies;
  }

  async findPartiesByCategoryId(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId },
      select: {
        parties: {
          select: {
            partyId: true,
            partyName: true,
            businessName: true,
            phoneNumber: true,
            email: true,
            address: true,
            district: true,
            upozela: true,
            bazzarArea: true,
            description: true,
            openingDue: true,
            creditLimit: true,
            status: true,
            isVerified: true,
            treadLicense: true,
            partyDocument: true,
            profileImage: true,
            companyId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category.parties;
  }

  async findDriversByCategoryId(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return [];
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: id },
    });
    if (!category) throw new NotFoundException('Category not found');

    const { adminIds, ...categoryData } = updateCategoryDto;
    if (adminIds !== undefined) await this.ensureAdminsExist(adminIds);

    if (adminIds !== undefined) {
      await this.prisma.adminCategory.deleteMany({
        where: { categoryId: id },
      });
    }

    const updated = await this.prisma.category.update({
      where: { categoryId: id },
      data: {
        ...categoryData,
        ...(adminIds !== undefined && {
          adminCategories: {
            create: [...new Set(adminIds)].map((userId) => ({ userId })),
          },
        }),
      },
      include: {
        adminCategories: {
          include: { user: true },
        },
      },
    });

    return this.mapCategoryAdmins(updated);
  }

  private async ensureAdminsExist(adminIds: string[]) {
    const uniqueAdminIds = [...new Set(adminIds)];
    if (uniqueAdminIds.length === 0) return;

    const count = await this.prisma.user.count({
      where: {
        id: { in: uniqueAdminIds },
        roles: { has: 'ADMIN' },
      },
    });
    if (count !== uniqueAdminIds.length) {
      throw new NotFoundException(
        'One or more admins were not found or do not have the ADMIN role',
      );
    }
  }

  async removeAdmin(categoryId: string, adminId: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const association = await this.prisma.adminCategory.findUnique({
      where: {
        userId_categoryId: {
          userId: adminId,
          categoryId,
        },
      },
    });
    if (!association) {
      throw new NotFoundException('Admin is not assigned to this category');
    }

    await this.prisma.adminCategory.delete({
      where: {
        userId_categoryId: {
          userId: adminId,
          categoryId,
        },
      },
    });

    return this.findOne(categoryId);
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: id },
    });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.category.delete({
      where: { categoryId: id },
    });
  }
}
