import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { QuerySubCategoryDto } from './dto/query-sub-category.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';

@Injectable()
export class SubCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubCategoryDto: CreateSubCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: createSubCategoryDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${createSubCategoryDto.categoryId}" not found`,
      );
    }

    return this.prisma.subCategory.create({
      data: createSubCategoryDto,
    });
  }

  async findAll(query?: QuerySubCategoryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;

    const targetCategoryId = query?.categoryId || query?.category_id;

    const where: any = {};
    if (targetCategoryId && targetCategoryId.trim() !== '') {
      where.categoryId = targetCategoryId.trim();
    }
    if (query?.search && query.search.trim() !== '') {
      where.title = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.subCategory.count({ where }),
      this.prisma.subCategory.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { subCategoryId: id },
      include: {
        category: true,
      },
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory not found`);
    }
    return subCategory;
  }

  async update(id: string, updateSubCategoryDto: UpdateSubCategoryDto) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { subCategoryId: id },
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory not found`);
    }

    if (updateSubCategoryDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { categoryId: updateSubCategoryDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${updateSubCategoryDto.categoryId}" not found`,
        );
      }
    }

    return this.prisma.subCategory.update({
      where: { subCategoryId: id },
      data: updateSubCategoryDto,
    });
  }

  async remove(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { subCategoryId: id },
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory not found`);
    }

    return this.prisma.subCategory.delete({
      where: { subCategoryId: id },
    });
  }
}
