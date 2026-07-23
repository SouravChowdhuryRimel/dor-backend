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
} from '@nestjs/common';
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('register')
  @UseInterceptors(
    FilesInterceptor('companyDocument', 10, {
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
          callback(null, `doc-${uniqueSuffix}${ext}`);
        },
      }),
    }),
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
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (files && files.length > 0) {
      createCompanyDto.companyDocument = files.map(
        (file) => `/uploads/documents/${file.filename}`,
      );
    } else {
      createCompanyDto.companyDocument = [];
    }
    return this.companyService.register(createCompanyDto);
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all pending company registrations (ADMIN only)',
  })
  getPending() {
    return this.companyService.findPending();
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Approve a company registration and assign it to the Admin (ADMIN only)',
  })
  approve(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user['sub'];
    return this.companyService.approve(id, adminId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  findAll() {
    return this.companyService.findAll();
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
    FilesInterceptor('companyDocument', 10, {
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
          callback(null, `doc-${uniqueSuffix}${ext}`);
        },
      }),
    }),
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
      },
    },
  })
  @ApiOperation({ summary: 'Update a company' })
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (files && files.length > 0) {
      updateCompanyDto.companyDocument = files.map(
        (file) => `/uploads/documents/${file.filename}`,
      );
    }
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Delete a company' })
  remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }
}
