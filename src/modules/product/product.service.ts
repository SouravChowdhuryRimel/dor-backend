import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { subCategoryId: createProductDto.subCategoryId },
    });
    if (!subCategory) {
      throw new NotFoundException(
        `SubCategory with ID "${createProductDto.subCategoryId}" not found.`,
      );
    }

    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        subCategory: true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { productId: id },
      include: {
        subCategory: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }
    return product;
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

    return this.prisma.product.update({
      where: { productId: id },
      data: updateProductDto,
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
}
