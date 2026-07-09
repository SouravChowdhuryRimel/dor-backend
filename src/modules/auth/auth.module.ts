import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { CompanyModule } from '../company/company.module';
import { AccessTokenStrategy } from './controllers/strategies/access-token.strategy';
import { RefreshTokenStrategy } from './controllers/strategies/refresh-token.strategy';

@Global()
@Module({
  imports: [JwtModule.register({}), UsersModule, CompanyModule],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenStrategy, RefreshTokenStrategy],
  exports: [AuthService, AccessTokenStrategy, RefreshTokenStrategy, JwtModule],
})
export class AuthModule { }
