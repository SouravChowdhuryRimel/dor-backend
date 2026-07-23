import { Controller, Get, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { UsersService } from '../services/users.service';
import { CompanyService } from '../../company/services/company.service';
import { PartyService } from '../../party/services/party.service';
import { DriverService } from '../../driver/services/driver.service';
import { Role } from '../../../common/constants/role.enum';

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('user')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly companyService: CompanyService,
    private readonly partyService: PartyService,
    private readonly driverService: DriverService,
  ) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get currently logged-in user profile',
    description: 'Retrieves the complete profile information for the authenticated User, Vendor, Party, or Driver.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the full profile details.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  async getProfile(@Req() req: any) {
    const { sub, roles } = req.user;

    if (roles.includes(Role.SUPER_ADMIN) || roles.includes(Role.ADMIN)) {
      const user = await this.usersService.findById(sub);
      if (!user) {
        throw new NotFoundException('User profile not found');
      }
      const { password, ...result } = user;
      return result;
    }

    if (roles.includes(Role.VENDOR)) {
      const company = await this.companyService.findOne(sub);
      if (!company) {
        throw new NotFoundException('Company profile not found');
      }
      return company;
    }

    if (roles.includes(Role.PARTY)) {
      const party = await this.partyService.findOne(sub);
      if (!party) {
        throw new NotFoundException('Party profile not found');
      }
      const { password, ...result } = party;
      return result;
    }

    if (roles.includes(Role.DRIVER)) {
      const driver = await this.driverService.findOne(sub);
      if (!driver) {
        throw new NotFoundException('Driver profile not found');
      }
      const { password, ...result } = driver;
      return result;
    }

    throw new NotFoundException('Profile role not matched');
  }

  @Get('verified')
  @ApiOperation({
    summary: 'Check the verification status of the authenticated account',
    description:
      'Returns a consistent verification result for user/admin, company, party, and driver roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the account verification status.',
  })
  async getVerificationStatus(@Req() req: any) {
    const { sub, roles } = req.user;

    if (
      roles.includes(Role.SUPER_ADMIN) ||
      roles.includes(Role.ADMIN) ||
      roles.includes(Role.USER)
    ) {
      const user = await this.usersService.findById(sub);
      if (!user) {
        throw new NotFoundException('User profile not found');
      }

      const isAdmin =
        user.roles.includes(Role.SUPER_ADMIN) ||
        user.roles.includes(Role.ADMIN);

      return {
        id: user.id,
        roles: user.roles,
        isVerified: isAdmin,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    }

    if (roles.includes(Role.VENDOR)) {
      const company = await this.companyService.findOne(sub);
      if (!company) {
        throw new NotFoundException('Company profile not found');
      }

      return {
        id: company.companyId,
        roles,
        isVerified: company.isVerified,
        status: company.status,
      };
    }

    if (roles.includes(Role.PARTY)) {
      const party = await this.partyService.findOne(sub);
      if (!party) {
        throw new NotFoundException('Party profile not found');
      }

      return {
        id: party.partyId,
        roles,
        isVerified: party.isVerified,
        status: party.status,
      };
    }

    if (roles.includes(Role.DRIVER)) {
      const driver = await this.driverService.findOne(sub);
      if (!driver) {
        throw new NotFoundException('Driver profile not found');
      }

      return {
        id: driver.driverId,
        roles,
        isVerified: driver.isVerified,
        status: 'APPROVED',
      };
    }

    throw new NotFoundException('Profile role not matched');
  }
}
