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
import { PartyService } from '../services/party.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CreatePartyDto } from '../dto/create-party.dto';
import { UpdatePartyDto } from '../dto/update-party.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('Parties')
@Controller('parties')
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'partyDocument', maxCount: 10 },
        { name: 'profileImage', maxCount: 1 },
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
              file.fieldname === 'profileImage' ? 'party-profile' : 'party-doc';
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
        partyName: { type: 'string' },
        businessName: { type: 'string' },
        phoneNumber: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        address: { type: 'string' },
        district: { type: 'string' },
        upozela: { type: 'string' },
        bazzarArea: { type: 'string', description: 'Bazzar/Area' },
        bazzar: { type: 'string', description: 'Bazzar (alias)' },
        area: { type: 'string', description: 'Area (alias)' },
        description: { type: 'string' },
        categoryId: { type: 'string' },
        treadLicense: { type: 'string' },
        partyDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        profileImage: {
          type: 'string',
          format: 'binary',
          description: 'profile image of the party',
        },
      },
      required: [
        'partyName',
        'businessName',
        'phoneNumber',
        'email',
        'password',
        'address',
        'district',
        'upozela',
        'description',
        'categoryId',
      ],
    },
  })
  @ApiOperation({ summary: 'Register a new Party' })
  register(
    @Body() createPartyDto: CreatePartyDto,
    @UploadedFiles()
    files: {
      partyDocument?: Express.Multer.File[];
      profileImage?: Express.Multer.File[];
    },
    @Req() req?: any,
  ) {
    let uploadedDocs: string[] = [];
    if (files) {
      if (files.partyDocument && files.partyDocument.length > 0) {
        uploadedDocs = files.partyDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      }
      if (files.profileImage && files.profileImage.length > 0) {
        createPartyDto.profileImage = `/uploads/documents/${files.profileImage[0].filename}`;
      }
    }
    createPartyDto.partyDocument = uploadedDocs;

    // Normalize bazzarArea
    const bazzarAreaValue =
      createPartyDto.bazzarArea || createPartyDto.bazzar || createPartyDto.area;
    if (!bazzarAreaValue) {
      throw new BadRequestException('bazzarArea, bazzar, or area is required');
    }

    // Convert openingDue and creditLimit to numbers in case they were sent as strings in form-data
    const openingDue = Number((createPartyDto as any).openingDue);
    const creditLimit = Number((createPartyDto as any).creditLimit);

    const normalizedDto: any = {
      ...createPartyDto,
      bazzarArea: bazzarAreaValue,
      openingDue: isNaN(openingDue) ? 0 : openingDue,
      creditLimit: isNaN(creditLimit) ? 0 : creditLimit,
    };

    // Remove alias properties
    delete normalizedDto.bazzar;
    delete normalizedDto.area;

    return this.partyService.create(normalizedDto, req?.user);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  findAll(@Query() query: PaginationQueryDto) {
    return this.partyService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a party by ID' })
  findOne(@Param('id') id: string) {
    return this.partyService.findOne(id);
  }

  @Patch(':id/verify')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify a party (ADMIN and SUPER_ADMIN only)' })
  verify(@Param('id') id: string, @Req() req: any) {
    return this.partyService.verify(id, req.user);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'partyDocument', maxCount: 10 },
        { name: 'profileImage', maxCount: 1 },
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
              file.fieldname === 'profileImage' ? 'party-profile' : 'party-doc';
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
        partyName: { type: 'string' },
        businessName: { type: 'string' },
        phoneNumber: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        address: { type: 'string' },
        district: { type: 'string' },
        upozela: { type: 'string' },
        bazzarArea: { type: 'string', description: 'Bazzar/Area' },
        bazzar: { type: 'string', description: 'Bazzar (alias)' },
        area: { type: 'string', description: 'Area (alias)' },
        description: { type: 'string' },
        companyId: { type: 'string' },
        categoryId: { type: 'string' },
        treadLicense: { type: 'string' },
        openingDue: { type: 'number' },
        creditLimit: { type: 'number' },
        status: {
          type: 'string',
          description: 'Status of the party (ACTIVE/INACTIVE)',
        },
        partyDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        profileImage: {
          type: 'string',
          format: 'binary',
          description: 'profile image of the party',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Update a party' })
  update(
    @Param('id') id: string,
    @Body() updatePartyDto: UpdatePartyDto,
    @UploadedFiles()
    files: {
      partyDocument?: Express.Multer.File[];
      profileImage?: Express.Multer.File[];
    },
    @Req() req?: any,
  ) {
    const dataToUpdate: any = { ...updatePartyDto };

    if (files) {
      if (files.partyDocument && files.partyDocument.length > 0) {
        dataToUpdate.partyDocument = files.partyDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      }
      if (files.profileImage && files.profileImage.length > 0) {
        dataToUpdate.profileImage = `/uploads/documents/${files.profileImage[0].filename}`;
      }
    }

    // Normalize bazzarArea
    const bazzarAreaValue =
      updatePartyDto.bazzarArea || updatePartyDto.bazzar || updatePartyDto.area;
    if (bazzarAreaValue) {
      dataToUpdate.bazzarArea = bazzarAreaValue;
    }

    // Remove alias properties
    delete dataToUpdate.bazzar;
    delete dataToUpdate.area;

    // Convert openingDue and creditLimit to numbers in case they were sent as strings in form-data
    if (dataToUpdate.openingDue !== undefined && dataToUpdate.openingDue !== null && (dataToUpdate.openingDue as any) !== '') {
      const openingDue = Number(dataToUpdate.openingDue);
      if (!isNaN(openingDue)) {
        dataToUpdate.openingDue = openingDue;
      } else {
        delete dataToUpdate.openingDue;
      }
    } else {
      delete dataToUpdate.openingDue;
    }

    if (dataToUpdate.creditLimit !== undefined && dataToUpdate.creditLimit !== null && (dataToUpdate.creditLimit as any) !== '') {
      const creditLimit = Number(dataToUpdate.creditLimit);
      if (!isNaN(creditLimit)) {
        dataToUpdate.creditLimit = creditLimit;
      } else {
        delete dataToUpdate.creditLimit;
      }
    } else {
      delete dataToUpdate.creditLimit;
    }

    // Clean up undefined properties
    Object.keys(dataToUpdate).forEach((key) => {
      if (dataToUpdate[key] === undefined) {
        delete dataToUpdate[key];
      }
    });

    return this.partyService.update(id, dataToUpdate, req?.user);
  }

  @Get(':id/drivers')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary:
      'Get list of drivers hired by a party and their associated companies',
  })
  @ApiResponse({
    status: 200,
    description: 'Return driver list with company details.',
  })
  @ApiResponse({ status: 404, description: 'Party not found.' })
  getPartyDrivers(@Param('id') id: string) {
    return this.partyService.getPartyDrivers(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a party' })
  remove(@Param('id') id: string, @Req() req?: any) {
    return this.partyService.remove(id, req?.user);
  }
}
