import { Module } from '@nestjs/common';
import { PartyService } from './services/party.service';
import { PartyController } from './controllers/party.controller';

@Module({
  controllers: [PartyController],
  providers: [PartyService],
  exports: [PartyService],
})
export class PartyModule {}
