import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../../users/services/users.service';
import { RedisService } from '../../../core/cache/redis.service';
import { LoginDto } from '../dto/login.dto';
import { PartyLoginDto } from '../dto/party-login.dto';
import { RegisterDto } from '../dto/register.dto';
import { Role } from '@prisma/client';
import { CompanyService } from '../../company/services/company.service';
import { PartyService } from '../../party/services/party.service';
import { DriverService } from '../../driver/services/driver.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

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
  ) {}

  async signUp(registerDto: RegisterDto) {
    try {
      const userExists = await this.usersService.findByPhone(registerDto.phoneNumber);
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

      return {
        ...tokens,
        user: {
          id: newUser.id,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          name: newUser.name,
          roles: newUser.roles,
            categoryId: newUser.categoryId,
            businessName: null,
            district: null,
            upozela: null,
            address: null,
            bazzarArea: null,
            createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          isVerified: newUser.roles.includes(Role.SUPER_ADMIN) || newUser.roles.includes(Role.ADMIN),
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

        const tokens = await this.getTokens(user.id, user.email, user.roles);
        await this.storeSession(user.id, tokens.refreshToken);

        return {
          ...tokens,
          user: {
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            name: user.name,
            roles: user.roles,
            categoryId: user.categoryId,
            businessName: null,
            district: null,
            upozela: null,
            address: null,
            bazzarArea: null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isVerified: user.roles.includes(Role.SUPER_ADMIN) || user.roles.includes(Role.ADMIN),
            status: 'APPROVED',
          },
        };
      }

      // 2. Check Company table
      const company = await this.companyService.findByPhone(loginDto.phoneNumber);
      if (company) {
        const passwordMatches = await argon2.verify(
          company.password,
          loginDto.password,
        );
        if (!passwordMatches) throw new UnauthorizedException('Access Denied');

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
      const party = await this.partyService.findByPhone(loginDto.phoneNumber);
      if (party) {
        const passwordMatches = await argon2.verify(
          party.password,
          loginDto.password,
        );
        if (!passwordMatches) throw new UnauthorizedException('Access Denied');

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
            categoryId: null,
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
        const passwordMatches = await argon2.verify(
          driver.password,
          loginDto.password,
        );
        if (!passwordMatches) throw new UnauthorizedException('Access Denied');

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
      const company = await this.companyService.findByPhone(loginDto.phoneNumber);
      if (!company) throw new UnauthorizedException('Access Denied');

      const passwordMatches = await argon2.verify(
        company.password,
        loginDto.password,
      );
      if (!passwordMatches) throw new UnauthorizedException('Access Denied');

      // Issue token with VENDOR role for companies
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
      const party = await this.partyService.findByPhone(
        partyLoginDto.phoneNumber,
      );
      if (!party)
        throw new UnauthorizedException('Access Denied: Party not found');

      const passwordMatches = await argon2.verify(
        party.password,
        partyLoginDto.password,
      );
      if (!passwordMatches)
        throw new UnauthorizedException('Access Denied: Incorrect Password');

      // Issue token with PARTY role for independent party users
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
          categoryId: null,
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

    // Always return the same response to avoid email-account enumeration.
    if (account) {
      const token = randomBytes(32).toString('hex');
      const ttlSeconds = 15 * 60;

      await this.redisService.setJson(
        `password-reset:${token}`,
        account,
        ttlSeconds,
      );
      await this.sendPasswordResetEmail(account.email, token);
    }

    return {
      message:
        'If an account exists for this email, a password-reset token has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const key = `password-reset:${resetPasswordDto.token}`;
    const account = await this.redisService.getJson<PasswordResetAccount>(key);

    if (!account) {
      throw new BadRequestException('Invalid or expired password-reset token');
    }

    // Consume the token before updating the password so it cannot be reused.
    await this.redisService.del(key);

    switch (account.accountType) {
      case 'user':
        await this.usersService.updatePassword(account.id, resetPasswordDto.password);
        break;
      case 'company':
        await this.companyService.updatePassword(
          account.id,
          resetPasswordDto.password,
        );
        break;
      case 'party':
        await this.partyService.updatePassword(account.id, resetPasswordDto.password);
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

  async logout(userId: string) {
    try {
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

  async refreshTokens(userId: string, refreshToken: string) {
    try {
      const activeSessionToken = await this.redisService.get(
        `session:${userId}`,
      );
      if (!activeSessionToken || activeSessionToken !== refreshToken) {
        throw new ForbiddenException(
          'Access Denied - Session Expired or Revoked',
        );
      }

      const user = await this.usersService.findById(userId);
      if (!user) throw new ForbiddenException('Access Denied');
      if (!user.isActive) {
        throw new ForbiddenException('Access Denied: Account is inactive');
      }

      const tokens = await this.getTokens(user.id, user.email, user.roles);

      // Rotate refresh tokens dynamically to prevent token replay hijacking
      await this.storeSession(user.id, tokens.refreshToken);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          name: user.name,
          roles: user.roles,
          categoryId: user.categoryId,
          businessName: null,
          district: null,
          upozela: null,
          address: null,
          bazzarArea: null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          isVerified: user.roles.includes(Role.SUPER_ADMIN) || user.roles.includes(Role.ADMIN),
          status: 'APPROVED',
        },
      };
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
}
