import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { GetDeliveriesQueryDto } from './dto/get-deliveries-query.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { DeliveryStatus } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(createDeliveryDto: CreateDeliveryDto, reqUser?: any) {
    // Verify driver exists
    const driverExists = await this.prisma.driver.findUnique({
      where: { driverId: createDeliveryDto.driverId },
    });
    if (!driverExists) {
      throw new NotFoundException(`Driver with ID "${createDeliveryDto.driverId}" not found`);
    }

    // Verify order exists if orderId is provided
    if (createDeliveryDto.orderId) {
      const orderExists = await this.prisma.order.findUnique({
        where: { orderId: createDeliveryDto.orderId },
      });
      if (!orderExists) {
        throw new NotFoundException(`Order with ID "${createDeliveryDto.orderId}" not found`);
      }
    }

    const delivery = await this.prisma.delivery.create({
      data: {
        ...createDeliveryDto,
        deliveryTime: new Date(createDeliveryDto.deliveryTime),
        startDeliveryTime: createDeliveryDto.startDeliveryTime ? new Date(createDeliveryDto.startDeliveryTime) : null,
        endDeliveryTime: createDeliveryDto.endDeliveryTime ? new Date(createDeliveryDto.endDeliveryTime) : null,
      },
    });

    const actorId = reqUser?.sub || createDeliveryDto.driverId;
    const actorType = reqUser?.roles[0] || 'DRIVER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'CREATE_DELIVERY',
      description: `Created delivery assignment ${delivery.deliveryId} for driver ${createDeliveryDto.driverId}`,
    });

    return delivery;
  }

  async findAll(query?: GetDeliveriesQueryDto) {
    const where: any = {};
    if (query?.driverId) {
      where.driverId = query.driverId;
    }
    if (query?.status) {
      where.status = query.status;
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

  async findOne(id: string) {
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
    return delivery;
  }

  async update(id: string, updateDeliveryDto: UpdateDeliveryDto, reqUser?: any) {
    const delivery = await this.findOne(id);

    if (updateDeliveryDto.driverId) {
      const driverExists = await this.prisma.driver.findUnique({
        where: { driverId: updateDeliveryDto.driverId },
      });
      if (!driverExists) {
        throw new NotFoundException(`Driver with ID "${updateDeliveryDto.driverId}" not found`);
      }
    }

    if (updateDeliveryDto.orderId) {
      const orderExists = await this.prisma.order.findUnique({
        where: { orderId: updateDeliveryDto.orderId },
      });
      if (!orderExists) {
        throw new NotFoundException(`Order with ID "${updateDeliveryDto.orderId}" not found`);
      }
    }

    const updateData: any = { ...updateDeliveryDto };
    if (updateDeliveryDto.deliveryTime) {
      updateData.deliveryTime = new Date(updateDeliveryDto.deliveryTime);
    }
    if (updateDeliveryDto.startDeliveryTime !== undefined) {
      updateData.startDeliveryTime = updateDeliveryDto.startDeliveryTime ? new Date(updateDeliveryDto.startDeliveryTime) : null;
    }
    if (updateDeliveryDto.endDeliveryTime !== undefined) {
      updateData.endDeliveryTime = updateDeliveryDto.endDeliveryTime ? new Date(updateDeliveryDto.endDeliveryTime) : null;
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: updateData,
    });

    const actorId = reqUser?.sub || updatedDelivery.driverId;
    const actorType = reqUser?.roles[0] || 'DRIVER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'UPDATE_DELIVERY',
      description: `Updated delivery ${id} status to ${updatedDelivery.status}`,
    });

    return updatedDelivery;
  }

  async remove(id: string, reqUser?: any) {
    await this.findOne(id);
    const deletedDelivery = await this.prisma.delivery.delete({
      where: { deliveryId: id },
    });

    const actorId = reqUser?.sub || deletedDelivery.driverId;
    const actorType = reqUser?.roles[0] || 'DRIVER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'DELETE_DELIVERY',
      description: `Deleted delivery assignment ${id}`,
    });

    return deletedDelivery;
  }

  async acceptDelivery(id: string, reqUser?: any) {
    const delivery = await this.findOne(id);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: { status: DeliveryStatus.ACCEPTED },
    });
    
    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'ACCEPT_DELIVERY',
      description: `Driver accepted delivery ${id}`,
    });
    return updated;
  }

  async rejectDelivery(id: string, reqUser?: any) {
    const delivery = await this.findOne(id);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: { status: DeliveryStatus.REJECTED },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'REJECT_DELIVERY',
      description: `Driver rejected delivery ${id}`,
    });
    return updated;
  }

  async pickupDelivery(id: string, pickupProof: string, reqUser?: any) {
    const delivery = await this.findOne(id);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: {
        status: DeliveryStatus.IN_TRANSIT,
        pickupProof,
        startDeliveryTime: new Date(),
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'PICKUP_DELIVERY',
      description: `Driver picked up delivery ${id} and uploaded proof`,
    });
    return updated;
  }

  async reachedDelivery(id: string, reqUser?: any) {
    const delivery = await this.findOne(id);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: { status: DeliveryStatus.REACHED },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'REACHED_DELIVERY',
      description: `Driver reached delivery location ${id}`,
    });
    return updated;
  }

  async completeDelivery(id: string, deliveryProof: string, reqUser?: any) {
    const delivery = await this.findOne(id);
    const updated = await this.prisma.delivery.update({
      where: { deliveryId: id },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveryProof,
        endDeliveryTime: new Date(),
      },
    });

    await this.activityLogService.log({
      actorType: reqUser?.roles[0] || 'DRIVER',
      actorId: reqUser?.sub || updated.driverId,
      action: 'COMPLETE_DELIVERY',
      description: `Driver completed delivery ${id} and uploaded proof`,
    });

    if (updated.orderId) {
      await this.prisma.order.update({
        where: { orderId: updated.orderId },
        data: { status: 'DELIVERED' },
      });
    }

    return updated;
  }
}
