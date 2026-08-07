import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/constants/role.enum';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Get all notifications for logged-in company (VENDOR only)' })
  @ApiResponse({ status: 200, description: 'Return all notifications for the company.' })
  findAll(@Req() req: any) {
    const companyId = req.user.sub;
    return this.notificationService.findAllForCompany(companyId);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Mark a notification as read (VENDOR only)' })
  @ApiResponse({ status: 200, description: 'Notification successfully updated.' })
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const companyId = req.user.sub;
    return this.notificationService.markAsRead(id, companyId);
  }
}
