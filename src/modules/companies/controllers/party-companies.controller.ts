import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';
import { CompaniesService } from '../services/companies.service';
import { CompanyListQueryDto } from '../dto/company-list-query.dto';

@ApiTags('Party - Companies')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.PARTY)
@Controller('party/companies')
export class PartyCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get list of active/verified companies (Party Only)',
    description:
      'Allows a Party user to view, filter, and search verified companies with pagination. Accessible only by users with the PARTY role.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of companies returned successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Access token is missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User does not have the PARTY role.',
  })
  getCompanies(@Query() query: CompanyListQueryDto) {
    return this.companiesService.getCompaniesForParty(query);
  }
}
