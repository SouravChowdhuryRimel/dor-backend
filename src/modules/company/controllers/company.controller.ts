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
        latitude: { type: 'number', example: 23.8103 },
        longitude: { type: 'number', example: 90.4125 },
        address: { type: 'string' },
        categoryId: { type: 'string' },
        incomeTax: { type: 'string' },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          example: ['ইলেকট্রনিক', 'কম্পিউটার', 'মোবাইল'],
          description: 'Keywords or services for the company',
        },
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
        'latitude',
        'longitude',
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
    if (
      createCompanyDto.keywords &&
      typeof (createCompanyDto.keywords as any) === 'string'
    ) {
      try {
        createCompanyDto.keywords = JSON.parse(
          createCompanyDto.keywords as any,
        );
      } catch {
        createCompanyDto.keywords = ((createCompanyDto.keywords as any) as string)
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean);
      }
    }
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
  getPending(@Query() query: PaginationQueryDto, @Req() req: any) {
    return this.companyService.findPending(query, req.user);
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
        companyName: { type: 'string' },
        ownerName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        latitude: { type: 'number', example: 23.8103 },
        longitude: { type: 'number', example: 90.4125 },
        address: { type: 'string' },
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
        keywords: {
          type: 'array',
          items: { type: 'string' },
          example: ['ইলেকট্রনিক', 'কম্পিউটার', 'মোবাইল'],
          description: 'Keywords or services for the company',
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

    if (
      dataToUpdate.keywords &&
      typeof (dataToUpdate.keywords as any) === 'string'
    ) {
      try {
        dataToUpdate.keywords = JSON.parse(dataToUpdate.keywords as any);
      } catch {
        dataToUpdate.keywords = ((dataToUpdate.keywords as any) as string)
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean);
      }
    }

    return this.companyService.update(id, dataToUpdate, req.user);
  }

  @Patch(':id/keywords')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add, remove, or replace keywords/services for a company/seller' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          example: ['ইলেকট্রনিক', 'কম্পিউটার', 'মোবাইল'],
          description: 'Full list of keywords to replace existing ones',
        },
        addKeywords: {
          type: 'array',
          items: { type: 'string' },
          example: ['ট্যাবলেট'],
          description: 'Keywords to add to existing ones',
        },
        removeKeywords: {
          type: 'array',
          items: { type: 'string' },
          example: ['মোবাইল'],
          description: 'Keywords to remove',
        },
      },
    },
  })
  updateKeywords(
    @Param('id') id: string,
    @Body()
    body: {
      keywords?: string[];
      addKeywords?: string[];
      removeKeywords?: string[];
    },
    @Req() req: any,
  ) {
    if (body.addKeywords && body.addKeywords.length > 0) {
      return this.companyService.addKeywords(id, body.addKeywords, req.user);
    }
    if (body.removeKeywords && body.removeKeywords.length > 0) {
      return this.companyService.removeKeywords(
        id,
        body.removeKeywords,
        req.user,
      );
    }
    return this.companyService.updateKeywords(
      id,
      body.keywords || [],
      req.user,
    );
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
