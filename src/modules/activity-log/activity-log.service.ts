import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { GetActivityLogsQueryDto } from './dto/get-activity-logs-query.dto';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../shared/pagination/pagination.util';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    actorType: string;
    actorId: string;
    action: string;
    description: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    userId?: string | null;
    companyId?: string | null;
    partyId?: string | null;
    driverId?: string | null;
  }) {
    const logData = { ...data };

    if (logData.actorType && logData.actorType.toUpperCase() === 'VENDOR') {
      logData.actorType = 'COMPANY';
    }

    // Automatically map relation foreign key if not provided explicitly
    if (
      !logData.userId &&
      !logData.companyId &&
      !logData.partyId &&
      !logData.driverId
    ) {
      const type = logData.actorType.toUpperCase();
      if (type === 'ADMIN' || type === 'SUPER_ADMIN' || type === 'USER') {
        logData.userId = logData.actorId;
      } else if (type === 'COMPANY' || type === 'VENDOR') {
        logData.companyId = logData.actorId;
      } else if (type === 'PARTY') {
        logData.partyId = logData.actorId;
      } else if (type === 'DRIVER') {
        logData.driverId = logData.actorId;
      }
    }

    return this.prisma.activityLog.create({
      data: logData,
    });
  }

  async findAll(query: GetActivityLogsQueryDto) {
    const where: any = {};

    if (query.actorType) {
      where.actorType = query.actorType;
    }
    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, phoneNumber: true },
          },
          company: {
            select: {
              companyId: true,
              companyName: true,
              ownerName: true,
              phoneNumber: true,
            },
          },
          party: {
            select: {
              partyId: true,
              partyName: true,
              businessName: true,
              phoneNumber: true,
            },
          },
          driver: {
            select: { driverId: true, driverName: true, phoneNumber: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findMyLogs(actorId: string, query?: PaginationQueryDto) {
    const where = {
      OR: [
        { actorId },
        { userId: actorId },
        { companyId: actorId },
        { partyId: actorId },
        { driverId: actorId },
      ],
    };

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }
}
