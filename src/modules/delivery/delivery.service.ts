import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Role } from '../../common/constants/role.enum';
import { PrismaService } from 'src/core/database/database.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { GetDeliveriesQueryDto } from './dto/get-deliveries-query.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { DeliveryStatus } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto, reqUser?: any) {
    // Verify driver exists
    const driverExists = await this.prisma.driver.findUnique({
      where: { driverId: createDeliveryDto.driverId },
    });
    if (!driverExists) {
      throw new NotFoundException(
        `Driver with ID "${createDeliveryDto.driverId}" not found`,
      );
    }

    let orderExists: any = null;
    // Verify order exists if orderId is provided
    if (createDeliveryDto.orderId) {
      orderExists = await this.prisma.order.findUnique({
        where: { orderId: createDeliveryDto.orderId },
      });
      if (!orderExists) {
        throw new NotFoundException(
          `Order with ID "${createDeliveryDto.orderId}" not found`,
        );
      }
    }

    const delivery = await this.prisma.delivery.create({
      data: {
        ...createDeliveryDto,
        deliveryTime: new Date(createDeliveryDto.deliveryTime),
        startDeliveryTime: createDeliveryDto.startDeliveryTime
          ? new Date(createDeliveryDto.startDeliveryTime)
          : null,
        endDeliveryTime: createDeliveryDto.endDeliveryTime
          ? new Date(createDeliveryDto.endDeliveryTime)
          : null,
      },
    });

    if (delivery.orderId && delivery.driverId) {
      await this.prisma.order.update({
        where: { orderId: delivery.orderId },
        data: { status: 'PROCESSING' },
      });
    }

    const actorId = reqUser?.sub || createDeliveryDto.driverId;
    const actorType = reqUser?.roles[0] || 'DRIVER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'CREATE_DELIVERY',
      description: `Created delivery assignment ${delivery.deliveryId} for driver ${createDeliveryDto.driverId}`,
      companyId: orderExists?.companyId,
      partyId: orderExists?.partyId,
    });

    // Send notification only to the assigned driver
    if (delivery.driverId) {
      const orderShowId = orderExists?.showOrderId
        ? `#${orderExists.showOrderId}`
        : '';
      try {
        await this.notificationService.sendNotification({
          title: 'নতুন ডেলিভারি নির্ধারিত',
          message: `আপনাকে অর্ডার ${orderShowId}-এর ডেলিভারির দায়িত্ব প্রদান করা হয়েছে।`,
          driverId: delivery.driverId,
          data: {
            type: 'DRIVER_ASSIGNED',
            deliveryId: delivery.deliveryId,
            orderId: delivery.orderId || '',
            showOrderId: orderExists?.showOrderId || '',
          },
        });
      } catch (notifErr) {
        this.logger.error(
          `Failed to send driver notification on create: ${(notifErr as Error).message}`,
        );
      }
    }

    return delivery;
  }

  async findAll(query?: GetDeliveriesQueryDto, reqUser?: any) {
    const where: any = {};
    if (query?.driverId) {
      where.driverId = query.driverId;
    }
    if (query?.status) {
      where.status = query.status;
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        where.order = { companyId: reqUser.sub };
      } else if (reqUser.roles.includes(Role.PARTY)) {
        where.order = { partyId: reqUser.sub };
      } else if (reqUser.roles.includes(Role.DRIVER)) {
        where.driverId = reqUser.sub;
      } else if (
        reqUser.roles.includes(Role.ADMIN) &&
        !reqUser.roles.includes(Role.SUPER_ADMIN)
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.order = { product: { categoryId: { in: categoryIds } } };
      }
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        include: {
          driver: true,
          order: {
            include: {
              company: true,
              product: true,
              party: true,
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, reqUser?: any) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { deliveryId: id },
      include: {
        driver: true,
        order: {
          include: {
            company: true,
            product: true,
            party: true,
          },
        },
      },
    });
    if (!delivery) {
      throw new NotFoundException(`Delivery with ID "${id}" not found`);
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        if (delivery.order && delivery.order.companyId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to access this delivery`,
          );
        }
      } else if (reqUser.roles.includes(Role.PARTY)) {
        if (delivery.order && delivery.order.partyId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to access this delivery`,
          );
        }
      } else if (reqUser.roles.includes(Role.DRIVER)) {
        if (delivery.driverId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to access this delivery`,
          );
        }
      } else if (
        reqUser.roles.includes(Role.ADMIN) &&
        !reqUser.roles.includes(Role.SUPER_ADMIN)
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        if (
          delivery.order &&
          delivery.order.product &&
          !categoryIds.includes(delivery.order.product.categoryId)
        ) {
          throw new ForbiddenException(
            `You do not have permission to access this delivery`,
          );
        }
      }
    }
    return delivery;
  }

  async update(
    id: string,
    updateDeliveryDto: UpdateDeliveryDto,
    reqUser?: any,
  ) {
    const delivery = await this.findOne(id, reqUser);

    if (updateDeliveryDto.driverId) {
      const driverExists = await this.prisma.driver.findUnique({
        where: { driverId: updateDeliveryDto.driverId },
      });
      if (!driverExists) {
        throw new NotFoundException(
          `Driver with ID "${updateDeliveryDto.driverId}" not found`,
        );
      }
    }

    if (updateDeliveryDto.orderId) {
      const orderExists = await this.prisma.order.findUnique({
        where: { orderId: updateDeliveryDto.orderId },
      });
      if (!orderExists) {
        throw new NotFoundException(
          `Order with ID "${updateDeliveryDto.orderId}" not found`,
        );
      }
    }

    const updateData: any = { ...updateDeliveryDto };
    if (updateDeliveryDto.deliveryTime) {
      updateData.deliveryTime = new Date(updateDeliveryDto.deliveryTime);
    }
    if (updateDeliveryDto.startDeliveryTime !== undefined) {
      updateData.startDeliveryTime = updateDeliveryDto.startDeliveryTime
        ? new Date(updateDeliveryDto.startDeliveryTime)
        : null;
    }
    if (updateDeliveryDto.endDeliveryTime !== undefined) {
      updateData.endDeliveryTime = updateDeliveryDto.endDeliveryTime
        ? new Date(updateDeliveryDto.endDeliveryTime)
        : null;
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: updateData,
    });

    if (updatedDelivery.orderId && updatedDelivery.driverId) {
      await this.prisma.order.update({
        where: { orderId: updatedDelivery.orderId },
        data: { status: 'PROCESSING' },
      });
    }

    const order = updatedDelivery.orderId
      ? await this.prisma.order.findUnique({
          where: { orderId: updatedDelivery.orderId },
        })
      : null;

    const actorId = reqUser?.sub || updatedDelivery.driverId;
    const actorType = reqUser?.roles[0] || 'DRIVER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'UPDATE_DELIVERY',
      description: `Updated delivery ${id} status to ${updatedDelivery.status}`,
      companyId: order?.companyId,
      partyId: order?.partyId,
    });

    // If a new driver is assigned in update, notify only the newly assigned driver
    if (
      updateDeliveryDto.driverId &&
      updateDeliveryDto.driverId !== delivery.driverId
    ) {
      const orderShowId = order?.showOrderId ? `#${order.showOrderId}` : '';
      try {
        await this.notificationService.sendNotification({
          title: 'নতুন ডেলিভারি নির্ধারিত',
          message: `আপনাকে অর্ডার ${orderShowId}-এর ডেলিভারির দায়িত্ব প্রদান করা হয়েছে।`,
          driverId: updateDeliveryDto.driverId,
          data: {
            type: 'DRIVER_ASSIGNED',
            deliveryId: updatedDelivery.deliveryId,
            orderId: updatedDelivery.orderId || '',
            showOrderId: order?.showOrderId || '',
          },
        });
      } catch (notifErr) {
        this.logger.error(
          `Failed to send driver notification on update: ${(notifErr as Error).message}`,
        );
      }
    }

    return updatedDelivery;
  }

  async remove(id: string, reqUser?: any) {
    await this.findOne(id, reqUser);
    const deletedDelivery = await this.prisma.delivery.delete({
      where: { deliveryId: id },
    });

    const order = deletedDelivery.orderId
      ? await this.prisma.order.findUnique({
          where: { orderId: deletedDelivery.orderId },
        })
      : null;

    const actorId = reqUser?.sub || deletedDelivery.driverId;
    const actorType = reqUser?.roles[0] || 'DRIVER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'DELETE_DELIVERY',
      description: `Deleted delivery assignment ${id}`,
      companyId: order?.companyId,
      partyId: order?.partyId,
    });

    return deletedDelivery;
  }

  async acceptDelivery(id: string, reqUser?: any) {
    const delivery = await this.findOne(id, reqUser);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: { status: DeliveryStatus.ACCEPTED },
    });

    const order = updated.orderId
      ? await this.prisma.order.findUnique({
          where: { orderId: updated.orderId },
        })
      : null;

    const driver = updated.driverId
      ? await this.prisma.driver.findUnique({
          where: { driverId: updated.driverId },
        })
      : null;

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'ACCEPT_DELIVERY',
      description: `Driver accepted delivery ${id}`,
      companyId: order?.companyId,
      partyId: order?.partyId,
      driverId: updated.driverId,
    });

    const driverName = driver?.driverName || 'ড্রাইভার';
    const orderShowId = order?.showOrderId ? `#${order.showOrderId}` : '';

    // Notify Company
    if (order?.companyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ড্রাইভার ডেলিভারি গ্রহণ করেছে',
          message: `${driverName} অর্ডার ${orderShowId}-এর ডেলিভারি গ্রহণ করেছে।`,
          companyId: order.companyId,
          data: {
            type: 'DELIVERY_ACCEPTED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify company on delivery accept: ${(err as Error).message}`,
        );
      }
    }

    // Notify Party
    if (order?.partyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ড্রাইভার ডেলিভারি গ্রহণ করেছে',
          message: `আপনার অর্ডার ${orderShowId}-এর ডেলিভারি দায়িত্ব ড্রাইভার (${driverName}) গ্রহণ করেছে।`,
          partyId: order.partyId,
          data: {
            type: 'DELIVERY_ACCEPTED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify party on delivery accept: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  async rejectDelivery(id: string, reqUser?: any) {
    const delivery = await this.findOne(id, reqUser);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: { status: DeliveryStatus.REJECTED },
    });

    const order = updated.orderId
      ? await this.prisma.order.findUnique({
          where: { orderId: updated.orderId },
        })
      : null;

    const driver = updated.driverId
      ? await this.prisma.driver.findUnique({
          where: { driverId: updated.driverId },
        })
      : null;

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'REJECT_DELIVERY',
      description: `Driver rejected delivery ${id}`,
      companyId: order?.companyId,
      partyId: order?.partyId,
      driverId: updated.driverId,
    });

    const driverName = driver?.driverName || 'ড্রাইভার';
    const orderShowId = order?.showOrderId ? `#${order.showOrderId}` : '';

    // Notify Company
    if (order?.companyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ড্রাইভার ডেলিভারি প্রত্যাখ্যান করেছে',
          message: `${driverName} অর্ডার ${orderShowId}-এর ডেলিভারি প্রত্যাখ্যান করেছে। অনুগ্রহ করে নতুন ড্রাইভার নির্ধারণ করুন।`,
          companyId: order.companyId,
          data: {
            type: 'DELIVERY_REJECTED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify company on delivery reject: ${(err as Error).message}`,
        );
      }
    }

    // Notify Party
    if (order?.partyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ডেলিভারি আপডেট',
          message: `আপনার অর্ডার ${orderShowId}-এর ডেলিভারি দায়িত্ব ড্রাইভার প্রত্যাখ্যান করেছে। কোম্পানি নতুন ড্রাইভার নির্ধারণ করছে।`,
          partyId: order.partyId,
          data: {
            type: 'DELIVERY_REJECTED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify party on delivery reject: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  async pickupDelivery(id: string, pickupProof: string, reqUser?: any) {
    const delivery = await this.findOne(id, reqUser);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: {
        status: DeliveryStatus.IN_TRANSIT,
        pickupProof,
        startDeliveryTime: new Date(),
      },
    });

    if (updated.orderId) {
      await this.prisma.order.update({
        where: { orderId: updated.orderId },
        data: { status: 'DISPATCHED' },
      });
    }

    const order = updated.orderId
      ? await this.prisma.order.findUnique({
          where: { orderId: updated.orderId },
        })
      : null;

    const driver = updated.driverId
      ? await this.prisma.driver.findUnique({
          where: { driverId: updated.driverId },
        })
      : null;

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'PICKUP_DELIVERY',
      description: `Driver picked up delivery ${id} and uploaded proof`,
      companyId: order?.companyId,
      partyId: order?.partyId,
      driverId: updated.driverId,
    });

    const driverName = driver?.driverName || 'ড্রাইভার';
    const orderShowId = order?.showOrderId ? `#${order.showOrderId}` : '';

    // Notify Company
    if (order?.companyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'পণ্য পিকআপ সম্পন্ন',
          message: `${driverName} অর্ডার ${orderShowId}-এর পণ্য পিকআপ করেছে।`,
          companyId: order.companyId,
          data: {
            type: 'DELIVERY_PICKUP',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify company on delivery pickup: ${(err as Error).message}`,
        );
      }
    }

    // Notify Party
    if (order?.partyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'পণ্য পিকআপ সম্পন্ন',
          message: `আপনার অর্ডার ${orderShowId}-এর পণ্য ড্রাইভার পিকআপ করেছে এবং ডেলিভারি শুরু হয়েছে।`,
          partyId: order.partyId,
          data: {
            type: 'DELIVERY_PICKUP',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify party on delivery pickup: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  async reachedDelivery(id: string, reqUser?: any) {
    const delivery = await this.findOne(id, reqUser);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: { status: DeliveryStatus.REACHED },
    });

    const order = updated.orderId
      ? await this.prisma.order.findUnique({
          where: { orderId: updated.orderId },
        })
      : null;

    const driver = updated.driverId
      ? await this.prisma.driver.findUnique({
          where: { driverId: updated.driverId },
        })
      : null;

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'REACHED_DELIVERY',
      description: `Driver reached delivery location ${id}`,
      companyId: order?.companyId,
      partyId: order?.partyId,
      driverId: updated.driverId,
    });

    const driverName = driver?.driverName || 'ড্রাইভার';
    const orderShowId = order?.showOrderId ? `#${order.showOrderId}` : '';

    // Notify Party
    if (order?.partyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ড্রাইভার গন্তব্যে পৌঁছেছে',
          message: `ড্রাইভার (${driverName}) আপনার অর্ডার ${orderShowId} নিয়ে গন্তব্যে পৌঁছেছে।`,
          partyId: order.partyId,
          data: {
            type: 'DELIVERY_REACHED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify party on delivery reached: ${(err as Error).message}`,
        );
      }
    }

    // Notify Company
    if (order?.companyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ড্রাইভার গন্তব্যে পৌঁছেছে',
          message: `${driverName} অর্ডার ${orderShowId} নিয়ে ডেলিভারি গন্তব্যে পৌঁছেছে।`,
          companyId: order.companyId,
          data: {
            type: 'DELIVERY_REACHED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify company on delivery reached: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  async completeDelivery(id: string, deliveryProof: string, reqUser?: any) {
    const delivery = await this.findOne(id, reqUser);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveryProof,
        endDeliveryTime: new Date(),
      },
    });

    const order = updated.orderId
      ? await this.prisma.order.findUnique({
          where: { orderId: updated.orderId },
        })
      : null;

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'COMPLETE_DELIVERY',
      description: `Driver completed delivery ${id} and uploaded proof`,
      companyId: order?.companyId,
      partyId: order?.partyId,
      driverId: updated.driverId,
    });

    if (updated.orderId) {
      await this.prisma.order.update({
        where: { orderId: updated.orderId },
        data: { status: 'DELIVERED' },
      });
    }

    const orderShowId = order?.showOrderId ? `#${order.showOrderId}` : '';

    // Notify Company
    if (order?.companyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ডেলিভারি সম্পন্ন হয়েছে',
          message: `অর্ডার ${orderShowId} সফলভাবে ডেলিভারি সম্পন্ন হয়েছে।`,
          companyId: order.companyId,
          data: {
            type: 'DELIVERY_COMPLETED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify company on delivery complete: ${(err as Error).message}`,
        );
      }
    }

    // Notify Party
    if (order?.partyId) {
      try {
        await this.notificationService.sendNotification({
          title: 'ডেলিভারি সম্পন্ন হয়েছে',
          message: `আপনার অর্ডার ${orderShowId} সফলভাবে ডেলিভারি সম্পন্ন হয়েছে।`,
          partyId: order.partyId,
          data: {
            type: 'DELIVERY_COMPLETED',
            deliveryId: id,
            orderId: order.orderId,
            showOrderId: order.showOrderId || '',
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to notify party on delivery complete: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }
}
