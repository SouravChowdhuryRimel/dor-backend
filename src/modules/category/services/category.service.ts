import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.category.findMany();
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: id },
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

    return this.prisma.category.update({
      where: { categoryId: id },
      data: updateCategoryDto,
    });
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
