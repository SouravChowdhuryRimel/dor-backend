import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../shared/pagination/pagination.util';
import { NotificationService } from './notification.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get all notifications for logged-in user (All roles)',
    description:
      'Retrieves all notifications for the currently logged-in account (User, Company, Party, or Driver).',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all notifications for the authenticated entity.',
  })
  findAll(@Req() req: any, @Query() query: PaginationQueryDto) {
    const actorId = req.user.sub;
    return this.notificationService.findAllForActor(actorId, query);
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
