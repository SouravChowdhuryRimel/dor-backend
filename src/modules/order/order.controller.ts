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
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { PaginationQueryDto } from '../../shared/pagination/pagination.util';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/role.enum';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order successfully created.' })
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.orderService.create(createOrderDto, req.user);
  }

  @Get('driver/:driverId')
  @ApiOperation({
    summary:
      'Get assigned orders for a driver filtered by status type (pending, ongoing, completed)',
  })
  @ApiResponse({ status: 200, description: 'Return driver assigned orders.' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['pending', 'ongoing', 'completed'],
  })
  findDriverAssignedOrders(
    @Param('driverId') driverId: string,
    @Query('type') type?: string,
    @Query() query?: PaginationQueryDto,
  ) {
    return this.orderService.findDriverAssignedOrders(driverId, type, query);
  }

  @Get(':id/invoice')
  @ApiOperation({
    summary: 'Generate detailed JSON invoice/receipt for an order',
  })
  @ApiResponse({ status: 200, description: 'Return detailed invoice object.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  generateInvoice(@Param('id') id: string, @Req() req: any) {
    return this.orderService.generateInvoice(id, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Return all orders.' })
  findAll(@Query() query: GetOrdersQueryDto, @Req() req: any) {
    return this.orderService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiResponse({ status: 200, description: 'Return order details.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.orderService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({ status: 200, description: 'Order successfully updated.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Req() req: any,
  ) {
    return this.orderService.update(id, updateOrderDto, req.user);
  }

  @Patch(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Accept an order (Company/Admin only)' })
  @ApiResponse({ status: 200, description: 'Order successfully accepted.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid order status or transition.',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  accept(@Param('id') id: string, @Req() req: any) {
    return this.orderService.acceptOrder(id, req.user);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel an order (Company/Admin only)' })
  @ApiResponse({ status: 200, description: 'Order successfully cancelled.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid order status or transition.',
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.orderService.cancelOrder(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 200, description: 'Order successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.orderService.remove(id, req.user);
  }
}
