import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../../users/services/users.service';
import { RedisService } from '../../../core/cache/redis.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async signUp(registerDto: RegisterDto) {
    try {
      const userExists = await this.usersService.findByEmail(registerDto.email);
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

      return tokens;
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
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) throw new UnauthorizedException('Access Denied');

      const passwordMatches = await argon2.verify(
        user.password,
        loginDto.password,
      );
      if (!passwordMatches) throw new UnauthorizedException('Access Denied');

      const tokens = await this.getTokens(user.id, user.email, user.roles);

      // Store session token in Redis (sliding expiration)
      await this.storeSession(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      this.logger.error(
        `Failed login attempt for email ${loginDto.email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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

      const tokens = await this.getTokens(user.id, user.email, user.roles);

      // Rotate refresh tokens dynamically to prevent token replay hijacking
      await this.storeSession(user.id, tokens.refreshToken);

      return tokens;
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

  async getTokens(userId: string, email: string, roles: Role[]) {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          {
            sub: userId,
            email,
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
            email,
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
