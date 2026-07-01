import { Module } from '@nestjs/common';
import { CompaniesController } from './controllers/companies.controller';
import { PartyCompaniesController } from './controllers/party-companies.controller';
import { CompaniesService } from './services/companies.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [CompaniesController, PartyCompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
