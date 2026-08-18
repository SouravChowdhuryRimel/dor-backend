import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  ConflictException,
  Query,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';
import {
  AdminStatusFilter,
  AdminStatusFilterDto,
} from '../dto/admin-status-filter.dto';

@ApiTags('Users (Admin Management)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admins')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Create a new Admin (SUPER_ADMIN only)',
    description: 'Allows a SUPER_ADMIN to create new ADMIN users.',
  })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully.',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires SUPER_ADMIN role.',
  })
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    const existing = await this.usersService.findByPhone(
      createAdminDto.phoneNumber,
    );
    if (existing) {
      throw new ConflictException(
        'User with that phone number already exists.',
      );
    }
    return this.usersService.createAdmin(createAdminDto);
  }

  @Get('admins')
  @Roles(Role.SUPER_ADMIN)
  @ApiQuery({
    name: 'status',
    enum: AdminStatusFilter,
    required: false,
    example: AdminStatusFilter.ALL,
  })
  @ApiOperation({
    summary: 'List all Admins (SUPER_ADMIN only)',
    description: 'Retrieves a list of all users with the ADMIN role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of admins.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires SUPER_ADMIN role.',
  })
  async findAllAdmins(@Query() filter: AdminStatusFilterDto) {
    return this.usersService.findAllAdmins(filter.status);
  }

  @Get('admins/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get a single admin (ADMIN, SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Returns the admin.' })
  @ApiResponse({ status: 404, description: 'Admin not found.' })
  async findOneAdmin(@Param('id') id: string) {
    return this.usersService.findAdminById(id);
  }

  @Patch('admins/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update an admin (ADMIN, SUPER_ADMIN)' })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({ status: 200, description: 'Admin updated successfully.' })
  @ApiResponse({ status: 404, description: 'Admin not found.' })
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.usersService.updateAdmin(id, updateAdminDto);
  }

  @Delete('admins/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete an admin (ADMIN, SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Admin deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Admin not found.' })
  async removeAdmin(@Param('id') id: string) {
    return this.usersService.removeAdmin(id);
  }
}
