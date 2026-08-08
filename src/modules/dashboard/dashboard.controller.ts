import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/role.enum';

@ApiTags('Dashboards & Analytics')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('super-admin/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: "Get today's summary metrics and recent activity (SUPER_ADMIN and ADMIN only)",
  })
  @ApiResponse({ status: 200, description: 'Return Super Admin summary.' })
  getSuperAdminSummary() {
    return this.dashboardService.getSuperAdminSummary();
  }

  @Get('company/:companyId/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.VENDOR)
  @ApiOperation({
    summary: 'Get summary metrics, growth data, and documents for a specific company',
  })
  @ApiResponse({ status: 200, description: 'Return company dashboard details.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  getCompanySummary(@Param('companyId') companyId: string) {
    return this.dashboardService.getCompanySummary(companyId);
  }

  @Get('party/:partyId/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PARTY)
  @ApiOperation({
    summary: 'Get summary metrics and recent orders for a specific party',
  })
  @ApiResponse({ status: 200, description: 'Return party dashboard details.' })
  @ApiResponse({ status: 404, description: 'Party not found.' })
  getPartySummary(@Param('partyId') partyId: string) {
    return this.dashboardService.getPartySummary(partyId);
  }

  @Get('driver/:driverId/summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.DRIVER)
  @ApiOperation({
    summary: 'Get summary metrics and ongoing deliveries for a specific driver',
  })
  @ApiResponse({ status: 200, description: 'Return driver dashboard details.' })
  @ApiResponse({ status: 404, description: 'Driver not found.' })
  getDriverSummary(@Param('driverId') driverId: string) {
    return this.dashboardService.getDriverSummary(driverId);
  }
}
