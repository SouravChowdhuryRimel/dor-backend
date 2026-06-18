import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { AuthService } from '../../auth/services/auth.service';
import { PrismaService } from '../../../core/database/database.service';
import { CompanySignupDto } from '../dto/company-signup.dto';
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
}
