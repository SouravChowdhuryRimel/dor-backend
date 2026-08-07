import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { DriverService } from '../services/driver.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('Drivers')
@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'driverDocument', maxCount: 10 },
        { name: 'driverImage', maxCount: 1 },
      ],
      {
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
            const prefix = file.fieldname === 'driverImage' ? 'driver-img' : 'driver-doc';
            callback(null, `${prefix}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phoneNumber: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        driverName: { type: 'string' },
        address: { type: 'string' },
        district: { type: 'string', description: 'District of the driver' },
        loadCapacity: { type: 'string', description: 'Load Capacity (optional)' },
        companyIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Companies hiring the driver (optional)',
        },
        partyIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Parties hiring the driver (optional)',
        },
        drivingLicenceNumber: { type: 'string' },
        nidNumber: { type: 'string' },
        categoryId: { type: 'string' },
        driverImage: {
          type: 'string',
          format: 'binary',
          description: 'Driver Profile Image (optional)',
        },
        driverDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Driver documents (optional)',
        },
      },
      required: [
        'phoneNumber',
        'email',
        'password',
        'driverName',
        'address',
        'district',
        'drivingLicenceNumber',
        'nidNumber',
        'categoryId',
      ],
    },
  })
  @ApiOperation({ summary: 'Create a new driver' })
  create(
    @Body() createDriverDto: CreateDriverDto,
    @UploadedFiles()
    files: {
      driverDocument?: Express.Multer.File[];
      driverImage?: Express.Multer.File[];
    },
  ) {
    if (files) {
      if (files.driverDocument && files.driverDocument.length > 0) {
        createDriverDto.driverDocument = files.driverDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      } else {
        createDriverDto.driverDocument = [];
      }

      if (files.driverImage && files.driverImage.length > 0) {
        createDriverDto.driverImage = `/uploads/documents/${files.driverImage[0].filename}`;
      }
    } else {
      createDriverDto.driverDocument = [];
    }

    // Normalize district/districs and upozela/upazela
    const district = createDriverDto.district || (createDriverDto as any).districs;
    const upozela = (createDriverDto as any).upozela || (createDriverDto as any).upazela;

    if (!district) {
      throw new BadRequestException('district is required');
    }

    const truckNumber = (createDriverDto as any).truckNumber || (createDriverDto as any).trackNumber;
    const truckType = (createDriverDto as any).truckType || (createDriverDto as any).trackType;

    const normalizedDto: any = {
      ...createDriverDto,
      district,
      upozela,
      truckNumber,
      truckType,
    };

    // Remove alias properties to avoid Prisma model pollution
    delete normalizedDto.districs;
    delete normalizedDto.upazela;
    delete normalizedDto.trackNumber;
    delete normalizedDto.trackType;

    return this.driverService.create(normalizedDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get all drivers' })
  findAll() {
    return this.driverService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get a driver by ID' })
  findOne(@Param('id') id: string) {
    return this.driverService.findOne(id);
  }

  @Patch(':id/verify')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify a driver (ADMIN and SUPER_ADMIN only)' })
  verify(@Param('id') id: string) {
    return this.driverService.verify(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Update a driver' })
  update(@Param('id') id: string, @Body() updateDriverDto: UpdateDriverDto) {
    return this.driverService.update(id, updateDriverDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Delete a driver' })
  remove(@Param('id') id: string) {
    return this.driverService.remove(id);
  }
}
