import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { createPaginatedResponse, PaginationQueryDto } from '../../shared/pagination/pagination.util';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForCompany(companyId: string, query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;
    const where = { companyId };

    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        include: {
          inquiry: {
            include: {
              category: {
                select: {
                  categoryId: true,
                  categoryName: true,
                },
              },
              party: {
                select: {
                  partyId: true,
                  partyName: true,
                  businessName: true,
                  phoneNumber: true,
                  email: true,
                  district: true,
                  upozela: true,
                  address: true,
                },
              },
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

  async markAsRead(notificationId: string, companyId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID "${notificationId}" not found`);
    }

    if (notification.companyId !== companyId) {
      throw new ForbiddenException(`You do not have access to this notification`);
    }

    return this.prisma.notification.update({
      where: { notificationId },
      data: { isRead: true },
    });
  }
}
