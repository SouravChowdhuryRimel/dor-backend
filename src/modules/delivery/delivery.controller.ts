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
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { DeliveryStatus } from '@prisma/client';

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('deliveries')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new delivery assignment' })
  @ApiResponse({ status: 201, description: 'Delivery assignment successfully created.' })
  create(@Body() createDeliveryDto: CreateDeliveryDto) {
    return this.deliveryService.create(createDeliveryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all deliveries' })
  @ApiQuery({ name: 'driverId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
  @ApiResponse({ status: 200, description: 'Return all deliveries.' })
  findAll(
    @Query('driverId') driverId?: string,
    @Query('status') status?: DeliveryStatus,
  ) {
    return this.deliveryService.findAll({ driverId, status });
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
  @ApiResponse({ status: 200, description: 'Delivery assignment successfully updated.' })
  @ApiResponse({ status: 404, description: 'Delivery assignment not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
  ) {
    return this.deliveryService.update(id, updateDeliveryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a delivery assignment' })
  @ApiResponse({ status: 200, description: 'Delivery assignment successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Delivery assignment not found.' })
  remove(@Param('id') id: string) {
    return this.deliveryService.remove(id);
  }
}
