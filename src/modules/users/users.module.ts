import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { UserController } from './controllers/user.controller';
import { CompanyModule } from '../company/company.module';
import { PartyModule } from '../party/party.module';
import { DriverModule } from '../driver/driver.module';

@Module({
  imports: [CompanyModule, PartyModule, DriverModule],
  controllers: [UsersController, UserController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
