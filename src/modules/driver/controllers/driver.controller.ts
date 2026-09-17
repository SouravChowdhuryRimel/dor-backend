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
  Query,
  Req,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';
import { DriverService } from '../services/driver.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import { GetNearbyDriversQueryDto } from '../dto/get-nearby-drivers-query.dto';
import { UpdateDriverLocationDto } from '../dto/update-driver-location.dto';
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
            const prefix =
              file.fieldname === 'driverImage' ? 'driver-img' : 'driver-doc';
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
        loadCapacity: {
          type: 'string',
          description: 'Load Capacity (optional)',
        },
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
    @Req() req?: any,
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
    const district =
      createDriverDto.district || (createDriverDto as any).districs;
    const upozela =
      (createDriverDto as any).upozela || (createDriverDto as any).upazela;

    if (!district) {
      throw new BadRequestException('district is required');
    }

    const truckNumber =
      (createDriverDto as any).truckNumber ||
      (createDriverDto as any).trackNumber;
    const truckType =
      (createDriverDto as any).truckType || (createDriverDto as any).trackType;

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

    return this.driverService.create(normalizedDto, req?.user);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get all drivers' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.driverService.findAll(query);
  }

  @Get('nearby')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Search nearby drivers for Company or Admin based on location/radius/filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Return list of nearby drivers sorted by distance.',
  })
  findNearby(@Query() query: GetNearbyDriversQueryDto, @Req() req: any) {
    return this.driverService.findNearbyDrivers(query, req.user);
  }

  @Patch('location')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Update location coordinates for logged-in user (Driver or Company)',
  })
  @ApiResponse({ status: 200, description: 'Location updated successfully.' })
  updateMyLocation(
    @Body() updateLocationDto: UpdateDriverLocationDto,
    @Req() req: any,
  ) {
    return this.driverService.updateLocation(
      req.user.sub,
      updateLocationDto,
      req.user,
    );
  }

  @Patch(':id/location')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update location coordinates for a driver or company by ID',
  })
  @ApiResponse({ status: 200, description: 'Location updated successfully.' })
  updateLocation(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateDriverLocationDto,
    @Req() req: any,
  ) {
    return this.driverService.updateLocation(id, updateLocationDto, req.user);
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all pending drivers (ADMIN and SUPER_ADMIN only)',
  })
  getPending(@Query() query: PaginationQueryDto) {
    return this.driverService.findPending(query);
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
  verify(@Param('id') id: string, @Req() req: any) {
    return this.driverService.verify(id, req.user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
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
            const prefix =
              file.fieldname === 'driverImage' ? 'driver-img' : 'driver-doc';
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
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address',
        },
        driverImage: {
          type: 'string',
          format: 'binary',
          description: 'Driver Profile Image file or string URL',
        },
        driverName: { type: 'string', description: 'Driver Name' },
        address: { type: 'string', description: 'Address' },
        district: { type: 'string', description: 'District of the driver' },
        loadCapacity: { type: 'string', description: 'Load Capacity' },
        drivingLicenceNumber: {
          type: 'string',
          description: 'Driving Licence Number',
        },
        nidNumber: { type: 'string', description: 'NID Number' },
        driverDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Driver documents files or string URLs',
        },
        lat: { type: 'number', example: 23.8103, description: 'Latitude' },
        long: { type: 'number', example: 90.4125, description: 'Longitude' },
        upozela: { type: 'string', description: 'Upozela' },
        upazela: { type: 'string', description: 'Upazela (alias for upozela)' },
        truckNumber: { type: 'string', description: 'Truck Number' },
        truckType: { type: 'string', description: 'Truck Type' },
      },
    },
  })
  @ApiOperation({ summary: 'Update a driver' })
  update(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto,
    @UploadedFiles()
    files?: {
      driverDocument?: Express.Multer.File[];
      driverImage?: Express.Multer.File[];
    },
    @Req() req?: any,
  ) {
    let existingDocs: string[] = [];
    if (updateDriverDto.driverDocument) {
      if (Array.isArray(updateDriverDto.driverDocument)) {
        existingDocs = updateDriverDto.driverDocument;
      } else if (typeof updateDriverDto.driverDocument === 'string') {
        existingDocs = [updateDriverDto.driverDocument];
      }
    }

    let uploadedDocs: string[] = [];
    if (files?.driverDocument && files.driverDocument.length > 0) {
      uploadedDocs = files.driverDocument.map(
        (file) => `/uploads/documents/${file.filename}`,
      );
    }

    if (uploadedDocs.length > 0 || existingDocs.length > 0) {
      updateDriverDto.driverDocument = [...existingDocs, ...uploadedDocs];
    }

    if (files?.driverImage && files.driverImage.length > 0) {
      updateDriverDto.driverImage = `/uploads/documents/${files.driverImage[0].filename}`;
    }

    const district =
      updateDriverDto.district || (updateDriverDto as any).districs;
    const upozela = updateDriverDto.upozela || (updateDriverDto as any).upazela;
    const truckNumber =
      updateDriverDto.truckNumber || (updateDriverDto as any).trackNumber;
    const truckType =
      updateDriverDto.truckType || (updateDriverDto as any).trackType;

    const normalizedDto: any = {
      ...updateDriverDto,
    };

    if (district !== undefined) normalizedDto.district = district;
    if (upozela !== undefined) normalizedDto.upozela = upozela;
    if (truckNumber !== undefined) normalizedDto.truckNumber = truckNumber;
    if (truckType !== undefined) normalizedDto.truckType = truckType;

    delete normalizedDto.districs;
    delete normalizedDto.upazela;
    delete normalizedDto.trackNumber;
    delete normalizedDto.trackType;

    return this.driverService.update(id, normalizedDto, req?.user);
  }

  @Get(':id/associations')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get list of companies and parties associated with a driver',
  })
  @ApiResponse({
    status: 200,
    description: 'Return associated companies and parties.',
  })
  @ApiResponse({ status: 404, description: 'Driver not found.' })
  getDriverAssociations(@Param('id') id: string) {
    return this.driverService.getDriverAssociations(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Delete a driver' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.driverService.remove(id, req.user);
  }
}
