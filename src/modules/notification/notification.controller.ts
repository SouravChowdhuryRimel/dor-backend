import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../shared/pagination/pagination.util';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationService } from './notification.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { TogglePushNotificationDto } from './dto/toggle-push-notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Patch('push-toggle')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Toggle FCM push notifications ON or OFF (PATCH) (All roles)',
    description:
      'Enables or disables FCM push notifications for the authenticated account (User, Company, Party, or Driver). Optionally accepts a new or updated fcmToken.',
  })
  @ApiResponse({
    status: 200,
    description: 'Push notification preference updated successfully.',
  })
  togglePushNotificationPatch(
    @Req() req: any,
    @Body() dto: TogglePushNotificationDto,
  ) {
    const actorId = req.user.sub;
    return this.notificationService.togglePushNotification(
      actorId,
      dto.enabled,
      dto.fcmToken,
    );
  }

  @Post('push-toggle')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Toggle FCM push notifications ON or OFF (POST alias) (All roles)',
    description:
      'Enables or disables FCM push notifications for the authenticated account (User, Company, Party, or Driver).',
  })
  @ApiResponse({
    status: 200,
    description: 'Push notification preference updated successfully.',
  })
  togglePushNotificationPost(
    @Req() req: any,
    @Body() dto: TogglePushNotificationDto,
  ) {
    const actorId = req.user.sub;
    return this.notificationService.togglePushNotification(
      actorId,
      dto.enabled,
      dto.fcmToken,
    );
  }

  @Get('push-status')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get current FCM push notification toggle status (All roles)',
    description:
      'Retrieves whether push notifications are enabled and if an FCM token is registered for the authenticated account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current push notification status.',
  })
  getPushStatus(@Req() req: any) {
    const actorId = req.user.sub;
    return this.notificationService.getPushNotificationStatus(actorId);
  }

  @Get('unread-count')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get unread and total notification counts (All roles)',
    description:
      'Retrieves the number of unread notifications and total notifications for the authenticated account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread and total notification counts.',
  })
  getUnreadCount(@Req() req: any) {
    const actorId = req.user.sub;
    return this.notificationService.getUnreadCount(actorId);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get all notifications for logged-in user (All roles)',
    description:
      'Retrieves paginated notifications for the currently logged-in account (User, Company, Party, or Driver). Supports optional isRead filter ("true" or "false"). Response includes unreadCount in meta.',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all notifications for the authenticated entity.',
  })
  findAll(@Req() req: any, @Query() query: QueryNotificationDto) {
    const actorId = req.user.sub;
    return this.notificationService.findAllForActor(actorId, query);
  }

  @Patch('read-all')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Mark all notifications as read (All roles)',
    description:
      'Marks all unread notifications as read for the currently logged-in account.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications successfully marked as read.',
  })
  markAllAsRead(@Req() req: any) {
    const actorId = req.user.sub;
    return this.notificationService.markAllAsRead(actorId);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Mark a notification as read (All roles)',
    description:
      'Marks a specific notification as read for the currently logged-in account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification successfully marked as read.',
  })
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const actorId = req.user.sub;
    return this.notificationService.markAsRead(id, actorId);
  }
}
