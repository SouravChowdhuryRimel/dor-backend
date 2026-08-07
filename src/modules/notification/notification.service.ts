import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForCompany(companyId: string) {
    return this.prisma.notification.findMany({
      where: { companyId },
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
    });
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
