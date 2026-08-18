import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req.body?.refreshToken || null,
        (req: Request) => req.query?.refreshToken || null,
      ]),
      secretOrKeyProvider: (req: Request, rawJwtToken: string, done: any) => {
        const refreshSecret =
          configService.get<string>('JWT_REFRESH_SECRET') ||
          process.env.JWT_REFRESH_SECRET ||
          'fallback_refresh_secret';
        const accessSecret =
          configService.get<string>('JWT_SECRET') ||
          process.env.JWT_SECRET ||
          'fallback_secret';

        try {
          const payload = JSON.parse(
            Buffer.from(rawJwtToken.split('.')[1], 'base64').toString(),
          );
          // If exp - iat is around 1 hour (3600s), it is an access token
          if (payload.exp && payload.iat && payload.exp - payload.iat <= 3650) {
            return done(null, accessSecret);
          }
        } catch (e) {
          // ignore parsing error
        }
        return done(null, refreshSecret);
      },
      passReqToCallback: true,
    } as any);
  }

  validate(req: Request, payload: any) {
    const refreshToken =
      req.body?.refreshToken ||
      req.query?.refreshToken ||
      req
        .get('Authorization')
        ?.replace(/Bearer\s+/i, '')
        .trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const tokenType =
      payload.exp && payload.iat && payload.exp - payload.iat <= 3650
        ? 'access'
        : 'refresh';

    return { ...payload, refreshToken, tokenType };
  }
}
