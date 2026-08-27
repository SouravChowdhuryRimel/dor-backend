import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../shared/pagination/pagination.util';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { OrderStatus } from '@prisma/client';
import { NotificationGateway } from '../notification/notification.gateway';
import { Role } from '../../common/constants/role.enum';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createOrderDto: CreateOrderDto, reqUser?: any) {
    // Verify company exists
    const companyExists = await this.prisma.company.findUnique({
      where: { companyId: createOrderDto.companyId },
    });
    if (!companyExists) {
      throw new NotFoundException(
        `Company with ID "${createOrderDto.companyId}" not found`,
      );
    }

    // Verify product exists
    const productExists = await this.prisma.product.findUnique({
      where: { productId: createOrderDto.productId },
    });
    if (!productExists) {
      throw new NotFoundException(
        `Product with ID "${createOrderDto.productId}" not found`,
      );
    }

    // Verify party exists if provided
    if (createOrderDto.partyId) {
      const partyExists = await this.prisma.party.findUnique({
        where: { partyId: createOrderDto.partyId },
      });
      if (!partyExists) {
        throw new NotFoundException(
          `Party/Customer with ID "${createOrderDto.partyId}" not found`,
        );
      }
    }

    const {
      address,
      upozela,
      district,
      deliveryTime,
      specialNote,
      discount,
      ...orderData
    } = createOrderDto;

    const showOrderId =
      createOrderDto.showOrderId ||
      `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const order = await this.prisma.order.create({
      data: {
        showOrderId,
        companyId: orderData.companyId,
        productId: orderData.productId,
        bag: orderData.bag,
        bagSize: orderData.bagSize,
        totalRate: orderData.totalRate,
        partyId: orderData.partyId || null,
        discount: discount || 0,
        status: (createOrderDto.status as OrderStatus) || OrderStatus.PENDING,
      },
    });

    if (address || district || upozela) {
      await this.prisma.delivery.create({
        data: {
          address: address || '',
          upozela: upozela || '',
          district: district || '',
          description: specialNote || '',
          deliveryTime: deliveryTime ? new Date(deliveryTime) : new Date(),
          orderId: order.orderId,
          status: 'PENDING',
          driverId: null,
        },
      });
    }

    const actorId =
      reqUser?.sub || createOrderDto.partyId || createOrderDto.companyId;
    const actorType =
      reqUser?.roles[0] || (createOrderDto.partyId ? 'PARTY' : 'COMPANY');
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'CREATE_ORDER',
      description: `Created order ${showOrderId} for party ${createOrderDto.partyId || 'N/A'} and company ${createOrderDto.companyId}`,
      companyId: createOrderDto.companyId,
      partyId: createOrderDto.partyId,
    });

    return order;
  }

  async findAll(query?: GetOrdersQueryDto, reqUser?: any) {
    const where: any = {};
    if (query?.companyId) {
      where.companyId = query.companyId;
    }
    if (query?.partyId) {
      where.partyId = query.partyId;
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        where.companyId = reqUser.sub;
      } else if (reqUser.roles.includes(Role.PARTY)) {
        where.partyId = reqUser.sub;
      } else if (reqUser.roles.includes(Role.DRIVER)) {
        where.deliveries = { some: { driverId: reqUser.sub } };
      } else if (reqUser.roles.includes(Role.ADMIN) && !reqUser.roles.includes(Role.SUPER_ADMIN)) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.product = { categoryId: { in: categoryIds } };
      }
    }

    if (query?.status) {
      where.status = query.status as OrderStatus;
    }
    if (query?.search) {
      where.OR = [
        {
          showOrderId: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          party: {
            partyName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
        {
          party: {
            businessName: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    const allowedSortFields = ['createdAt', 'totalRate', 'bag', 'status'];
    const sortBy =
      query?.sortBy && allowedSortFields.includes(query.sortBy)
        ? query.sortBy
        : 'createdAt';
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

    const mapOrderStatusText = (status: OrderStatus): string => {
      switch (status) {
        case 'PENDING':
          return 'পেন্ডিং';
        case 'ACCEPTED':
          return 'Accepted';
        case 'PROCESSING':
          return 'Driver Assigned';
        case 'DISPATCHED':
          return 'ইন-ট্রানজিট';
        case 'DELIVERED':
          return 'Delivered';
        case 'CANCELLED':
          return 'Cancelled';
        default:
          return status;
      }
    };

    const mappedData = data.map((order) => {
      return {
        ...order,
        statusText: mapOrderStatusText(order.status),
        quantityText: `${order.bag} ${order.product?.unit || 'Bag'}`,
        partyName: order.party?.businessName || order.party?.partyName || 'N/A',
      };
    });

    return createPaginatedResponse(mappedData, total, page, limit);
  }

  async findOne(id: string, reqUser?: any) {
    const order = await this.prisma.order.findUnique({
      where: { orderId: id },
      include: {
        company: true,
        product: true,
        party: true,
        deliveries: {
          include: {
            driver: true,
          },
        },
        complaints: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        if (order.companyId !== reqUser.sub) {
          throw new ForbiddenException('You do not have permission to access this order');
        }
      } else if (reqUser.roles.includes(Role.PARTY)) {
        if (order.partyId !== reqUser.sub) {
          throw new ForbiddenException('You do not have permission to access this order');
        }
      } else if (reqUser.roles.includes(Role.DRIVER)) {
        const hasDelivery = order.deliveries?.some((d) => d.driverId === reqUser.sub);
        if (!hasDelivery) {
          throw new ForbiddenException('You do not have permission to access this order');
        }
      } else if (reqUser.roles.includes(Role.ADMIN) && !reqUser.roles.includes(Role.SUPER_ADMIN)) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        if (!categoryIds.includes(order.product.categoryId)) {
          throw new ForbiddenException('You do not have permission to access this order');
        }
      }
    }

    const mapOrderStatusText = (status: OrderStatus): string => {
      switch (status) {
        case 'PENDING':
          return 'পেন্ডিং';
        case 'ACCEPTED':
          return 'Accepted';
        case 'PROCESSING':
          return 'Driver Assigned';
        case 'DISPATCHED':
          return 'ইন-ট্রানজিট';
        case 'DELIVERED':
          return 'Delivered';
        case 'CANCELLED':
          return 'Cancelled';
        default:
          return status;
      }
    };

    const mapDeliveryStatusText = (status: string): string => {
      switch (status) {
        case 'PENDING':
          return 'পেন্ডিং (Pending)';
        case 'ACCEPTED':
          return 'গৃহীত (Accepted)';
        case 'REJECTED':
          return 'বাতিল (Rejected)';
        case 'IN_TRANSIT':
          return 'ইন-ট্রানজিট (In-Transit)';
        case 'REACHED':
          return 'পৌঁছেছে (Reached)';
        case 'DELIVERED':
          return 'ডেলিভারি সম্পন্ন (Delivered)';
        default:
          return status;
      }
    };

    const quantity = order.bag;
    const unitPrice = quantity > 0 ? order.totalRate / quantity : 0;
    const subtotal = order.totalRate;
    const discount = order.discount;
    const grandTotal = subtotal - discount;

    // Stock Check details
    const stockSize = order.product?.stockSize ?? 0;
    const isAvailable = stockSize >= quantity;
    const stockCheck = {
      productName: order.product?.productName || 'N/A',
      orderQuantity: quantity,
      stockSize: stockSize,
      isAvailable: isAvailable,
      statusText: isAvailable ? 'পর্যাপ্ত' : 'অপ্রতুল',
    };

    // Delivery and Driver Details
    const activeDelivery = order.deliveries?.[0] || null;
    let deliveryDetails = null;
    let trackingTimeline: any[] = [];

    if (activeDelivery) {
      const driver = activeDelivery.driver;

      deliveryDetails = {
        deliveryId: activeDelivery.deliveryId,
        address: activeDelivery.address,
        upozela: activeDelivery.upozela,
        district: activeDelivery.district,
        deliveryTime: activeDelivery.deliveryTime,
        status: activeDelivery.status,
        statusText: mapDeliveryStatusText(activeDelivery.status),
        currentLocation: activeDelivery.currentLocation || null,
        driver: driver
          ? {
              driverId: driver.driverId,
              driverName: driver.driverName,
              driverImage: driver.driverImage || null,
              truckNumber: driver.truckNumber || null,
              phoneNumber: driver.phoneNumber,
            }
          : null,
      };

      // Construct Delivery Tracking Timeline
      const orderAccepted =
        order.status !== 'PENDING' && order.status !== 'CANCELLED';
      const reachedPickup =
        activeDelivery.status === 'IN_TRANSIT' ||
        activeDelivery.status === 'REACHED' ||
        activeDelivery.status === 'DELIVERED';
      const pickedUp =
        activeDelivery.status === 'IN_TRANSIT' ||
        activeDelivery.status === 'REACHED' ||
        activeDelivery.status === 'DELIVERED';
      const deliveryStarted =
        activeDelivery.status === 'IN_TRANSIT' ||
        activeDelivery.status === 'REACHED' ||
        activeDelivery.status === 'DELIVERED';
      const nearDestination =
        activeDelivery.status === 'REACHED' ||
        activeDelivery.status === 'DELIVERED';
      const deliveryCompleted = activeDelivery.status === 'DELIVERED';

      trackingTimeline = [
        {
          title: 'অর্ডার গ্রহণ করা হয়েছে',
          status: orderAccepted ? 'COMPLETED' : 'PENDING',
          time: orderAccepted ? order.updatedAt : null,
        },
        {
          title: 'পিকআপ পয়েন্টে পৌঁছেছে',
          status: reachedPickup ? 'COMPLETED' : 'PENDING',
          time: reachedPickup
            ? activeDelivery.startDeliveryTime || activeDelivery.updatedAt
            : null,
        },
        {
          title: 'পণ্য সংগ্রহ করা হয়েছে (Picked Up)',
          status: pickedUp ? 'COMPLETED' : 'PENDING',
          proofImage: activeDelivery.pickupProof || null,
          time: pickedUp ? activeDelivery.startDeliveryTime : null,
        },
        {
          title: 'ডেলিভারি শুরু হয়েছে',
          status: deliveryStarted ? 'COMPLETED' : 'PENDING',
          currentLocation: activeDelivery.currentLocation || null,
          time: deliveryStarted ? activeDelivery.startDeliveryTime : null,
        },
        {
          title: 'গন্তব্যের কাছাকাছি',
          status: nearDestination ? 'COMPLETED' : 'PENDING',
          time: nearDestination ? activeDelivery.updatedAt : null,
        },
        {
          title: 'ডেলিভারি সম্পন্ন',
          status: deliveryCompleted ? 'COMPLETED' : 'PENDING',
          proofImage: activeDelivery.deliveryProof || null,
          time: deliveryCompleted ? activeDelivery.endDeliveryTime : null,
        },
      ];
    }

    return {
      ...order,
      statusText: mapOrderStatusText(order.status),
      quantityText: `${order.bag} ${order.product?.unit || 'Bag'}`,
      partyName: order.party?.businessName || order.party?.partyName || 'N/A',
      subtotal,
      discount,
      grandTotal,
      unitPrice,
      stockCheck,
      deliveryDetails,
      trackingTimeline,
    };
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, reqUser?: any) {
    const order = await this.findOne(id, reqUser);

    if (updateOrderDto.companyId) {
      const companyExists = await this.prisma.company.findUnique({
        where: { companyId: updateOrderDto.companyId },
      });
      if (!companyExists) {
        throw new NotFoundException(
          `Company with ID "${updateOrderDto.companyId}" not found`,
        );
      }
    }

    if (updateOrderDto.productId) {
      const productExists = await this.prisma.product.findUnique({
        where: { productId: updateOrderDto.productId },
      });
      if (!productExists) {
        throw new NotFoundException(
          `Product with ID "${updateOrderDto.productId}" not found`,
        );
      }
    }

    if (updateOrderDto.partyId) {
      const partyExists = await this.prisma.party.findUnique({
        where: { partyId: updateOrderDto.partyId },
      });
      if (!partyExists) {
        throw new NotFoundException(
          `Party/Customer with ID "${updateOrderDto.partyId}" not found`,
        );
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { orderId: id },
      data: {
        ...updateOrderDto,
        status: updateOrderDto.status
          ? (updateOrderDto.status as OrderStatus)
          : undefined,
      },
    });

    const actorId =
      reqUser?.sub || updatedOrder.partyId || updatedOrder.companyId;
    const actorType =
      reqUser?.roles[0] || (updatedOrder.partyId ? 'PARTY' : 'COMPANY');
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'UPDATE_ORDER',
      description: `Updated order ${updatedOrder.showOrderId}`,
      companyId: updatedOrder.companyId,
      partyId: updatedOrder.partyId,
    });

    return updatedOrder;
  }

  async remove(id: string, reqUser?: any) {
    const order = await this.findOne(id, reqUser);
    const deletedOrder = await this.prisma.order.delete({
      where: { orderId: id },
    });

    const actorId =
      reqUser?.sub || deletedOrder.partyId || deletedOrder.companyId;
    const actorType =
      reqUser?.roles[0] || (deletedOrder.partyId ? 'PARTY' : 'COMPANY');
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'DELETE_ORDER',
      description: `Deleted order ${deletedOrder.showOrderId}`,
      companyId: deletedOrder.companyId,
      partyId: deletedOrder.partyId,
    });

    return deletedOrder;
  }

  async generateInvoice(orderId: string, reqUser?: any) {
    const order = await this.findOne(orderId, reqUser);

    const invoiceNumber = `INV-${order.showOrderId}`;
    const issueDate = order.createdAt;
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + 7);

    const quantity = order.bag;
    const rate = quantity > 0 ? order.totalRate / quantity : 0;
    const subtotal = order.totalRate;
    const vat = 0;
    const grandTotal = subtotal;

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
      buyer: order.party
        ? {
            partyId: order.party.partyId,
            partyName: order.party.partyName,
            businessName: order.party.businessName,
            email: order.party.email,
            phoneNumber: order.party.phoneNumber,
            address: `${order.party.address}, ${order.party.upozela}, ${order.party.district}`,
          }
        : null,
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

  async findDriverAssignedOrders(
    driverId: string,
    type?: string,
    query?: PaginationQueryDto,
  ) {
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
      where.status = { in: ['PENDING', 'ACCEPTED'] };
    } else if (type === 'ongoing') {
      where.status = {
        in: ['IN_TRANSIT', 'REACHED'],
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

  async acceptOrder(id: string, reqUser: any) {
    const order = await this.findOne(id, reqUser);

    // If requester is a VENDOR, ensure they own the order
    if (reqUser?.roles?.includes(Role.VENDOR)) {
      if (order.companyId !== reqUser.sub) {
        throw new ForbiddenException(
          'You do not have permission to accept this order',
        );
      }
    }

    // Verify order status is PENDING
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Only pending orders can be accepted. Current status is ${order.status}`,
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { orderId: id },
      data: { status: OrderStatus.ACCEPTED },
    });

    const actorId = reqUser?.sub || updatedOrder.companyId;
    const actorType = reqUser?.roles[0] || 'VENDOR';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'ACCEPT_ORDER',
      description: `Accepted order ${updatedOrder.showOrderId}`,
      companyId: updatedOrder.companyId,
      partyId: updatedOrder.partyId,
    });

    // Create notification and send via WebSockets if party is associated
    if (updatedOrder.partyId) {
      const notification = await this.prisma.notification.create({
        data: {
          title: 'অর্ডার গৃহীত (Order Accepted)',
          message: `আপনার অর্ডারটি (${updatedOrder.showOrderId}) কোম্পানি দ্বারা গৃহীত হয়েছে।`,
          partyId: updatedOrder.partyId,
        },
      });

      this.notificationGateway.sendNotificationToParty(updatedOrder.partyId, {
        notificationId: notification.notificationId,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        isRead: false,
      });
    }

    return updatedOrder;
  }

  async cancelOrder(id: string, reqUser: any) {
    const order = await this.findOne(id, reqUser);

    // If requester is a VENDOR, ensure they own the order
    if (reqUser?.roles?.includes(Role.VENDOR)) {
      if (order.companyId !== reqUser.sub) {
        throw new ForbiddenException(
          'You do not have permission to cancel this order',
        );
      }
    }

    // Verify order is not already DELIVERED or CANCELLED
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel order in ${order.status} status`,
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { orderId: id },
      data: { status: OrderStatus.CANCELLED },
    });

    const actorId = reqUser?.sub || updatedOrder.companyId;
    const actorType = reqUser?.roles[0] || 'VENDOR';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'CANCEL_ORDER',
      description: `Cancelled order ${updatedOrder.showOrderId}`,
      companyId: updatedOrder.companyId,
      partyId: updatedOrder.partyId,
    });

    // Create notification and send via WebSockets if party is associated
    if (updatedOrder.partyId) {
      const notification = await this.prisma.notification.create({
        data: {
          title: 'অর্ডার বাতিল (Order Cancelled)',
          message: `আপনার অর্ডারটি (${updatedOrder.showOrderId}) বাতিল করা হয়েছে।`,
          partyId: updatedOrder.partyId,
        },
      });

      this.notificationGateway.sendNotificationToParty(updatedOrder.partyId, {
        notificationId: notification.notificationId,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        isRead: false,
      });
    }

    return updatedOrder;
  }
}
