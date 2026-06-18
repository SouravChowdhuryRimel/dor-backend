import { Module } from '@nestjs/common';
import { PartiesController } from './controllers/parties.controller';
import { PartiesService } from './services/parties.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  controllers: [PartiesController],
  providers: [PartiesService],
})
export class PartiesModule {}
