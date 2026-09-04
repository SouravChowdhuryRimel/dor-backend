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
  Req,
  Query,
} from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { GetInquiriesQueryDto } from './dto/get-inquiries-query.dto';
import { CreateInquiryResponseDto } from './dto/create-inquiry-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/constants/role.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const inquiryImageUpload = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const path = './uploads/inquiries';
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      callback(null, `inquiry-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
};

@ApiTags('Inquiries')
@Controller('inquiries')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  private extractUserRoleAndId(req: any): { userId: string; role: string } {
    const user = req.user || {};
    const userId = user.sub || user.id;
    const roles: string[] = user.roles || [];

    let role = 'GUEST';
    if (roles.includes(Role.VENDOR)) {
      role = 'COMPANY';
    } else if (roles.includes(Role.PARTY)) {
      role = 'PARTY';
    } else if (roles.includes(Role.ADMIN) || roles.includes(Role.SUPER_ADMIN)) {
      role = 'ADMIN';
    }

    return { userId, role };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PARTY)
  @UseInterceptors(FilesInterceptor('images', 5, inquiryImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit a new product inquiry with optional images (PARTY only)' })
  @ApiResponse({ status: 201, description: 'Inquiry successfully submitted.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string', example: 'Looking for Premium Cement' },
        productName: { type: 'string', example: 'Supercrete Cement' },
        description: { type: 'string', example: 'Need 500 bags for construction' },
        quantity: { type: 'string', example: '500 Bags' },
        deadline: { type: 'string', example: '2026-09-15' },
        categoryId: { type: 'string', description: 'Category ID (Optional: Auto-retrieved from Party profile if omitted)' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Multiple product images (optional)',
        },
      },
    },
  })
  create(
    @Req() req: any,
    @Body() createInquiryDto: CreateInquiryDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const partyId = req.user.sub;
    if (files && files.length > 0) {
      createInquiryDto.imageUrls = files.map(
        (file) => `/uploads/inquiries/${file.filename}`,
      );
    }
    return this.inquiryService.create(partyId, createInquiryDto);
  }

  @Post(':id/responses')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Submit a response or price offer for an inquiry (COMPANY only)' })
  @ApiResponse({ status: 201, description: 'Response/offer submitted successfully.' })
  respond(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateInquiryResponseDto,
  ) {
    const companyId = req.user.sub;
    return this.inquiryService.respond(id, companyId, dto);
  }

  @Patch(':id/close')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PARTY)
  @ApiOperation({ summary: 'Close an inquiry so no further responses are accepted (PARTY only)' })
  @ApiResponse({ status: 200, description: 'Inquiry closed successfully.' })
  close(@Param('id') id: string, @Req() req: any) {
    const partyId = req.user.sub;
    return this.inquiryService.closeInquiry(id, partyId);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get all inquiries with role-based privacy filters (Authenticated)' })
  @ApiResponse({ status: 200, description: 'Return all inquiries.' })
  findAll(@Req() req: any, @Query() query: GetInquiriesQueryDto) {
    const { userId, role } = this.extractUserRoleAndId(req);
    return this.inquiryService.findAll(query, userId, role);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get inquiry details by ID with role-based privacy filters (Authenticated)' })
  @ApiResponse({ status: 200, description: 'Return inquiry details.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const { userId, role } = this.extractUserRoleAndId(req);
    return this.inquiryService.findOne(id, userId, role);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PARTY)
  @UseInterceptors(FilesInterceptor('images', 5, inquiryImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an inquiry (PARTY only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        productName: { type: 'string' },
        description: { type: 'string' },
        quantity: { type: 'string' },
        deadline: { type: 'string' },
        categoryId: { type: 'string' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Multiple product images (optional)',
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateInquiryDto: UpdateInquiryDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const partyId = req.user.sub;
    if (files && files.length > 0) {
      updateInquiryDto.imageUrls = files.map(
        (file) => `/uploads/inquiries/${file.filename}`,
      );
    }
    return this.inquiryService.update(id, partyId, updateInquiryDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PARTY)
  @ApiOperation({ summary: 'Delete an inquiry (PARTY only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    const partyId = req.user.sub;
    return this.inquiryService.remove(id, partyId);
  }
}
