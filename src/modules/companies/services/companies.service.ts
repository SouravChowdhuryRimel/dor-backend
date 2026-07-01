import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { AuthService } from '../../auth/services/auth.service';
import { PrismaService } from '../../../core/database/database.service';
import { CompanySignupDto } from '../dto/company-signup.dto';
import { CompanyListQueryDto } from '../dto/company-list-query.dto';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  async signUpCompany(dto: CompanySignupDto) {
    try {
      // 1. Validate duplicates
      const phoneExists = await this.usersService.findByPhone(dto.phone);
      if (phoneExists) {
        throw new BadRequestException('User with this phone number already exists');
      }

      const emailExists = await this.usersService.findByEmail(dto.email);
      if (emailExists) {
        throw new BadRequestException('User with this email already exists');
      }

      // 2. Hash password safely
      const hashedPassword = await argon2.hash(dto.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
      });

      // 3. Perform atomic creation in database
      const result = await this.prisma.$transaction(async (tx) => {
        // Create User (Role VENDOR represent Company)
        const user = await tx.user.create({
          data: {
            phone: dto.phone,
            email: dto.email,
            password: hashedPassword,
            name: dto.ownerName, // Owner name maps to user name
            roles: [Role.VENDOR],
          },
        });

        // Create Company Profile
        const profile = await tx.companyProfile.create({
          data: {
            userId: user.id,
            companyName: dto.companyName,
            ownerName: dto.ownerName,
            category: dto.category,
            tradeLicenseCopy: dto.tradeLicenseCopy,
            nidCopyFront: dto.nidCopyFront,
            nidCopyBack: dto.nidCopyBack,
            bankStatementCopy: dto.bankStatementCopy,
          },
        });

        return { user, profile };
      });

      this.logger.log(`Successfully registered company user: ${result.user.id} and profile: ${result.profile.id}`);

      // 4. Trigger OTP Login Flow automatically
      return this.authService.signIn({
        phone: dto.phone,
        password: dto.password,
      });
    } catch (error) {
      this.logger.error(`Failed company signup: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCompaniesForParty(query: CompanyListQueryDto) {
    const { search, category, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isVerified: true, // Only verified companies should be displayed to Parties
    };

    if (category && category.trim() !== '') {
      where.category = {
        equals: category.trim(),
        mode: 'insensitive',
      };
    }

    if (search && search.trim() !== '') {
      const searchLower = search.trim();
      where.OR = [
        { companyName: { contains: searchLower, mode: 'insensitive' } },
        { ownerName: { contains: searchLower, mode: 'insensitive' } },
        { category: { contains: searchLower, mode: 'insensitive' } },
        { district: { contains: searchLower, mode: 'insensitive' } },
        { upazila: { contains: searchLower, mode: 'insensitive' } },
        { detailedAddress: { contains: searchLower, mode: 'insensitive' } },
      ];
    }

    const [total, companies] = await Promise.all([
      this.prisma.companyProfile.count({ where }),
      this.prisma.companyProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          companyName: 'asc',
        },
        include: {
          user: {
            select: {
              phone: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Format the list and append deterministic mock product counts based on the record UUID
    const formattedCompanies = companies.map((company) => {
      const charSum = company.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const totalProducts = 20 + (charSum % 131); // Deterministic random-like count
      return {
        ...company,
        totalProducts,
      };
    });

    return {
      data: formattedCompanies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
