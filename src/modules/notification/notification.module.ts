import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { FcmService } from './fcm.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, FcmService],
  exports: [NotificationService, NotificationGateway, FcmService],
})
export class NotificationModule {}
