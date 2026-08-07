import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { DeliveryStatus } from '@prisma/client';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDeliveryDto: CreateDeliveryDto) {
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

    return this.prisma.delivery.create({
      data: {
        ...createDeliveryDto,
        deliveryTime: new Date(createDeliveryDto.deliveryTime),
        startDeliveryTime: createDeliveryDto.startDeliveryTime ? new Date(createDeliveryDto.startDeliveryTime) : null,
        endDeliveryTime: createDeliveryDto.endDeliveryTime ? new Date(createDeliveryDto.endDeliveryTime) : null,
      },
    });
  }

  async findAll(query?: { driverId?: string; status?: DeliveryStatus }) {
    const where: any = {};
    if (query?.driverId) {
      where.driverId = query.driverId;
    }
    if (query?.status) {
      where.status = query.status;
    }

    return this.prisma.delivery.findMany({
      where,
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

  async update(id: string, updateDeliveryDto: UpdateDeliveryDto) {
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

    return this.prisma.delivery.update({
      where: { deliveryId: id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.delivery.delete({
      where: { deliveryId: id },
    });
  }
}
