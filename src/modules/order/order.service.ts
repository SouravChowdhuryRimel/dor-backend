import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
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

    return this.prisma.order.create({
      data: {
        ...createOrderDto,
        showOrderId,
      },
    });
  }

  async findAll(query?: { companyId?: string; partyId?: string }) {
    const where: any = {};
    if (query?.companyId) {
      where.companyId = query.companyId;
    }
    if (query?.partyId) {
      where.partyId = query.partyId;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        company: true,
        product: true,
        party: true,
      },
    });
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

  async update(id: string, updateOrderDto: UpdateOrderDto) {
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

    return this.prisma.order.update({
      where: { orderId: id },
      data: updateOrderDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({
      where: { orderId: id },
    });
  }
}
