import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { GetDeliveriesQueryDto } from './dto/get-deliveries-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { DeliveryStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const deliveryProofUpload = {
  storage: diskStorage({
    destination: (req, file, callback) => {
      const path = './uploads/deliveries';
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
      callback(
        null,
        `delivery-proof-${uniqueSuffix}${extname(file.originalname)}`,
      );
    },
  }),
};

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new delivery assignment' })
  @ApiResponse({
    status: 201,
    description: 'Delivery assignment successfully created.',
  })
  create(@Body() createDeliveryDto: CreateDeliveryDto, @Req() req: any) {
    return this.deliveryService.create(createDeliveryDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all deliveries' })
  @ApiResponse({ status: 200, description: 'Return all deliveries.' })
  findAll(@Query() query: GetDeliveriesQueryDto) {
    return this.deliveryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a delivery assignment by ID' })
  @ApiResponse({ status: 200, description: 'Return delivery details.' })
  @ApiResponse({ status: 404, description: 'Delivery assignment not found.' })
  findOne(@Param('id') id: string) {
    return this.deliveryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a delivery assignment' })
  @ApiResponse({
    status: 200,
    description: 'Delivery assignment successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Delivery assignment not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
    @Req() req: any,
  ) {
    return this.deliveryService.update(id, updateDeliveryDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a delivery assignment' })
  @ApiResponse({
    status: 200,
    description: 'Delivery assignment successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Delivery assignment not found.' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deliveryService.remove(id, req.user);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a delivery assignment (Driver)' })
  accept(@Param('id') id: string, @Req() req: any) {
    return this.deliveryService.acceptDelivery(id, req.user);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a delivery assignment (Driver)' })
  reject(@Param('id') id: string, @Req() req: any) {
    return this.deliveryService.rejectDelivery(id, req.user);
  }

  @Patch(':id/pickup')
  @UseInterceptors(FileInterceptor('pickupProof', deliveryProofUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Pickup a delivery and upload pickup proof (Driver)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pickupProof: { type: 'string', format: 'binary' },
      },
    },
  })
  pickup(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    let pickupProofPath = '';
    if (file) {
      pickupProofPath = `/uploads/deliveries/${file.filename}`;
    } else if (req.body?.pickupProof) {
      pickupProofPath = req.body.pickupProof;
    }
    return this.deliveryService.pickupDelivery(id, pickupProofPath, req.user);
  }

  @Patch(':id/reached')
  @ApiOperation({ summary: 'Reached delivery location (Driver)' })
  reached(@Param('id') id: string, @Req() req: any) {
    return this.deliveryService.reachedDelivery(id, req.user);
  }

  @Patch(':id/deliver')
  @UseInterceptors(FileInterceptor('deliveryProof', deliveryProofUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Complete delivery and upload delivery proof (Driver)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deliveryProof: { type: 'string', format: 'binary' },
      },
    },
  })
  deliver(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    let deliveryProofPath = '';
    if (file) {
      deliveryProofPath = `/uploads/deliveries/${file.filename}`;
    } else if (req.body?.deliveryProof) {
      deliveryProofPath = req.body.deliveryProof;
    }
    return this.deliveryService.completeDelivery(
      id,
      deliveryProofPath,
      req.user,
    );
  }
}
