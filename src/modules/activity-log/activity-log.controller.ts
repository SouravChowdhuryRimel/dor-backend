import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/role.enum';
import { GetActivityLogsQueryDto } from './dto/get-activity-logs-query.dto';
import { PaginationQueryDto } from '../../shared/pagination/pagination.util';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all activity logs (Admin/Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Return all activity logs.' })
  findAll(@Query() query: GetActivityLogsQueryDto) {
    return this.activityLogService.findAll(query);
  }

  @Get('super-admin/audit')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all system audit logs (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Return all system audit logs.' })
  findSuperAdminAudit(@Query() query: GetActivityLogsQueryDto) {
    return this.activityLogService.findAll(query);
  }

  @Get('my-logs')
  @ApiOperation({ summary: 'Get activity logs of the current logged-in user' })
  @ApiResponse({ status: 200, description: 'Return logs for the authenticated user.' })
  findMyLogs(@Req() req: any, @Query() query: PaginationQueryDto) {
    const actorId = req.user['sub'];
    return this.activityLogService.findMyLogs(actorId, query);
  }
}
