import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import * as argon2 from 'argon2';
import { CompanyStatus } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) { }

  async register(createCompanyDto: CreateCompanyDto) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: createCompanyDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${createCompanyDto.categoryId}" not found. Create a category first.`);
    }

    const hashedPassword = await argon2.hash(createCompanyDto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    return this.prisma.company.create({
      data: {
        ...createCompanyDto,
        password: hashedPassword,
        status: CompanyStatus.PENDING,
      },
      select: {
        companyId: true,
        email: true,
        phoneNumber: true,
        ownerName: true,
        status: true,
        categoryId: true,
        createdAt: true,
      },
    });
  }

  async findPending() {
    return this.prisma.company.findMany({
      where: { status: CompanyStatus.PENDING },
      select: {
        companyId: true,
        email: true,
        phoneNumber: true,
        ownerName: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async approve(companyId: string, adminId: string) {
    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.company.update({
      where: { companyId },
      data: {
        status: CompanyStatus.APPROVED,
        adminId: adminId,
      },
      select: {
        companyId: true,
        email: true,
        status: true,
        adminId: true,
      },
    });
  }

  async findAll() {
    return this.prisma.company.findMany({
      select: {
        companyId: true,
        email: true,
        phoneNumber: true,
        ownerName: true,
        status: true,
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { companyId: id },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { companyId: id },
    });
    if (!company) throw new NotFoundException('Company not found');

    // If updating password, hash it
    const dataToUpdate = { ...updateCompanyDto };
    if (dataToUpdate.password) {
      dataToUpdate.password = await argon2.hash(dataToUpdate.password);
    }

    return this.prisma.company.update({
      where: { companyId: id },
      data: dataToUpdate,
    });
  }

  async remove(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { companyId: id },
    });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.company.delete({ where: { companyId: id } });
  }

  async findByEmail(email: string) {
    return this.prisma.company.findUnique({
      where: { email },
    });
  }
}
