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
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { GetDeliveriesQueryDto } from './dto/get-deliveries-query.dto';
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
  @ApiResponse({ status: 200, description: 'Delivery assignment successfully updated.' })
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
  @ApiResponse({ status: 200, description: 'Delivery assignment successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Delivery assignment not found.' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deliveryService.remove(id, req.user);
  }
}
