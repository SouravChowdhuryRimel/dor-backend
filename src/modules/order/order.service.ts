import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { createPaginatedResponse, PaginationQueryDto } from '../../shared/pagination/pagination.util';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(createOrderDto: CreateOrderDto, reqUser?: any) {
    // Verify company exists
    const companyExists = await this.prisma.company.findUnique({
      where: { companyId: createOrderDto.companyId },
    });
    if (!companyExists) {
      throw new NotFoundException(`Company with ID "${createOrderDto.companyId}" not found`);
    }

    // Verify product exists
    const productExists = await this.prisma.product.findUnique({
      where: { productId: createOrderDto.productId },
    });
    if (!productExists) {
      throw new NotFoundException(`Product with ID "${createOrderDto.productId}" not found`);
    }

    // Verify party exists if provided
    if (createOrderDto.partyId) {
      const partyExists = await this.prisma.party.findUnique({
        where: { partyId: createOrderDto.partyId },
      });
      if (!partyExists) {
        throw new NotFoundException(`Party/Customer with ID "${createOrderDto.partyId}" not found`);
      }
    }

    const showOrderId = createOrderDto.showOrderId || `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const order = await this.prisma.order.create({
      data: {
        ...createOrderDto,
        showOrderId,
        status: (createOrderDto.status as OrderStatus) || OrderStatus.PENDING,
      },
    });

    const actorId = reqUser?.sub || createOrderDto.partyId || createOrderDto.companyId;
    const actorType = reqUser?.roles[0] || (createOrderDto.partyId ? 'PARTY' : 'COMPANY');
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'CREATE_ORDER',
      description: `Created order ${showOrderId} for party ${createOrderDto.partyId || 'N/A'} and company ${createOrderDto.companyId}`,
    });

    return order;
  }

  async findAll(query?: GetOrdersQueryDto) {
    const where: any = {};
    if (query?.companyId) {
      where.companyId = query.companyId;
    }
    if (query?.partyId) {
      where.partyId = query.partyId;
    }
    if (query?.status) {
      where.status = query.status as OrderStatus;
    }
    if (query?.search) {
      where.showOrderId = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    const allowedSortFields = ['createdAt', 'totalRate', 'bag', 'status'];
    const sortBy = query?.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = query?.sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy[sortBy] = sortOrder;

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: true,
          product: true,
          party: true,
        },
        orderBy,
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderId: id },
      include: {
        company: true,
        product: true,
        party: true,
        deliveries: true,
        complaints: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, reqUser?: any) {
    const order = await this.findOne(id);

    if (updateOrderDto.companyId) {
      const companyExists = await this.prisma.company.findUnique({
        where: { companyId: updateOrderDto.companyId },
      });
      if (!companyExists) {
        throw new NotFoundException(`Company with ID "${updateOrderDto.companyId}" not found`);
      }
    }

    if (updateOrderDto.productId) {
      const productExists = await this.prisma.product.findUnique({
        where: { productId: updateOrderDto.productId },
      });
      if (!productExists) {
        throw new NotFoundException(`Product with ID "${updateOrderDto.productId}" not found`);
      }
    }

    if (updateOrderDto.partyId) {
      const partyExists = await this.prisma.party.findUnique({
        where: { partyId: updateOrderDto.partyId },
      });
      if (!partyExists) {
        throw new NotFoundException(`Party/Customer with ID "${updateOrderDto.partyId}" not found`);
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { orderId: id },
      data: {
        ...updateOrderDto,
        status: updateOrderDto.status ? (updateOrderDto.status as OrderStatus) : undefined,
      },
    });

    const actorId = reqUser?.sub || updatedOrder.partyId || updatedOrder.companyId;
    const actorType = reqUser?.roles[0] || (updatedOrder.partyId ? 'PARTY' : 'COMPANY');
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'UPDATE_ORDER',
      description: `Updated order ${updatedOrder.showOrderId}`,
    });

    return updatedOrder;
  }

  async remove(id: string, reqUser?: any) {
    const order = await this.findOne(id);
    const deletedOrder = await this.prisma.order.delete({
      where: { orderId: id },
    });

    const actorId = reqUser?.sub || deletedOrder.partyId || deletedOrder.companyId;
    const actorType = reqUser?.roles[0] || (deletedOrder.partyId ? 'PARTY' : 'COMPANY');
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'DELETE_ORDER',
      description: `Deleted order ${deletedOrder.showOrderId}`,
    });

    return deletedOrder;
  }

  async generateInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      include: {
        company: true,
        party: true,
        product: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    const invoiceNumber = `INV-${order.showOrderId}`;
    const issueDate = order.createdAt;
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + 7);

    const quantity = order.bag;
    const rate = quantity > 0 ? order.totalRate / quantity : 0;
    const subtotal = order.totalRate;
    const vat = subtotal * 0.05; // 5% VAT
    const grandTotal = subtotal + vat;

    return {
      invoiceMeta: {
        invoiceNumber,
        issueDate,
        dueDate,
        status: order.status,
      },
      seller: {
        companyId: order.company.companyId,
        companyName: order.company.companyName,
        ownerName: order.company.ownerName,
        email: order.company.email,
        phoneNumber: order.company.phoneNumber,
        address: `${order.company.address}, ${order.company.upozela}, ${order.company.district}`,
      },
      buyer: order.party ? {
        partyId: order.party.partyId,
        partyName: order.party.partyName,
        businessName: order.party.businessName,
        email: order.party.email,
        phoneNumber: order.party.phoneNumber,
        address: `${order.party.address}, ${order.party.upozela}, ${order.party.district}`,
      } : null,
      item: {
        productId: order.product.productId,
        productName: order.product.productName,
        unit: order.product.unit,
        bagSize: order.product.bagSize,
        quantity,
        unitPrice: rate,
        subtotal,
      },
      totals: {
        subtotal,
        vat,
        grandTotal,
      },
    };
  }

  async findDriverAssignedOrders(driverId: string, type?: string, query?: PaginationQueryDto) {
    // Verify driver exists
    const driverExists = await this.prisma.driver.findUnique({
      where: { driverId },
    });
    if (!driverExists) {
      throw new NotFoundException(`Driver with ID "${driverId}" not found`);
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { driverId };

    if (type === 'pending') {
      where.status = 'VAN_COMING';
    } else if (type === 'ongoing') {
      where.status = {
        in: ['TRANSFER_IN_PROGRESS', 'NEAREST_TRANSFER'],
      };
    } else if (type === 'completed') {
      where.status = 'DELIVERED';
    }

    const [total, data] = await Promise.all([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            include: {
              company: true,
              product: true,
              party: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }
}
