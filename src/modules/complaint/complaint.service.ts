import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateComplaintReplyDto } from './dto/create-complaint-reply.dto';
import { GetComplaintsQueryDto } from './dto/get-complaints-query.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { ComplaintStatus } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(createComplaintDto: CreateComplaintDto, reqUser?: any) {
    // Verify party exists
    const partyExists = await this.prisma.party.findUnique({
      where: { partyId: createComplaintDto.partyId },
    });
    if (!partyExists) {
      throw new NotFoundException(
        `Party with ID "${createComplaintDto.partyId}" not found`,
      );
    }

    // Verify company exists
    const companyExists = await this.prisma.company.findUnique({
      where: { companyId: createComplaintDto.companyId },
    });
    if (!companyExists) {
      throw new NotFoundException(
        `Company with ID "${createComplaintDto.companyId}" not found`,
      );
    }

    // Verify order exists if orderId is provided
    if (createComplaintDto.orderId) {
      const orderExists = await this.prisma.order.findUnique({
        where: { orderId: createComplaintDto.orderId },
      });
      if (!orderExists) {
        throw new NotFoundException(
          `Order with ID "${createComplaintDto.orderId}" not found`,
        );
      }
    }

    // Verify driver exists if driverId is provided
    if (createComplaintDto.driverId) {
      const driverExists = await this.prisma.driver.findUnique({
        where: { driverId: createComplaintDto.driverId },
      });
      if (!driverExists) {
        throw new NotFoundException(
          `Driver with ID "${createComplaintDto.driverId}" not found`,
        );
      }
    }

    // Verify product exists if productId is provided
    if (createComplaintDto.productId) {
      const productExists = await this.prisma.product.findUnique({
        where: { productId: createComplaintDto.productId },
      });
      if (!productExists) {
        throw new NotFoundException(
          `Product with ID "${createComplaintDto.productId}" not found`,
        );
      }
    }

    const showComplaintId =
      createComplaintDto.showComplaintId ||
      `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const complaint = await this.prisma.complaint.create({
      data: {
        ...createComplaintDto,
        showComplaintId,
      },
    });

    const actorId = reqUser?.sub || createComplaintDto.partyId;
    const actorType = reqUser?.roles[0] || 'PARTY';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'CREATE_COMPLAINT',
      description: `Filed complaint ${showComplaintId}: ${createComplaintDto.title}`,
    });

    return complaint;
  }

  async addReply(
    complaintId: string,
    createComplaintReplyDto: CreateComplaintReplyDto,
    reqUser?: any,
  ) {
    // Verify complaint exists
    const complaint = await this.prisma.complaint.findUnique({
      where: { complaintId },
    });
    if (!complaint) {
      throw new NotFoundException(
        `Complaint with ID "${complaintId}" not found`,
      );
    }

    const reply = await this.prisma.complaintMessage.create({
      data: {
        ...createComplaintReplyDto,
        complaintId,
      },
    });

    const actorId = reqUser?.sub || createComplaintReplyDto.senderId;
    const actorType =
      reqUser?.roles[0] || createComplaintReplyDto.senderRole || 'USER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'REPLY_COMPLAINT',
      description: `Posted reply to complaint ${complaint.showComplaintId}`,
    });

    return reply;
  }

  async findAll(query?: GetComplaintsQueryDto) {
    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.partyId) {
      where.partyId = query.partyId;
    }
    if (query?.companyId) {
      where.companyId = query.companyId;
    }
    if (query?.driverId) {
      where.driverId = query.driverId;
    }
    if (query?.productId) {
      where.productId = query.productId;
    }

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        include: {
          party: true,
          company: true,
          order: true,
          driver: true,
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { complaintId },
      include: {
        party: true,
        company: true,
        order: {
          include: {
            product: true,
          },
        },
        driver: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(
        `Complaint with ID "${complaintId}" not found`,
      );
    }

    return complaint;
  }

  async updateStatus(
    complaintId: string,
    status: ComplaintStatus,
    reqUser?: any,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { complaintId },
    });
    if (!complaint) {
      throw new NotFoundException(
        `Complaint with ID "${complaintId}" not found`,
      );
    }

    const updated = await this.prisma.complaint.update({
      where: { complaintId },
      data: { status },
    });

    const actorId = reqUser?.sub || updated.partyId;
    const actorType = reqUser?.roles[0] || 'ADMIN';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'UPDATE_COMPLAINT_STATUS',
      description: `Updated complaint ${complaint.showComplaintId} status to ${status}`,
    });

    return updated;
  }

  async getCounts() {
    const pending = await this.prisma.complaint.count({
      where: {
        status: {
          in: [
            ComplaintStatus.PENDING,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.REOPENED,
          ],
        },
      },
    });

    const resolved = await this.prisma.complaint.count({
      where: {
        status: {
          in: [ComplaintStatus.RESOLVED, ComplaintStatus.CANCELLED],
        },
      },
    });

    return {
      pendingCount: pending,
      resolvedCount: resolved,
    };
  }
}
