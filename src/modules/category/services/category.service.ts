import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { adminIds = [], ...categoryData } = createCategoryDto;
    await this.ensureAdminsExist(adminIds);

    return this.prisma.category.create({
      data: {
        ...categoryData,
        admins: {
          connect: [...new Set(adminIds)].map((id) => ({ id })),
        },
      },
      include: { admins: true },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({ include: { admins: true } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: id },
      include: { admins: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
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

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: id },
    });
    if (!category) throw new NotFoundException('Category not found');

    const { adminIds, ...categoryData } = updateCategoryDto;
    if (adminIds !== undefined) await this.ensureAdminsExist(adminIds);

    return this.prisma.category.update({
      where: { categoryId: id },
      data: {
        ...categoryData,
        ...(adminIds !== undefined && {
          admins: { set: [...new Set(adminIds)].map((id) => ({ id })) },
        }),
      },
      include: { admins: true },
    });
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
      throw new NotFoundException('One or more admins were not found or do not have the ADMIN role');
    }
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
