import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../../users/services/users.service';
import { RedisService } from '../../../core/cache/redis.service';
import { LoginDto } from '../dto/login.dto';
import { PartyLoginDto } from '../dto/party-login.dto';
import { RegisterDto } from '../dto/register.dto';
import { Role, CompanyStatus } from '@prisma/client';
import { CompanyService } from '../../company/services/company.service';
import { PartyService } from '../../party/services/party.service';
import { DriverService } from '../../driver/services/driver.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { PrismaService } from 'src/core/database/database.service';

type PasswordResetAccount = {
  id: string;
  email: string;
  accountType: 'user' | 'company' | 'party' | 'driver';
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private companyService: CompanyService,
    private partyService: PartyService,
    private driverService: DriverService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private activityLogService: ActivityLogService,
    private prisma: PrismaService,
  ) {}

  private async getAdminCategoryInfo(userId: string) {
    const adminCategories = await this.prisma.adminCategory.findMany({
      where: { userId },
    });
    const categoryIds = adminCategories.map((ac) => ac.categoryId);
    return {
      categoryId: categoryIds[0] || null,
      categoryIds,
    };
  }

  async signUp(registerDto: RegisterDto) {
    try {
      const userExists = await this.usersService.findByPhone(
        registerDto.phoneNumber,
      );
      if (userExists) {
        throw new BadRequestException('User already exists');
      }

      // Hash password safely. Argon2 is highly CPU-bound.
      const hashedPassword = await argon2.hash(registerDto.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
      });

      const newUser = await this.usersService.create({
        ...registerDto,
        password: hashedPassword,
      });

      const tokens = await this.getTokens(
        newUser.id,
        newUser.email,
        newUser.roles,
      );

      // Persist the session reference in Redis (no DB hit)
      await this.storeSession(newUser.id, tokens.refreshToken);

      await this.activityLogService.log({
        actorType: newUser.roles[0] || 'USER',
        actorId: newUser.id,
        action: 'SIGNUP',
        description: `Registered new user account: ${newUser.name || newUser.email || newUser.phoneNumber}`,
      });

      const catInfo = await this.getAdminCategoryInfo(newUser.id);

      return {
        ...tokens,
        user: {
          id: newUser.id,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          name: newUser.name,
          roles: newUser.roles,
          categoryId: catInfo.categoryId,
          categoryIds: catInfo.categoryIds,
          businessName: null,
          district: null,
          upozela: null,
          address: null,
          bazzarArea: null,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          isVerified:
            newUser.roles.includes(Role.SUPER_ADMIN) ||
            newUser.roles.includes(Role.ADMIN),
          status: 'APPROVED',
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to register user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async signIn(loginDto: LoginDto) {
    try {
      const incomingFcmToken = loginDto.fcmToken;

      // 1. Check User table
      const user = await this.usersService.findByPhone(loginDto.phoneNumber);
      if (user) {
        if (!user.isActive) {
          throw new ForbiddenException('Access Denied: Account is inactive');
        }

        const passwordMatches = await argon2.verify(
          user.password,
          loginDto.password,
        );
        if (!passwordMatches) throw new UnauthorizedException('Access Denied');

        if (incomingFcmToken) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { fcmToken: incomingFcmToken },
          });
        }

        const tokens = await this.getTokens(user.id, user.email, user.roles);
        await this.storeSession(user.id, tokens.refreshToken);

        await this.activityLogService.log({
          actorType: user.roles[0] || 'USER',
          actorId: user.id,
          action: 'LOGIN',
          description: `User/Admin logged in: ${user.name || user.email || user.phoneNumber}`,
        });

        const catInfo = await this.getAdminCategoryInfo(user.id);

        return {
          ...tokens,
          user: {
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            name: user.name,
            roles: user.roles,
            categoryId: catInfo.categoryId,
            categoryIds: catInfo.categoryIds,
            fcmToken: incomingFcmToken || user.fcmToken || null,
            businessName: null,
            district: null,
            upozela: null,
            address: null,
            bazzarArea: null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isVerified:
              user.roles.includes(Role.SUPER_ADMIN) ||
              user.roles.includes(Role.ADMIN),
            status: 'APPROVED',
          },
        };
      }

      // 2. Check Company table
      const company = await this.companyService.findByPhone(
        loginDto.phoneNumber,
      );
      if (company) {
        if (company.status === CompanyStatus.BLOCKED || company.status === CompanyStatus.REJECTED || !company.isVerified) {
          throw new ForbiddenException('Access Denied: Account has been deactivated or deleted');
        }

        const passwordMatches = await argon2.verify(
          company.password,
          loginDto.password,
        );
        if (!passwordMatches) throw new UnauthorizedException('Access Denied');

        if (incomingFcmToken) {
          await this.prisma.company.update({
            where: { companyId: company.companyId },
            data: { fcmToken: incomingFcmToken },
          });
        }

        const tokens = await this.getTokens(company.companyId, company.email, [
          Role.VENDOR,
        ]);
        await this.storeSession(company.companyId, tokens.refreshToken);

        await this.activityLogService.log({
          actorType: 'COMPANY',
          actorId: company.companyId,
          action: 'LOGIN',
          description: `Company logged in: ${company.companyName}`,
        });

        return {
          ...tokens,
          user: {
            id: company.companyId,
            email: company.email,
            phoneNumber: company.phoneNumber,
            name: company.ownerName,
            roles: [Role.VENDOR],
            categoryId: company.categoryId,
            fcmToken: incomingFcmToken || company.fcmToken || null,
            businessName: company.companyName,
            latitude: company.latitude,
            longitude: company.longitude,
            district: company.district,
            upozela: company.upozela,
            address: company.address,
            bazzarArea: null,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
            isVerified: company.isVerified,
            status: company.status,
          },
        };
      }

      // 3. Check Party table
      const party = await this.partyService.findByPhone(loginDto.phoneNumber);
      if (party) {
        if (party.status === 'INACTIVE') {
          throw new ForbiddenException('Access Denied: Account has been deactivated or deleted');
        }

        const passwordMatches = await argon2.verify(
          party.password,
          loginDto.password,
        );
        if (!passwordMatches) throw new UnauthorizedException('Access Denied');

        if (incomingFcmToken) {
          await this.prisma.party.update({
            where: { partyId: party.partyId },
            data: { fcmToken: incomingFcmToken },
          });
        }

        const tokens = await this.getTokens(party.partyId, party.phoneNumber, [
          Role.PARTY,
        ]);
        await this.storeSession(party.partyId, tokens.refreshToken);

        await this.activityLogService.log({
          actorType: 'PARTY',
          actorId: party.partyId,
          action: 'LOGIN',
          description: `Party logged in: ${party.partyName}`,
        });

        return {
          ...tokens,
          user: {
            id: party.partyId,
            email: party.email,
            phoneNumber: party.phoneNumber,
            name: party.partyName,
            roles: [Role.PARTY],
            categoryId: party.categoryId,
            fcmToken: incomingFcmToken || party.fcmToken || null,
            businessName: party.businessName,
            district: party.district,
            upozela: party.upozela,
            address: party.address,
            bazzarArea: party.bazzarArea,
            createdAt: party.createdAt,
            updatedAt: party.updatedAt,
            isVerified: party.isVerified,
            status: party.status,
          },
        };
      }

      // 4. Check Driver table
      const driver = await this.driverService.findByPhone(loginDto.phoneNumber);
      if (driver) {
        if (!driver.isVerified) {
          throw new ForbiddenException('Access Denied: Account has been deactivated or deleted');
        }
        const passwordMatches = await argon2.verify(
          driver.password,
          loginDto.password,
        );
        if (!passwordMatches) throw new UnauthorizedException('Access Denied');

        if (incomingFcmToken) {
          await this.prisma.driver.update({
            where: { driverId: driver.driverId },
            data: { fcmToken: incomingFcmToken },
          });
        }

        const tokens = await this.getTokens(driver.driverId, driver.email, [
          Role.DRIVER,
        ]);
        await this.storeSession(driver.driverId, tokens.refreshToken);

        await this.activityLogService.log({
          actorType: 'DRIVER',
          actorId: driver.driverId,
          action: 'LOGIN',
          description: `Driver logged in: ${driver.driverName}`,
        });

        return {
          ...tokens,
          user: {
            id: driver.driverId,
            email: driver.email,
            phoneNumber: driver.phoneNumber,
            name: driver.driverName,
            roles: [Role.DRIVER],
            categoryId: null,
            fcmToken: incomingFcmToken || driver.fcmToken || null,
            businessName: null,
            district: driver.district,
            upozela: driver.upozela,
            address: driver.address,
            bazzarArea: null,
            createdAt: driver.createdAt,
            updatedAt: driver.updatedAt,
            isVerified: driver.isVerified,
            status: 'APPROVED',
          },
        };
      }

      throw new UnauthorizedException('Access Denied: Invalid credentials');
    } catch (error) {
      this.logger.error(
        `Failed login attempt for phone ${loginDto.phoneNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async signInCompany(loginDto: LoginDto) {
    try {
      const incomingFcmToken = loginDto.fcmToken;
      const company = await this.companyService.findByPhone(
        loginDto.phoneNumber,
      );
      if (!company) throw new UnauthorizedException('Access Denied');

      if (company.status === CompanyStatus.BLOCKED || company.status === CompanyStatus.REJECTED || !company.isVerified) {
        throw new ForbiddenException('Access Denied: Account has been deactivated or deleted');
      }

      const passwordMatches = await argon2.verify(
        company.password,
        loginDto.password,
      );
      if (!passwordMatches) throw new UnauthorizedException('Access Denied');

      if (incomingFcmToken) {
        await this.prisma.company.update({
          where: { companyId: company.companyId },
          data: { fcmToken: incomingFcmToken },
        });
      }

      // Issue token with VENDOR role for companies
      const tokens = await this.getTokens(company.companyId, company.email, [
        Role.VENDOR,
      ]);

      await this.storeSession(company.companyId, tokens.refreshToken);

      await this.activityLogService.log({
        actorType: 'COMPANY',
        actorId: company.companyId,
        action: 'LOGIN',
        description: `Company logged in: ${company.companyName}`,
      });

      return {
        ...tokens,
        user: {
          id: company.companyId,
          email: company.email,
          phoneNumber: company.phoneNumber,
          name: company.ownerName,
          roles: [Role.VENDOR],
          categoryId: company.categoryId,
          fcmToken: incomingFcmToken || company.fcmToken || null,
          businessName: company.companyName,
          latitude: company.latitude,
          longitude: company.longitude,
          district: company.district,
          upozela: company.upozela,
          address: company.address,
          bazzarArea: null,
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
          isVerified: company.isVerified,
          status: company.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed company login attempt for phone ${loginDto.phoneNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async signInParty(partyLoginDto: PartyLoginDto) {
    try {
      const incomingFcmToken = partyLoginDto.fcmToken;
      const party = await this.partyService.findByPhone(
        partyLoginDto.phoneNumber,
      );
      if (!party)
        throw new UnauthorizedException('Access Denied: Party not found');

      if (party.status === 'INACTIVE') {
        throw new ForbiddenException('Access Denied: Account has been deactivated or deleted');
      }

      const passwordMatches = await argon2.verify(
        party.password,
        partyLoginDto.password,
      );
      if (!passwordMatches)
        throw new UnauthorizedException('Access Denied: Incorrect Password');

      if (incomingFcmToken) {
        await this.prisma.party.update({
          where: { partyId: party.partyId },
          data: { fcmToken: incomingFcmToken },
        });
      }

      // Issue token with PARTY role for independent party users
      const tokens = await this.getTokens(party.partyId, party.phoneNumber, [
        Role.PARTY,
      ]);

      await this.storeSession(party.partyId, tokens.refreshToken);

      await this.activityLogService.log({
        actorType: 'PARTY',
        actorId: party.partyId,
        action: 'LOGIN',
        description: `Party logged in: ${party.partyName}`,
      });

      return {
        ...tokens,
        user: {
          id: party.partyId,
          email: party.email,
          phoneNumber: party.phoneNumber,
          name: party.partyName,
          roles: [Role.PARTY],
          categoryId: party.categoryId,
          fcmToken: incomingFcmToken || party.fcmToken || null,
          businessName: party.businessName,
          district: party.district,
          upozela: party.upozela,
          address: party.address,
          bazzarArea: party.bazzarArea,
          createdAt: party.createdAt,
          updatedAt: party.updatedAt,
          isVerified: party.isVerified,
          status: party.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed party login attempt for phone ${partyLoginDto.phoneNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const account = await this.findPasswordResetAccount(
      forgotPasswordDto.email,
      forgotPasswordDto.role,
    );

    let token = '';

    // Always return the same response to avoid email-account enumeration.
    if (account) {
      token = randomBytes(32).toString('hex');
      const ttlSeconds = 15 * 60;

      await this.redisService.setJson(
        `password-reset:${token}`,
        account,
        ttlSeconds,
      );

      try {
        await this.sendPasswordResetEmail(account.email, token);
      } catch (error) {
        this.logger.error(`Failed to send password-reset email: ${error.message}`);
        // Do not throw the error if SMTP is not configured or in non-production environments
        const isProd = this.configService.get<string>('NODE_ENV') === 'production';
        const hasSmtp = !!this.configService.get<string>('SMTP_HOST');
        if (isProd && hasSmtp) {
          throw error;
        }
      }
    }

    const response: any = {
      message:
        'If an account exists for this email, a password-reset token has been sent.',
    };

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const hasSmtp = !!this.configService.get<string>('SMTP_HOST');
    if (account && (!isProd || !hasSmtp)) {
      response.token = token;
    }

    return response;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    let account: PasswordResetAccount | null = null;
    const key = `password-reset:${resetPasswordDto.token}`;

    // 1. Try to find the token in Redis first (standard hex token flow)
    account = await this.redisService.getJson<PasswordResetAccount>(key);

    if (account) {
      // Consume the token before updating the password so it cannot be reused.
      await this.redisService.del(key);
    } else {
      // 2. Fallback to JWT verification if token is a JWT
      try {
        let payload: any = null;
        // Try verifying with JWT_SECRET (Access Token)
        try {
          payload = await this.jwtService.verifyAsync(resetPasswordDto.token, {
            secret: this.configService.get<string>('JWT_SECRET'),
          });
        } catch (accessErr) {
          // If access token verification fails, try with JWT_REFRESH_SECRET (Refresh Token)
          payload = await this.jwtService.verifyAsync(resetPasswordDto.token, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          });
        }

        if (payload && payload.sub) {
          const roles = payload.roles || [];
          let accountType: 'user' | 'company' | 'party' | 'driver' = 'user';

          if (roles.includes(Role.VENDOR)) {
            accountType = 'company';
          } else if (roles.includes(Role.PARTY)) {
            accountType = 'party';
          } else if (roles.includes(Role.DRIVER)) {
            accountType = 'driver';
          }

          account = {
            id: payload.sub,
            email: payload.email || '',
            accountType,
          };
        }
      } catch (jwtError) {
        this.logger.error(
          `Failed to verify password-reset token as JWT: ${jwtError.message}`,
        );
      }
    }

    if (!account) {
      throw new BadRequestException('Invalid or expired password-reset token');
    }

    switch (account.accountType) {
      case 'user':
        await this.usersService.updatePassword(
          account.id,
          resetPasswordDto.password,
        );
        break;
      case 'company':
        await this.companyService.updatePassword(
          account.id,
          resetPasswordDto.password,
        );
        break;
      case 'party':
        await this.partyService.updatePassword(
          account.id,
          resetPasswordDto.password,
        );
        break;
      case 'driver':
        await this.driverService.updatePassword(
          account.id,
          resetPasswordDto.password,
        );
        break;
    }

    await this.redisService.del(`session:${account.id}`);
    return { message: 'Password reset successfully. Please sign in again.' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    let storedHashedPassword = '';
    let accountType: 'user' | 'company' | 'party' | 'driver' = 'user';

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      storedHashedPassword = user.password;
      accountType = 'user';
    } else {
      const company = await this.prisma.company.findUnique({
        where: { companyId: userId },
      });
      if (company) {
        storedHashedPassword = company.password;
        accountType = 'company';
      } else {
        const party = await this.prisma.party.findUnique({
          where: { partyId: userId },
        });
        if (party) {
          storedHashedPassword = party.password;
          accountType = 'party';
        } else {
          const driver = await this.prisma.driver.findUnique({
            where: { driverId: userId },
          });
          if (driver) {
            storedHashedPassword = driver.password;
            accountType = 'driver';
          }
        }
      }
    }

    if (!storedHashedPassword) {
      throw new NotFoundException('Account not found');
    }

    const isMatch = await argon2.verify(storedHashedPassword, currentPassword);
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password');
    }

    switch (accountType) {
      case 'user':
        await this.usersService.updatePassword(userId, newPassword);
        break;
      case 'company':
        await this.companyService.updatePassword(userId, newPassword);
        break;
      case 'party':
        await this.partyService.updatePassword(userId, newPassword);
        break;
      case 'driver':
        await this.driverService.updatePassword(userId, newPassword);
        break;
    }

    await this.activityLogService.log({
      actorType: accountType.toUpperCase(),
      actorId: userId,
      action: 'CHANGE_PASSWORD',
      description: `${accountType.toUpperCase()} changed password successfully`,
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async softDeleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      await this.redisService.del(`session:${userId}`);
      await this.activityLogService.log({
        actorType: user.roles[0] || 'USER',
        actorId: userId,
        action: 'DELETE_ACCOUNT',
        description: `User account soft-deleted: ${user.phoneNumber}`,
      });
      return { success: true, message: 'User profile soft-deleted successfully' };
    }

    const company = await this.prisma.company.findUnique({
      where: { companyId: userId },
    });
    if (company) {
      await this.prisma.company.update({
        where: { companyId: userId },
        data: { status: CompanyStatus.BLOCKED, isVerified: false },
      });
      await this.redisService.del(`session:${userId}`);
      await this.activityLogService.log({
        actorType: 'COMPANY',
        actorId: userId,
        action: 'DELETE_ACCOUNT',
        description: `Company account soft-deleted: ${company.companyName}`,
      });
      return { success: true, message: 'Company profile soft-deleted successfully' };
    }

    const party = await this.prisma.party.findUnique({
      where: { partyId: userId },
    });
    if (party) {
      await this.prisma.party.update({
        where: { partyId: userId },
        data: { status: 'INACTIVE' },
      });
      await this.redisService.del(`session:${userId}`);
      await this.activityLogService.log({
        actorType: 'PARTY',
        actorId: userId,
        action: 'DELETE_ACCOUNT',
        description: `Party account soft-deleted: ${party.partyName}`,
      });
      return { success: true, message: 'Party profile soft-deleted successfully' };
    }

    const driver = await this.prisma.driver.findUnique({
      where: { driverId: userId },
    });
    if (driver) {
      await this.prisma.driver.update({
        where: { driverId: userId },
        data: { isVerified: false },
      });
      await this.redisService.del(`session:${userId}`);
      await this.activityLogService.log({
        actorType: 'DRIVER',
        actorId: userId,
        action: 'DELETE_ACCOUNT',
        description: `Driver account soft-deleted: ${driver.driverName}`,
      });
      return { success: true, message: 'Driver profile soft-deleted successfully' };
    }

    throw new NotFoundException('Account not found');
  }

  async logout(userId: string) {
    try {
      let actorType = 'USER';
      const u = await this.usersService.findById(userId);
      if (u) {
        actorType = u.roles[0] || 'USER';
      } else {
        const c = await this.companyService.findOne(userId).catch(() => null);
        if (c) {
          actorType = 'COMPANY';
        } else {
          const p = await this.partyService.findOne(userId).catch(() => null);
          if (p) {
            actorType = 'PARTY';
          } else {
            const d = await this.driverService
              .findOne(userId)
              .catch(() => null);
            if (d) {
              actorType = 'DRIVER';
            }
          }
        }
      }

      await this.activityLogService.log({
        actorType,
        actorId: userId,
        action: 'LOGOUT',
        description: `${actorType} logged out successfully`,
      });

      // Clear transient session from memory cache instantly. Zero DB overhead.
      await this.redisService.del(`session:${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error destroying session during logout for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    tokenType?: string,
  ) {
    try {
      const activeSessionToken = await this.redisService.get(
        `session:${userId}`,
      );

      if (tokenType !== 'access') {
        if (!activeSessionToken || activeSessionToken !== refreshToken) {
          throw new ForbiddenException(
            'Access Denied - Session Expired or Revoked',
          );
        }
      } else {
        if (!activeSessionToken) {
          throw new ForbiddenException(
            'Access Denied - Session Expired or Revoked',
          );
        }
      }

      // 1. Check User table
      const user = await this.usersService.findById(userId);
      if (user) {
        if (!user.isActive) {
          throw new ForbiddenException('Access Denied: Account is inactive');
        }

        const tokens = await this.getTokens(user.id, user.email, user.roles);
        await this.storeSession(user.id, tokens.refreshToken);

        const catInfo = await this.getAdminCategoryInfo(user.id);

        return {
          ...tokens,
          user: {
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            name: user.name,
            roles: user.roles,
            categoryId: catInfo.categoryId,
            categoryIds: catInfo.categoryIds,
            businessName: null,
            district: null,
            upozela: null,
            address: null,
            bazzarArea: null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isVerified:
              user.roles.includes(Role.SUPER_ADMIN) ||
              user.roles.includes(Role.ADMIN),
            status: 'APPROVED',
          },
        };
      }

      // 2. Check Company table
      const company = await this.companyService
        .findOne(userId)
        .catch(() => null);
      if (company) {
        const tokens = await this.getTokens(company.companyId, company.email, [
          Role.VENDOR,
        ]);
        await this.storeSession(company.companyId, tokens.refreshToken);

        return {
          ...tokens,
          user: {
            id: company.companyId,
            email: company.email,
            phoneNumber: company.phoneNumber,
            name: company.ownerName,
            roles: [Role.VENDOR],
            categoryId: company.categoryId,
            businessName: company.companyName,
            district: company.district,
            upozela: company.upozela,
            address: company.address,
            bazzarArea: null,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
            isVerified: company.isVerified,
            status: company.status,
          },
        };
      }

      // 3. Check Party table
      const party = await this.partyService.findOne(userId).catch(() => null);
      if (party) {
        const tokens = await this.getTokens(party.partyId, party.phoneNumber, [
          Role.PARTY,
        ]);
        await this.storeSession(party.partyId, tokens.refreshToken);

        return {
          ...tokens,
          user: {
            id: party.partyId,
            email: party.email,
            phoneNumber: party.phoneNumber,
            name: party.partyName,
            roles: [Role.PARTY],
            categoryId: party.categoryId,
            businessName: party.businessName,
            district: party.district,
            upozela: party.upozela,
            address: party.address,
            bazzarArea: party.bazzarArea,
            createdAt: party.createdAt,
            updatedAt: party.updatedAt,
            isVerified: party.isVerified,
            status: party.status,
          },
        };
      }

      // 4. Check Driver table
      const driver = await this.driverService.findOne(userId).catch(() => null);
      if (driver) {
        const tokens = await this.getTokens(driver.driverId, driver.email, [
          Role.DRIVER,
        ]);
        await this.storeSession(driver.driverId, tokens.refreshToken);

        return {
          ...tokens,
          user: {
            id: driver.driverId,
            email: driver.email,
            phoneNumber: driver.phoneNumber,
            name: driver.driverName,
            roles: [Role.DRIVER],
            categoryId: null,
            businessName: null,
            district: driver.district,
            upozela: driver.upozela,
            address: driver.address,
            bazzarArea: null,
            createdAt: driver.createdAt,
            updatedAt: driver.updatedAt,
            isVerified: driver.isVerified,
            status: 'APPROVED',
          },
        };
      }

      throw new ForbiddenException('Access Denied');
    } catch (error) {
      this.logger.error(
        `Failed to refresh session tokens for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async storeSession(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const key = `session:${userId}`;
    const ttlDays = 7;
    const ttlSeconds = ttlDays * 24 * 60 * 60; // Sync with refresh token expiration

    try {
      const result = await this.redisService.set(key, refreshToken, ttlSeconds);
      if (result !== 'OK') {
        throw new Error('Redis session storage failed to return OK status');
      }
    } catch (error) {
      this.logger.error(
        `Cache persistence failure for user session ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Internal session storage service unavailable');
    }
  }

  private async findPasswordResetAccount(
    email: string,
    role?: Role,
  ): Promise<PasswordResetAccount | null> {
    if (
      !role ||
      role === Role.USER ||
      role === Role.ADMIN ||
      role === Role.SUPER_ADMIN
    ) {
      const user = await this.usersService.findByEmail(email);
      if (user && (!role || user.roles.includes(role))) {
        return { id: user.id, email, accountType: 'user' };
      }
    }

    if (!role || role === Role.VENDOR) {
      const company = await this.companyService.findByEmail(email);
      if (company) {
        return { id: company.companyId, email, accountType: 'company' };
      }
    }

    if (!role || role === Role.PARTY) {
      const party = await this.partyService.findByEmail(email);
      if (party) {
        return { id: party.partyId, email, accountType: 'party' };
      }
    }

    if (!role || role === Role.DRIVER) {
      const driver = await this.driverService.findByEmail(email);
      if (driver) {
        return { id: driver.driverId, email, accountType: 'driver' };
      }
    }

    return null;
  }

  private async sendPasswordResetEmail(
    email: string,
    token: string,
  ): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM') || user;

    if (!host || !from) {
      throw new InternalServerErrorException(
        'Password-reset email service is not configured',
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Password reset token',
      text: `Use this token to reset your password: ${token}\n\nThis token expires in 15 minutes and can be used once.`,
    });
  }

  async getTokens(userId: string, email: string | null, roles: Role[]) {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          {
            sub: userId,
            email: email || '',
            roles,
          },
          {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>(
              'JWT_EXPIRATION',
              '1h',
            ) as any,
          },
        ),
        this.jwtService.signAsync(
          {
            sub: userId,
            email: email || '',
            roles,
          },
          {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>(
              'JWT_REFRESH_EXPIRATION',
              '7d',
            ) as any,
          },
        ),
      ]);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sign JWT tokens for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    try {
      // 1. Check User
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken },
        });
        return { message: 'FCM token updated successfully', fcmToken };
      }

      // 2. Check Company
      const company = await this.prisma.company.findUnique({
        where: { companyId: userId },
      });
      if (company) {
        await this.prisma.company.update({
          where: { companyId: userId },
          data: { fcmToken },
        });
        return { message: 'FCM token updated successfully', fcmToken };
      }

      // 3. Check Party
      const party = await this.prisma.party.findUnique({
        where: { partyId: userId },
      });
      if (party) {
        await this.prisma.party.update({
          where: { partyId: userId },
          data: { fcmToken },
        });
        return { message: 'FCM token updated successfully', fcmToken };
      }

      // 4. Check Driver
      const driver = await this.prisma.driver.findUnique({
        where: { driverId: userId },
      });
      if (driver) {
        await this.prisma.driver.update({
          where: { driverId: userId },
          data: { fcmToken },
        });
        return { message: 'FCM token updated successfully', fcmToken };
      }

      throw new NotFoundException('User entity not found');
    } catch (error) {
      this.logger.error(
        `Failed to update FCM token for ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  async removeFcmToken(userId: string) {
    try {
      // 1. Check User
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
        return { message: 'FCM token removed successfully' };
      }

      // 2. Check Company
      const company = await this.prisma.company.findUnique({
        where: { companyId: userId },
      });
      if (company) {
        await this.prisma.company.update({
          where: { companyId: userId },
          data: { fcmToken: null },
        });
        return { message: 'FCM token removed successfully' };
      }

      // 3. Check Party
      const party = await this.prisma.party.findUnique({
        where: { partyId: userId },
      });
      if (party) {
        await this.prisma.party.update({
          where: { partyId: userId },
          data: { fcmToken: null },
        });
        return { message: 'FCM token removed successfully' };
      }

      // 4. Check Driver
      const driver = await this.prisma.driver.findUnique({
        where: { driverId: userId },
      });
      if (driver) {
        await this.prisma.driver.update({
          where: { driverId: userId },
          data: { fcmToken: null },
        });
        return { message: 'FCM token removed successfully' };
      }

      throw new NotFoundException('User entity not found');
    } catch (error) {
      this.logger.error(
        `Failed to remove FCM token for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
