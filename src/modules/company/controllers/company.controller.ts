import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../shared/pagination/pagination.util';
import { CompanyService } from '../services/company.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { AccessTokenGuard } from '../../../common/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/role.enum';
import { CompanyStatus } from '@prisma/client';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'companyDocument', maxCount: 10 },
        { name: 'companyImage', maxCount: 1 },
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
              file.fieldname === 'companyImage'
                ? 'company-image'
                : 'company-doc';
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
        password: { type: 'string' },
        companyName: { type: 'string' },
        ownerName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        district: { type: 'string' },
        upozela: { type: 'string' },
        address: { type: 'string' },
        categoryId: { type: 'string' },
        incomeTax: { type: 'string' },
        companyDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        companyImage: {
          type: 'string',
          format: 'binary',
          description: 'Company image / logo',
        },
      },
      required: [
        'phoneNumber',
        'password',
        'companyName',
        'ownerName',
        'email',
        'district',
        'upozela',
        'address',
        'categoryId',
      ],
    },
  })
  @ApiOperation({ summary: 'Register a new Company' })
  @ApiResponse({
    status: 201,
    description: 'Company successfully registered with PENDING status.',
  })
  register(
    @Body() createCompanyDto: CreateCompanyDto,
    @UploadedFiles()
    files: {
      companyDocument?: Express.Multer.File[];
      companyImage?: Express.Multer.File[];
    },
  ) {
    const typedFiles = files as {
      companyDocument?: Express.Multer.File[];
      companyImage?: Express.Multer.File[];
    };
    let uploadedDocs: string[] = [];
    if (typedFiles) {
      if (typedFiles.companyDocument && typedFiles.companyDocument.length > 0) {
        uploadedDocs = typedFiles.companyDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      }
      if (typedFiles.companyImage && typedFiles.companyImage.length > 0) {
        createCompanyDto.companyImage = `/uploads/documents/${typedFiles.companyImage[0].filename}`;
      }
    }
    createCompanyDto.companyDocument = uploadedDocs;
    return this.companyService.register(createCompanyDto);
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get all pending company registrations (ADMIN and SUPER_ADMIN only)',
  })
  getPending(@Query() query: PaginationQueryDto) {
    return this.companyService.findPending(query);
  }

  @Get('verified')
  @ApiOperation({ summary: 'Get all verified companies' })
  @ApiResponse({ status: 200, description: 'Returns all verified companies.' })
  getVerified(@Query() query: PaginationQueryDto) {
    return this.companyService.findVerified(query);
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Approve a company registration and assign it to the approver (ADMIN and SUPER_ADMIN only)',
  })
  approve(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user['sub'];
    return this.companyService.approve(id, adminId, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.companyService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get a company by ID' })
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'companyDocument', maxCount: 10 },
        { name: 'companyImage', maxCount: 1 },
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
              file.fieldname === 'companyImage'
                ? 'company-image'
                : 'company-doc';
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
        password: { type: 'string' },
        companyName: { type: 'string' },
        ownerName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        district: { type: 'string' },
        upozela: { type: 'string' },
        address: { type: 'string' },
        categoryId: { type: 'string' },
        incomeTax: { type: 'string' },
        status: { type: 'string', enum: Object.values(CompanyStatus) },
        companyDocument: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        companyImage: {
          type: 'string',
          format: 'binary',
          description: 'Company image / logo',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Update a company' })
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @UploadedFiles()
    files: {
      companyDocument?: Express.Multer.File[];
      companyImage?: Express.Multer.File[];
    },
    @Req() req: any,
  ) {
    const typedFiles = files as {
      companyDocument?: Express.Multer.File[];
      companyImage?: Express.Multer.File[];
    };
    const dataToUpdate: UpdateCompanyDto = { ...updateCompanyDto };

    if (typedFiles) {
      if (typedFiles.companyDocument && typedFiles.companyDocument.length > 0) {
        dataToUpdate.companyDocument = typedFiles.companyDocument.map(
          (file) => `/uploads/documents/${file.filename}`,
        );
      }
      if (typedFiles.companyImage && typedFiles.companyImage.length > 0) {
        dataToUpdate.companyImage = `/uploads/documents/${typedFiles.companyImage[0].filename}`;
      }
    }

    return this.companyService.update(id, dataToUpdate, req.user);
  }

  @Get(':id/drivers')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary:
      'Get list of drivers hired by a company and their associated parties',
  })
  @ApiResponse({
    status: 200,
    description: 'Return driver list with party details.',
  })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  getCompanyDrivers(@Param('id') id: string) {
    return this.companyService.getCompanyDrivers(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Delete a company' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.companyService.remove(id, req.user);
  }
}
