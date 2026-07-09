import { Module } from '@nestjs/common';
import { DriverService } from './services/driver.service';
import { DriverController } from './controllers/driver.controller';

@Module({
  controllers: [DriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
