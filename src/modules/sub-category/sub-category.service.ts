import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { createPaginatedResponse, PaginationQueryDto } from '../../shared/pagination/pagination.util';

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

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.subCategory.count(),
      this.prisma.subCategory.findMany({
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
