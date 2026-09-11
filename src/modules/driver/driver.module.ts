import { Module } from '@nestjs/common';
import { DriverService } from './services/driver.service';
import { DriverController } from './controllers/driver.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [DriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
