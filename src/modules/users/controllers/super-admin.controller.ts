import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as argon2 from 'argon2';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';
import { UsersService } from '../services/users.service';
import { UpdateSuperAdminProfileDto } from '../dto/update-super-admin-profile.dto';

@ApiTags('Super Admin Profile')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('superAdmin')
export class SuperAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get currently logged-in Super Admin profile',
    description:
      'Retrieves profile information for the authenticated SUPER_ADMIN user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the Super Admin details.',
  })
  async getProfile(@Req() req: any) {
    const { sub } = req.user;
    const user = await this.usersService.findById(sub);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const category =
      (user as any).adminCategories?.map((ac: any) => ({
        categoryId: ac.category?.categoryId || ac.categoryId,
        categoryName: ac.category?.categoryName || null,
      })) || [];

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      ownerName: user.name || null,
      email: user.email || null,
      profileImage: (user as any).profileImage || null,
      district: null,
      upozela: null,
      address: null,
      area: null,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      role: Role.SUPER_ADMIN,
      isVerified: true,
      category,
      company: [],
      driver: [],
      party: [],
    };
  }

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const path = './uploads/documents';
          try {
            if (!fs.existsSync(path)) {
              fs.mkdirSync(path, { recursive: true });
            }
            callback(null, path);
          } catch (error) {
            callback(error as Error, path);
          }
        },
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `superadmin-profile-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update currently logged-in Super Admin profile',
    description: 'Updates the profile information for the authenticated SUPER_ADMIN user.',
  })
  @ApiBody({ type: UpdateSuperAdminProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated Super Admin details.',
  })
  async updateProfile(
    @Req() req: any,
    @Body() body: UpdateSuperAdminProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { sub } = req.user;

    const updateData: any = {};
    if (
      body.name !== undefined &&
      typeof body.name === 'string' &&
      body.name.trim() !== ''
    ) {
      updateData.name = body.name.trim();
    }
    if (
      body.email !== undefined &&
      typeof body.email === 'string' &&
      body.email.trim() !== ''
    ) {
      updateData.email = body.email.trim();
    }
    if (
      body.phoneNumber !== undefined &&
      typeof body.phoneNumber === 'string' &&
      body.phoneNumber.trim() !== ''
    ) {
      updateData.phoneNumber = body.phoneNumber.trim();
    }

    if (file) {
      updateData.profileImage = `/uploads/documents/${file.filename}`;
    } else if (
      body.profileImage !== undefined &&
      typeof body.profileImage === 'string' &&
      body.profileImage.trim() !== ''
    ) {
      updateData.profileImage = body.profileImage.trim();
    }

    if (
      body.password !== undefined &&
      typeof body.password === 'string' &&
      body.password.trim() !== ''
    ) {
      updateData.password = await argon2.hash(body.password.trim(), {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
      });
    }

    if (Object.keys(updateData).length > 0) {
      await this.usersService.update(sub, updateData);
    }

    const user = await this.usersService.findById(sub);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const category =
      (user as any).adminCategories?.map((ac: any) => ({
        categoryId: ac.category?.categoryId || ac.categoryId,
        categoryName: ac.category?.categoryName || null,
      })) || [];

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      ownerName: user.name || null,
      email: user.email || null,
      profileImage: (user as any).profileImage || null,
      district: null,
      upozela: null,
      address: null,
      area: null,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      role: Role.SUPER_ADMIN,
      isVerified: true,
      category,
      company: [],
      driver: [],
      party: [],
    };
  }
}
