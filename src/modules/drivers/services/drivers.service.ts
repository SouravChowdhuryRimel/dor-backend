import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { AuthService } from '../../auth/services/auth.service';
import { PrismaService } from '../../../core/database/database.service';
import { DriverSignupDto } from '../dto/driver-signup.dto';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  async signUpDriver(dto: DriverSignupDto) {
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
        // Create User
        const user = await tx.user.create({
          data: {
            phone: dto.phone,
            email: dto.email,
            password: hashedPassword,
            name: dto.name,
            roles: [Role.DRIVER],
          },
        });

        // Create Driver Profile
        const profile = await tx.driverProfile.create({
          data: {
            userId: user.id,
            avatar: dto.avatar,
            presentAddress: dto.presentAddress,
            district: dto.district,
            upazila: dto.upazila,
            truckNumber: dto.truckNumber,
            truckType: dto.truckType,
            loadCapacity: dto.loadCapacity,
            drivingLicenseNumber: dto.drivingLicenseNumber,
            nidNumber: dto.nidNumber,
            nidCopyFront: dto.nidCopyFront,
            nidCopyBack: dto.nidCopyBack,
            drivingLicenseCopy: dto.drivingLicenseCopy,
            truckPhoto: dto.truckPhoto,
          },
        });

        return { user, profile };
      });

      this.logger.log(`Successfully registered driver user: ${result.user.id} and profile: ${result.profile.id}`);

      // 4. Trigger OTP Login Flow automatically
      return this.authService.signIn({
        phone: dto.phone,
        password: dto.password,
      });
    } catch (error) {
      this.logger.error(`Failed driver signup: ${error.message}`, error.stack);
      throw error;
    }
  }
}
