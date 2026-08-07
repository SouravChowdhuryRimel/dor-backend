import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateComplaintReplyDto } from './dto/create-complaint-reply.dto';
import { ComplaintStatus } from '@prisma/client';

@Injectable()
export class ComplaintService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createComplaintDto: CreateComplaintDto) {
    // Verify party exists
    const partyExists = await this.prisma.party.findUnique({
      where: { partyId: createComplaintDto.partyId },
    });
    if (!partyExists) {
      throw new NotFoundException(`Party with ID "${createComplaintDto.partyId}" not found`);
    }

    // Verify company exists
    const companyExists = await this.prisma.company.findUnique({
      where: { companyId: createComplaintDto.companyId },
    });
    if (!companyExists) {
      throw new NotFoundException(`Company with ID "${createComplaintDto.companyId}" not found`);
    }

    // Verify order exists if orderId is provided
    if (createComplaintDto.orderId) {
      const orderExists = await this.prisma.order.findUnique({
        where: { orderId: createComplaintDto.orderId },
      });
      if (!orderExists) {
        throw new NotFoundException(`Order with ID "${createComplaintDto.orderId}" not found`);
      }
    }

    // Verify driver exists if driverId is provided
    if (createComplaintDto.driverId) {
      const driverExists = await this.prisma.driver.findUnique({
        where: { driverId: createComplaintDto.driverId },
      });
      if (!driverExists) {
        throw new NotFoundException(`Driver with ID "${createComplaintDto.driverId}" not found`);
      }
    }

    const showComplaintId = createComplaintDto.showComplaintId || `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.complaint.create({
      data: {
        ...createComplaintDto,
        showComplaintId,
      },
    });
  }

  async addReply(complaintId: string, createComplaintReplyDto: CreateComplaintReplyDto) {
    // Verify complaint exists
    const complaint = await this.prisma.complaint.findUnique({
      where: { complaintId },
    });
    if (!complaint) {
      throw new NotFoundException(`Complaint with ID "${complaintId}" not found`);
    }

    return this.prisma.complaintMessage.create({
      data: {
        ...createComplaintReplyDto,
        complaintId,
      },
    });
  }

  async findAll(query?: { status?: ComplaintStatus; partyId?: string; companyId?: string }) {
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

    return this.prisma.complaint.findMany({
      where,
      include: {
        party: true,
        company: true,
        order: true,
        driver: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
      throw new NotFoundException(`Complaint with ID "${complaintId}" not found`);
    }

    return complaint;
  }

  async updateStatus(complaintId: string, status: ComplaintStatus) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { complaintId },
    });
    if (!complaint) {
      throw new NotFoundException(`Complaint with ID "${complaintId}" not found`);
    }

    return this.prisma.complaint.update({
      where: { complaintId },
      data: { status },
    });
  }

  async getCounts() {
    const pending = await this.prisma.complaint.count({
      where: {
        status: {
          in: [ComplaintStatus.PENDING, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.REOPENED],
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
