import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { validate } from './core/config/env.validation';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import redisConfig from './core/config/redis.config';
import queueConfig from './core/config/queue.config';
import { DatabaseModule } from './core/database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompanyModule } from './modules/company/company.module';
import { PartyModule } from './modules/party/party.module';
import { DriverModule } from './modules/driver/driver.module';
import { HealthModule } from './core/health/health.module';
import { LoggerModule } from './core/logger/logger.module';
import { SecurityModule } from './core/security/security.module';
import { GlobalExceptionFilter } from './core/exception/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { SubCategoryModule } from './modules/sub-category/sub-category.module';
import { OrderModule } from './modules/order/order.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { OfferModule } from './modules/offer/offer.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InquiryModule } from './modules/inquiry/inquiry.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { SupportModule } from './modules/support/support.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, queueConfig],
      validate,
    }),
    LoggerModule,
    DatabaseModule,
    CacheModule,
    HealthModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    CompanyModule,
    PartyModule,
    DriverModule,
    CategoryModule,
    ProductModule,
    SubCategoryModule,
    OrderModule,
    DeliveryModule,
    OfferModule,
    ComplaintModule,
    DashboardModule,
    InquiryModule,
    NotificationModule,
    ActivityLogModule,
    SupportModule,
  ],
  providers: [
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
