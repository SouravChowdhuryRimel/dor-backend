import { Module } from '@nestjs/common';
import { PartyService } from './services/party.service';
import { PartyController } from './controllers/party.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [PartyController],
  providers: [PartyService],
  exports: [PartyService],
})
export class PartyModule {}
