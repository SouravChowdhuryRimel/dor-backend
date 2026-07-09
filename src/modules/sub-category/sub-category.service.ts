import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Injectable()
export class SubCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSubCategoryDto: CreateSubCategoryDto) {
    return this.prisma.subCategory.create({
      data: createSubCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.subCategory.findMany();
  }

  async findOne(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { subCategoryId: id },
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
