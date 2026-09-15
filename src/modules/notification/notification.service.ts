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
  badge?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly fcmService: FcmService,
  ) {}

  async findAllForActor(
    actorId: string,
    query?: PaginationQueryDto & { isRead?: string | boolean },
  ) {
    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const actorCondition = {
      OR: [
        { userId: actorId },
        { companyId: actorId },
        { partyId: actorId },
        { driverId: actorId },
      ],
    };

    const where: any = {
      ...actorCondition,
    };

    if (
      query?.isRead !== undefined &&
      query?.isRead !== null &&
      query?.isRead !== ''
    ) {
      where.isRead = String(query.isRead) === 'true';
    }

    const [total, unreadCount, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...actorCondition, isRead: false },
      }),
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

    const paginated = createPaginatedResponse(data, total, page, limit);
    return {
      ...paginated,
      meta: {
        ...paginated.meta,
        unreadCount,
      },
    };
  }

  // Backward compatibility alias for company
  async findAllForCompany(companyId: string, query?: PaginationQueryDto) {
    return this.findAllForActor(companyId, query);
  }

  async getUnreadCount(actorId: string) {
    const actorCondition = {
      OR: [
        { userId: actorId },
        { companyId: actorId },
        { partyId: actorId },
        { driverId: actorId },
      ],
    };

    const [total, unreadCount] = await Promise.all([
      this.prisma.notification.count({ where: actorCondition }),
      this.prisma.notification.count({
        where: { ...actorCondition, isRead: false },
      }),
    ]);

    return {
      total,
      unreadCount,
    };
  }

  async markAllAsRead(actorId: string) {
    const actorCondition = {
      OR: [
        { userId: actorId },
        { companyId: actorId },
        { partyId: actorId },
        { driverId: actorId },
      ],
    };

    const result = await this.prisma.notification.updateMany({
      where: {
        ...actorCondition,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.count,
    };
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

    // 3. Find target FCM Token and dispatch Push Notification (if enabled)
    let targetFcmToken: string | null = null;

    if (userId) {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });
      if (u?.isPushNotificationEnabled !== false) {
        targetFcmToken = u?.fcmToken || null;
      }
    } else if (companyId) {
      const c = await this.prisma.company.findUnique({
        where: { companyId },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });
      if (c?.isPushNotificationEnabled !== false) {
        targetFcmToken = c?.fcmToken || null;
      }
    } else if (partyId) {
      const p = await this.prisma.party.findUnique({
        where: { partyId },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });
      if (p?.isPushNotificationEnabled !== false) {
        targetFcmToken = p?.fcmToken || null;
      }
    } else if (driverId) {
      const d = await this.prisma.driver.findUnique({
        where: { driverId },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });
      if (d?.isPushNotificationEnabled !== false) {
        targetFcmToken = d?.fcmToken || null;
      }
    }

    if (targetFcmToken) {
      await this.fcmService.sendPushNotification(
        targetFcmToken,
        title,
        message,
        data,
        payload.badge,
      );
    } else {
      this.logger.debug(
        `FCM push notification skipped for target (push disabled or no FCM token)`,
      );
    }

    return notification;
  }

  async togglePushNotification(
    actorId: string,
    enabled: boolean,
    fcmToken?: string,
  ) {
    try {
      // 1. Check User
      const user = await this.prisma.user.findUnique({
        where: { id: actorId },
      });
      if (user) {
        const updateData: any = { isPushNotificationEnabled: enabled };
        if (fcmToken) updateData.fcmToken = fcmToken;
        const updated = await this.prisma.user.update({
          where: { id: actorId },
          data: updateData,
          select: { id: true, isPushNotificationEnabled: true, fcmToken: true },
        });
        return {
          success: true,
          message: enabled
            ? 'Push notifications enabled successfully'
            : 'Push notifications disabled successfully',
          isPushNotificationEnabled: updated.isPushNotificationEnabled,
          fcmToken: updated.fcmToken,
        };
      }

      // 2. Check Company
      const company = await this.prisma.company.findUnique({
        where: { companyId: actorId },
      });
      if (company) {
        const updateData: any = { isPushNotificationEnabled: enabled };
        if (fcmToken) updateData.fcmToken = fcmToken;
        const updated = await this.prisma.company.update({
          where: { companyId: actorId },
          data: updateData,
          select: {
            companyId: true,
            isPushNotificationEnabled: true,
            fcmToken: true,
          },
        });
        return {
          success: true,
          message: enabled
            ? 'Push notifications enabled successfully'
            : 'Push notifications disabled successfully',
          isPushNotificationEnabled: updated.isPushNotificationEnabled,
          fcmToken: updated.fcmToken,
        };
      }

      // 3. Check Party
      const party = await this.prisma.party.findUnique({
        where: { partyId: actorId },
      });
      if (party) {
        const updateData: any = { isPushNotificationEnabled: enabled };
        if (fcmToken) updateData.fcmToken = fcmToken;
        const updated = await this.prisma.party.update({
          where: { partyId: actorId },
          data: updateData,
          select: {
            partyId: true,
            isPushNotificationEnabled: true,
            fcmToken: true,
          },
        });
        return {
          success: true,
          message: enabled
            ? 'Push notifications enabled successfully'
            : 'Push notifications disabled successfully',
          isPushNotificationEnabled: updated.isPushNotificationEnabled,
          fcmToken: updated.fcmToken,
        };
      }

      // 4. Check Driver
      const driver = await this.prisma.driver.findUnique({
        where: { driverId: actorId },
      });
      if (driver) {
        const updateData: any = { isPushNotificationEnabled: enabled };
        if (fcmToken) updateData.fcmToken = fcmToken;
        const updated = await this.prisma.driver.update({
          where: { driverId: actorId },
          data: updateData,
          select: {
            driverId: true,
            isPushNotificationEnabled: true,
            fcmToken: true,
          },
        });
        return {
          success: true,
          message: enabled
            ? 'Push notifications enabled successfully'
            : 'Push notifications disabled successfully',
          isPushNotificationEnabled: updated.isPushNotificationEnabled,
          fcmToken: updated.fcmToken,
        };
      }

      throw new NotFoundException('User entity not found');
    } catch (error) {
      this.logger.error(
        `Failed to toggle push notification for ${actorId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getPushNotificationStatus(actorId: string) {
    // 1. Check User
    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, isPushNotificationEnabled: true, fcmToken: true },
    });
    if (user) {
      return {
        isPushNotificationEnabled: user.isPushNotificationEnabled,
        hasFcmToken: !!user.fcmToken,
      };
    }

    // 2. Check Company
    const company = await this.prisma.company.findUnique({
      where: { companyId: actorId },
      select: {
        companyId: true,
        isPushNotificationEnabled: true,
        fcmToken: true,
      },
    });
    if (company) {
      return {
        isPushNotificationEnabled: company.isPushNotificationEnabled,
        hasFcmToken: !!company.fcmToken,
      };
    }

    // 3. Check Party
    const party = await this.prisma.party.findUnique({
      where: { partyId: actorId },
      select: {
        partyId: true,
        isPushNotificationEnabled: true,
        fcmToken: true,
      },
    });
    if (party) {
      return {
        isPushNotificationEnabled: party.isPushNotificationEnabled,
        hasFcmToken: !!party.fcmToken,
      };
    }

    // 4. Check Driver
    const driver = await this.prisma.driver.findUnique({
      where: { driverId: actorId },
      select: {
        driverId: true,
        isPushNotificationEnabled: true,
        fcmToken: true,
      },
    });
    if (driver) {
      return {
        isPushNotificationEnabled: driver.isPushNotificationEnabled,
        hasFcmToken: !!driver.fcmToken,
      };
    }

    throw new NotFoundException('User entity not found');
  }
}
