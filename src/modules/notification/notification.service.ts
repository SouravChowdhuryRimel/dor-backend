import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import {
  createPaginatedResponse,
  PaginationQueryDto,
} from '../../shared/pagination/pagination.util';
import { NotificationGateway } from './notification.gateway';
import { FcmService } from './fcm.service';

export interface SendNotificationPayload {
  title: string;
  message: string;
  userId?: string;
  companyId?: string;
  partyId?: string;
  driverId?: string;
  inquiryId?: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly fcmService: FcmService,
  ) {}

  async findAllForActor(actorId: string, query?: PaginationQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { userId: actorId },
        { companyId: actorId },
        { partyId: actorId },
        { driverId: actorId },
      ],
    };

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

  // Backward compatibility alias for company
  async findAllForCompany(companyId: string, query?: PaginationQueryDto) {
    return this.findAllForActor(companyId, query);
  }

  async markAsRead(notificationId: string, actorId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID "${notificationId}" not found`,
      );
    }

    const isOwner =
      notification.userId === actorId ||
      notification.companyId === actorId ||
      notification.partyId === actorId ||
      notification.driverId === actorId;

    if (!isOwner) {
      throw new ForbiddenException(
        `You do not have access to this notification`,
      );
    }

    return this.prisma.notification.update({
      where: { notificationId },
      data: { isRead: true },
    });
  }

  async sendNotification(payload: SendNotificationPayload) {
    const {
      title,
      message,
      userId,
      companyId,
      partyId,
      driverId,
      inquiryId,
      data,
    } = payload;

    // 1. Create DB Notification
    const notification = await this.prisma.notification.create({
      data: {
        title,
        message,
        userId,
        companyId,
        partyId,
        driverId,
        inquiryId,
      },
    });

    // 2. Real-time WebSocket emission
    if (userId) {
      this.notificationGateway.sendNotificationToUser(userId, notification);
    }
    if (companyId) {
      this.notificationGateway.sendNotificationToCompany(
        companyId,
        notification,
      );
    }
    if (partyId) {
      this.notificationGateway.sendNotificationToParty(partyId, notification);
    }
    if (driverId) {
      this.notificationGateway.sendNotificationToDriver(
        driverId,
        notification,
      );
    }

    // 3. Find target FCM Token and dispatch Push Notification
    let targetFcmToken: string | null = null;

    if (userId) {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });
      targetFcmToken = u?.fcmToken || null;
    } else if (companyId) {
      const c = await this.prisma.company.findUnique({
        where: { companyId },
        select: { fcmToken: true },
      });
      targetFcmToken = c?.fcmToken || null;
    } else if (partyId) {
      const p = await this.prisma.party.findUnique({
        where: { partyId },
        select: { fcmToken: true },
      });
      targetFcmToken = p?.fcmToken || null;
    } else if (driverId) {
      const d = await this.prisma.driver.findUnique({
        where: { driverId },
        select: { fcmToken: true },
      });
      targetFcmToken = d?.fcmToken || null;
    }

    if (targetFcmToken) {
      await this.fcmService.sendPushNotification(
        targetFcmToken,
        title,
        message,
        data,
      );
    }

    return notification;
  }
}
