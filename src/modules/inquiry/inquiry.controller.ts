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
  UploadedFile,
  Req,
  Query,
} from '@nestjs/common';
import { InquiryService } from './inquiry.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { GetInquiriesQueryDto } from './dto/get-inquiries-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/constants/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PARTY)
  @UseInterceptors(FileInterceptor('image', inquiryImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submit a new inquiry (PARTY only)' })
  @ApiResponse({ status: 201, description: 'Inquiry successfully submitted.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'description', 'categoryId'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        categoryId: { type: 'string' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Product Image (optional)',
        },
      },
    },
  })
  create(
    @Req() req: any,
    @Body() createInquiryDto: CreateInquiryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const partyId = req.user.sub;
    if (file) {
      createInquiryDto.imageUrl = `/uploads/inquiries/${file.filename}`;
    }
    return this.inquiryService.create(partyId, createInquiryDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get all inquiries (Authenticated)' })
  @ApiResponse({ status: 200, description: 'Return all inquiries.' })
  findAll(@Query() query: GetInquiriesQueryDto) {
    return this.inquiryService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get inquiry by ID (Authenticated)' })
  @ApiResponse({ status: 200, description: 'Return inquiry details.' })
  findOne(@Param('id') id: string) {
    return this.inquiryService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.PARTY)
  @UseInterceptors(FileInterceptor('image', inquiryImageUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an inquiry (PARTY only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        categoryId: { type: 'string' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Product Image (optional)',
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateInquiryDto: UpdateInquiryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const partyId = req.user.sub;
    if (file) {
      updateInquiryDto.imageUrl = `/uploads/inquiries/${file.filename}`;
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
