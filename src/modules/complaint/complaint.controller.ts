import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateComplaintReplyDto } from './dto/create-complaint-reply.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { GetComplaintsQueryDto } from './dto/get-complaints-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/role.enum';
import { ComplaintStatus } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const complaintUploadConfig = {
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      callback(null, `complaint-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
};

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('complaints')
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 10, complaintUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new complaint' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        showComplaintId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        partyId: { type: 'string' },
        companyId: { type: 'string' },
        orderId: { type: 'string' },
        driverId: { type: 'string' },
        productId: { type: 'string' },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['title', 'description', 'partyId', 'companyId'],
    },
  })
  create(
    @Body() createComplaintDto: CreateComplaintDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (files && files.length > 0) {
      createComplaintDto.attachments = files.map(
        (file) => `/uploads/documents/${file.filename}`,
      );
    } else {
      createComplaintDto.attachments = [];
    }
    return this.complaintService.create(createComplaintDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all complaints' })
  @ApiResponse({ status: 200, description: 'Return all complaints.' })
  findAll(@Query() query: GetComplaintsQueryDto, @Req() req: any) {
    return this.complaintService.findAll(query, req.user);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Get summary metrics of complaints (Counts of Pending vs Resolved)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns pendingCount and resolvedCount.',
  })
  getSummary(@Req() req: any) {
    return this.complaintService.getCounts(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complaint details and discussion thread' })
  @ApiResponse({ status: 200, description: 'Return complaint details.' })
  @ApiResponse({ status: 404, description: 'Complaint not found.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.complaintService.findOne(id, req.user);
  }

  @Post(':id/reply')
  @UseInterceptors(FilesInterceptor('attachments', 10, complaintUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Post a reply to the complaint discussion thread' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        senderId: { type: 'string' },
        senderRole: { type: 'string' },
        senderName: { type: 'string' },
        message: { type: 'string' },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['senderId', 'senderRole', 'senderName', 'message'],
    },
  })
  addReply(
    @Param('id') id: string,
    @Body() createComplaintReplyDto: CreateComplaintReplyDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (files && files.length > 0) {
      createComplaintReplyDto.attachments = files.map(
        (file) => `/uploads/documents/${file.filename}`,
      );
    } else {
      createComplaintReplyDto.attachments = [];
    }
    return this.complaintService.addReply(
      id,
      createComplaintReplyDto,
      req.user,
    );
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a complaint status' })
  @ApiResponse({
    status: 200,
    description: 'Complaint status successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Complaint not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateComplaintStatusDto: UpdateComplaintStatusDto,
    @Req() req: any,
  ) {
    return this.complaintService.updateStatus(
      id,
      updateComplaintStatusDto.status,
      req.user,
    );
  }
}
