import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import * as argon2 from 'argon2';
import { CompanyStatus, Prisma } from '@prisma/client';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../../shared/pagination/pagination.util';
import { ActivityLogService } from '../../activity-log/activity-log.service';

import { NotificationService } from '../../notification/notification.service';
import { NotificationGateway } from '../../notification/notification.gateway';

const companyDetailsSelect = {
  companyId: true,
  phoneNumber: true,
  companyName: true,
  ownerName: true,
  email: true,
  latitude: true,
  longitude: true,
  district: true,
  upozela: true,
  address: true,
  status: true,
  isVerified: true,
  incomeTax: true,
  companyDocument: true,
  companyImage: true,
  keywords: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      categoryId: true,
      categoryName: true,
    },
  },
} satisfies Prisma.CompanySelect;

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async register(createCompanyDto: CreateCompanyDto) {
    const category = await this.prisma.category.findUnique({
      where: { categoryId: createCompanyDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${createCompanyDto.categoryId}" not found. Create a category first.`,
      );
    }

    if (createCompanyDto.keywords && createCompanyDto.keywords.length > 0) {
      createCompanyDto.keywords = await this.validateKeywordsAgainstMasterList(
        createCompanyDto.keywords,
      );
    }

    const hashedPassword = await argon2.hash(createCompanyDto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    const company = await this.prisma.company.create({
      data: {
        ...createCompanyDto,
        password: hashedPassword,
        status: CompanyStatus.PENDING,
      },
      select: {
        companyId: true,
        email: true,
        phoneNumber: true,
        companyName: true,
        ownerName: true,
        latitude: true,
        longitude: true,
        status: true,
        isVerified: true,
        incomeTax: true,
        companyDocument: true,
        companyImage: true,
        keywords: true,
        categoryId: true,
        createdAt: true,
      },
    });

    await this.activityLogService.log({
      actorType: 'COMPANY',
      actorId: company.companyId,
      action: 'REGISTER_COMPANY',
      description: `Registered new company: ${company.companyName}`,
    });

    // Notify all Admins in Bangla
    const adminUsers = await this.prisma.user.findMany({
      where: {
        roles: {
          hasSome: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      select: { id: true },
    });

    const notifTitle = 'নতুন কোম্পানি নিবন্ধন';
    const notifMessage = `নতুন কোম্পানি "${company.companyName}" নিবন্ধনের জন্য আবেদন করেছে। (ফোন: ${company.phoneNumber})`;

    for (const admin of adminUsers) {
      await this.notificationService.sendNotification({
        title: notifTitle,
        message: notifMessage,
        userId: admin.id,
        data: {
          type: 'NEW_COMPANY_REGISTERED',
          companyId: company.companyId,
        },
      });
    }

    this.notificationGateway.sendNotificationToAdmin({
      title: notifTitle,
      message: notifMessage,
      companyId: company.companyId,
      createdAt: new Date(),
    });

    return company;
  }

  async findPending(query?: PaginationQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;
    const where = { status: CompanyStatus.PENDING };

    const [total, data] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        select: {
          companyId: true,
          email: true,
          phoneNumber: true,
          companyName: true,
          ownerName: true,
          status: true,
          isVerified: true,
          incomeTax: true,
          companyDocument: true,
          companyImage: true,
          createdAt: true,
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findVerified(query?: PaginationQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;
    const where = { isVerified: true };

    const [total, data] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        select: companyDetailsSelect,
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async approve(companyId: string, adminId: string, reqUser?: any) {
    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const updatedCompany = await this.prisma.company.update({
      where: { companyId },
      data: {
        status: CompanyStatus.APPROVED,
        adminId: adminId,
        isVerified: true,
      },
      select: {
        companyId: true,
        email: true,
        status: true,
        adminId: true,
        isVerified: true,
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'ADMIN',
      actorId: adminId,
      action: 'APPROVE_COMPANY',
      description: `Approved company registration: ${company.companyName}`,
      companyId,
    });

    return updatedCompany;
  }

  async findAll(query?: PaginationQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.findMany({
        skip,
        take: limit,
        select: companyDetailsSelect,
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { companyId: id },
      select: companyDetailsSelect,
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, reqUser?: any) {
    const company = await this.prisma.company.findUnique({
      where: { companyId: id },
    });
    if (!company) throw new NotFoundException('Company not found');

    if (updateCompanyDto.keywords && updateCompanyDto.keywords.length > 0) {
      updateCompanyDto.keywords = await this.validateKeywordsAgainstMasterList(
        updateCompanyDto.keywords,
      );
    }

    const updatedCompany = await this.prisma.company.update({
      where: { companyId: id },
      data: updateCompanyDto,
      select: companyDetailsSelect,
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'COMPANY',
      actorId: reqUser?.sub || id,
      action: 'UPDATE_COMPANY',
      description: `Updated company: ${updatedCompany.companyName}`,
      companyId: id,
    });

    return updatedCompany;
  }

  async remove(id: string, reqUser?: any) {
    const company = await this.prisma.company.findUnique({
      where: { companyId: id },
    });
    if (!company) throw new NotFoundException('Company not found');

    const deletedCompany = await this.prisma.company.delete({
      where: { companyId: id },
      select: companyDetailsSelect,
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles?.[0] || 'COMPANY',
      actorId: reqUser?.sub || id,
      action: 'DELETE_COMPANY',
      description: `Deleted company: ${deletedCompany.companyName}`,
      companyId: id,
    });

    return deletedCompany;
  }

  async findByEmail(email: string) {
    return this.prisma.company.findUnique({
      where: { email },
    });
  }

  async updatePassword(companyId: string, password: string): Promise<void> {
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.company.update({
      where: { companyId },
      data: { password: hashedPassword },
    });
  }

  async getCompanyDrivers(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const companyDrivers = await this.prisma.companyDriver.findMany({
      where: { companyId },
      include: {
        driver: {
          include: {
            partyDrivers: {
              include: {
                party: {
                  select: {
                    partyId: true,
                    partyName: true,
                    businessName: true,
                    phoneNumber: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return companyDrivers.map((cd) => {
      const driver = cd.driver;
      const parties = driver.partyDrivers.map((pd) => pd.party);
      const { companyDrivers, partyDrivers, password, ...driverInfo } =
        driver as any;
      return {
        ...driverInfo,
        parties,
      };
    });
  }

  async findByPhone(phoneNumber: string) {
    return this.prisma.company.findFirst({
      where: { phoneNumber },
    });
  }

  async updateKeywords(companyId: string, keywords: string[], reqUser?: any) {
    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const cleanKeywords = await this.validateKeywordsAgainstMasterList(keywords);

    return this.update(companyId, { keywords: cleanKeywords }, reqUser);
  }

  async addKeywords(companyId: string, newKeywords: string[], reqUser?: any) {
    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const validatedNewKeywords =
      await this.validateKeywordsAgainstMasterList(newKeywords);
    const currentKeywords = company.keywords || [];
    const combined = Array.from(
      new Set([...currentKeywords, ...validatedNewKeywords]),
    );

    return this.update(companyId, { keywords: combined }, reqUser);
  }

  async removeKeywords(
    companyId: string,
    keywordsToRemove: string[],
    reqUser?: any,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const currentKeywords = company.keywords || [];
    const toRemoveSet = new Set(
      keywordsToRemove.map((k) => k.trim().toLowerCase()),
    );
    const filtered = currentKeywords.filter(
      (k) => !toRemoveSet.has(k.trim().toLowerCase()),
    );

    return this.update(companyId, { keywords: filtered }, reqUser);
  }

  private async validateKeywordsAgainstMasterList(
    keywords: string[],
  ): Promise<string[]> {
    const cleaned = Array.from(
      new Set(keywords.map((k) => k.trim()).filter((k) => k.length > 0)),
    );
    if (cleaned.length === 0) return [];

    const existing = await this.prisma.keyword.findMany({
      where: { name: { in: cleaned } },
      select: { name: true },
    });
    const validNames = new Set(
      existing.map((e) => e.name.trim().toLowerCase()),
    );
    const invalid = cleaned.filter(
      (k) => !validNames.has(k.toLowerCase()),
    );

    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid keyword(s): "${invalid.join(', ')}". You can only select keywords from the official admin keyword list.`,
      );
    }

    const nameMap = new Map(
      existing.map((e) => [e.name.toLowerCase(), e.name]),
    );
    return cleaned.map((k) => nameMap.get(k.toLowerCase()) || k);
  }
}
