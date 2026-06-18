import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { validate } from './core/config/env.validation';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import redisConfig from './core/config/redis.config';
import queueConfig from './core/config/queue.config';
import mailConfig from './core/config/mail.config';
import { DatabaseModule } from './core/database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './core/health/health.module';
import { LoggerModule } from './core/logger/logger.module';
import { SecurityModule } from './core/security/security.module';
import { MailModule } from './core/mail/mail.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { PartiesModule } from './modules/parties/parties.module';
import { GlobalExceptionFilter } from './core/exception/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, queueConfig, mailConfig],
      validate,
    }),

    LoggerModule,
    DatabaseModule,
    CacheModule,
    HealthModule,
    SecurityModule,
    MailModule,
    AuthModule,
    UsersModule,
    UploadsModule,
    DriversModule,
    CompaniesModule,
    PartiesModule,
  ],




  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
