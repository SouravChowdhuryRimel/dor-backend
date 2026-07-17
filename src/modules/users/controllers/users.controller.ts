import { Controller, Post, Body, Get, UseGuards, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';

@ApiTags('Users (Admin Management)')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

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
        const existing = await this.usersService.findByPhone(createAdminDto.phoneNumber);
        if (existing) {
            throw new ConflictException('User with that phone number already exists.');
        }
        return this.usersService.createAdmin(createAdminDto);
    }

    @Get('admins')
    @Roles(Role.SUPER_ADMIN)
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
    async findAllAdmins() {
        return this.usersService.findAllAdmins();
    }
}
