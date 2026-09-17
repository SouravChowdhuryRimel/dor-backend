import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Role } from '../../common/constants/role.enum';
import { PrismaService } from 'src/core/database/database.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateComplaintReplyDto } from './dto/create-complaint-reply.dto';
import { GetComplaintsQueryDto } from './dto/get-complaints-query.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { ComplaintStatus } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class ComplaintService {
  private readonly logger = new Logger(ComplaintService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createComplaintDto: CreateComplaintDto, reqUser?: any) {
    const partyId = createComplaintDto.partyId?.trim();
    const companyId = createComplaintDto.companyId?.trim();
    const orderId = createComplaintDto.orderId?.trim() || null;
    const driverId = createComplaintDto.driverId?.trim() || null;
    const productId = createComplaintDto.productId?.trim() || null;
    const title = createComplaintDto.title?.trim();
    const description = createComplaintDto.description?.trim();
    const attachments = Array.isArray(createComplaintDto.attachments)
      ? createComplaintDto.attachments
      : [];

    // Verify party exists
    const partyExists = await this.prisma.party.findUnique({
      where: { partyId },
    });
    if (!partyExists) {
      throw new NotFoundException(`Party with ID "${partyId}" not found`);
    }

    // Verify company exists
    const companyExists = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!companyExists) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    // Verify order exists if orderId is provided
    if (orderId) {
      const orderExists = await this.prisma.order.findUnique({
        where: { orderId },
      });
      if (!orderExists) {
        throw new NotFoundException(`Order with ID "${orderId}" not found`);
      }
    }

    // Verify driver exists if driverId is provided
    if (driverId) {
      const driverExists = await this.prisma.driver.findUnique({
        where: { driverId },
      });
      if (!driverExists) {
        throw new NotFoundException(`Driver with ID "${driverId}" not found`);
      }
    }

    // Verify product exists if productId is provided
    if (productId) {
      const productExists = await this.prisma.product.findUnique({
        where: { productId },
      });
      if (!productExists) {
        throw new NotFoundException(`Product with ID "${productId}" not found`);
      }
    }

    const showComplaintId =
      createComplaintDto.showComplaintId?.trim() ||
      `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const complaint = await this.prisma.complaint.create({
      data: {
        title,
        description,
        partyId,
        companyId,
        orderId,
        driverId,
        productId,
        showComplaintId,
        attachments,
      },
      include: {
        party: true,
        company: true,
        order: true,
        driver: true,
        product: true,
      },
    });

    const actorId = reqUser?.sub || partyId;
    const actorType = reqUser?.roles[0] || 'PARTY';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'CREATE_COMPLAINT',
      description: `Filed complaint ${showComplaintId}: ${title}`,
    });

    // Send notifications to Company, Driver (if any), and Admins
    try {
      const partyName =
        partyExists.partyName || partyExists.businessName || 'A party';

      // 1. Notify Company (Vendor)
      await this.notificationService.sendNotification({
        title: `New Complaint: ${showComplaintId}`,
        message: `${partyName} filed a complaint: "${title}"`,
        companyId,
        data: {
          complaintId: complaint.complaintId,
          showComplaintId,
          type: 'COMPLAINT_CREATED',
        },
      });

      // 2. Notify Driver if assigned to complaint
      if (driverId) {
        await this.notificationService.sendNotification({
          title: `Complaint Filed: ${showComplaintId}`,
          message: `A complaint regarding delivery was filed: "${title}"`,
          driverId,
          data: {
            complaintId: complaint.complaintId,
            showComplaintId,
            type: 'COMPLAINT_CREATED',
          },
        });
      }

      // 3. Notify Admins
      const adminUsers = await this.prisma.user.findMany({
        where: { roles: { hasSome: [Role.ADMIN, Role.SUPER_ADMIN] } },
        select: { id: true },
      });
      for (const admin of adminUsers) {
        await this.notificationService.sendNotification({
          title: `New Complaint: ${showComplaintId}`,
          message: `${partyName} filed a complaint against ${companyExists.companyName}: "${title}"`,
          userId: admin.id,
          data: {
            complaintId: complaint.complaintId,
            showComplaintId,
            type: 'COMPLAINT_CREATED',
          },
        });
      }

      // 4. Real-time broadcast to Admin WebSocket Room
      this.notificationGateway.sendNotificationToAdmin({
        title: `New Complaint: ${showComplaintId}`,
        message: `${partyName} filed a complaint against ${companyExists.companyName}: "${title}"`,
        complaintId: complaint.complaintId,
        showComplaintId,
        type: 'COMPLAINT_CREATED',
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to send complaint notifications: ${err.message}`,
        err.stack,
      );
    }

    return complaint;
  }

  async addReply(
    complaintId: string,
    createComplaintReplyDto: CreateComplaintReplyDto,
    reqUser?: any,
  ) {
    const complaint = await this.findOne(complaintId, reqUser);

    const senderId = createComplaintReplyDto.senderId?.trim();
    const senderRole = createComplaintReplyDto.senderRole;
    const senderName = createComplaintReplyDto.senderName?.trim();
    const message = createComplaintReplyDto.message?.trim();
    const attachments = Array.isArray(createComplaintReplyDto.attachments)
      ? createComplaintReplyDto.attachments
      : [];

    const reply = await this.prisma.complaintMessage.create({
      data: {
        complaintId,
        senderId,
        senderRole,
        senderName,
        message,
        attachments,
      },
    });

    const actorId = reqUser?.sub || senderId;
    const actorType = reqUser?.roles[0] || senderRole || 'USER';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'REPLY_COMPLAINT',
      description: `Posted reply to complaint ${complaint.showComplaintId}`,
    });

    // Notify thread participants
    try {
      const shortMsg =
        message.length > 80 ? `${message.substring(0, 80)}...` : message;
      const isParty = complaint.partyId === senderId || actorType === 'PARTY';
      const isCompany =
        complaint.companyId === senderId || actorType === 'VENDOR';

      if (isParty) {
        // Party replied -> Notify Company
        await this.notificationService.sendNotification({
          title: `Reply on Complaint: ${complaint.showComplaintId}`,
          message: `${senderName}: "${shortMsg}"`,
          companyId: complaint.companyId,
          data: {
            complaintId: complaint.complaintId,
            showComplaintId: complaint.showComplaintId,
            type: 'COMPLAINT_REPLIED',
          },
        });
      } else if (isCompany) {
        // Company replied -> Notify Party
        await this.notificationService.sendNotification({
          title: `Reply on Complaint: ${complaint.showComplaintId}`,
          message: `${senderName}: "${shortMsg}"`,
          partyId: complaint.partyId,
          data: {
            complaintId: complaint.complaintId,
            showComplaintId: complaint.showComplaintId,
            type: 'COMPLAINT_REPLIED',
          },
        });
      } else {
        // Admin or other replied -> Notify both Party & Company
        await this.notificationService.sendNotification({
          title: `Admin Reply on Complaint: ${complaint.showComplaintId}`,
          message: `${senderName}: "${shortMsg}"`,
          partyId: complaint.partyId,
          data: {
            complaintId: complaint.complaintId,
            showComplaintId: complaint.showComplaintId,
            type: 'COMPLAINT_REPLIED',
          },
        });
        await this.notificationService.sendNotification({
          title: `Admin Reply on Complaint: ${complaint.showComplaintId}`,
          message: `${senderName}: "${shortMsg}"`,
          companyId: complaint.companyId,
          data: {
            complaintId: complaint.complaintId,
            showComplaintId: complaint.showComplaintId,
            type: 'COMPLAINT_REPLIED',
          },
        });
      }

      // Also alert Admins
      this.notificationGateway.sendNotificationToAdmin({
        title: `Reply on Complaint: ${complaint.showComplaintId}`,
        message: `${senderName} (${senderRole}): "${shortMsg}"`,
        complaintId: complaint.complaintId,
        showComplaintId: complaint.showComplaintId,
        type: 'COMPLAINT_REPLIED',
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to send reply notifications: ${err.message}`,
        err.stack,
      );
    }

    return reply;
  }

  async findAll(query?: GetComplaintsQueryDto, reqUser?: any) {
    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.partyId?.trim()) {
      where.partyId = query.partyId.trim();
    }
    if (query?.companyId?.trim()) {
      where.companyId = query.companyId.trim();
    }
    if (query?.driverId?.trim()) {
      where.driverId = query.driverId.trim();
    }
    if (query?.productId?.trim()) {
      where.productId = query.productId.trim();
    }

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        where.companyId = reqUser.sub;
      } else if (reqUser.roles.includes(Role.PARTY)) {
        where.partyId = reqUser.sub;
      } else if (reqUser.roles.includes(Role.DRIVER)) {
        where.driverId = reqUser.sub;
      } else if (
        reqUser.roles.includes(Role.ADMIN) &&
        !reqUser.roles.includes(Role.SUPER_ADMIN)
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.product = { categoryId: { in: categoryIds } };
      }
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

  async findOne(complaintId: string, reqUser?: any) {
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

    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        if (complaint.companyId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to access this complaint`,
          );
        }
      } else if (reqUser.roles.includes(Role.PARTY)) {
        if (complaint.partyId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to access this complaint`,
          );
        }
      } else if (reqUser.roles.includes(Role.DRIVER)) {
        if (complaint.driverId !== reqUser.sub) {
          throw new ForbiddenException(
            `You do not have permission to access this complaint`,
          );
        }
      } else if (
        reqUser.roles.includes(Role.ADMIN) &&
        !reqUser.roles.includes(Role.SUPER_ADMIN)
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        const targetProductId =
          complaint.productId || complaint.order?.productId;
        if (targetProductId) {
          const product = await this.prisma.product.findUnique({
            where: { productId: targetProductId },
            select: { categoryId: true },
          });
          if (!product || !categoryIds.includes(product.categoryId)) {
            throw new ForbiddenException(
              `You do not have permission to access this complaint`,
            );
          }
        }
      }
    }

    return complaint;
  }

  async updateStatus(
    complaintId: string,
    status: ComplaintStatus,
    reqUser?: any,
  ) {
    const complaint = await this.findOne(complaintId, reqUser);

    const updated = await this.prisma.complaint.update({
      where: { complaintId },
      data: { status },
      include: {
        party: true,
        company: true,
        order: true,
        driver: true,
      },
    });

    const actorId = reqUser?.sub || updated.partyId;
    const actorType = reqUser?.roles[0] || 'ADMIN';
    await this.activityLogService.log({
      actorType,
      actorId,
      action: 'UPDATE_COMPLAINT_STATUS',
      description: `Updated complaint ${complaint.showComplaintId} status to ${status}`,
    });

    // Notify Party and Company of status update
    try {
      const statusTitle = `Complaint ${complaint.showComplaintId} Status Updated`;
      const statusMessage = `Complaint ${complaint.showComplaintId} has been updated to "${status}".`;

      // 1. Notify Party
      await this.notificationService.sendNotification({
        title: statusTitle,
        message: statusMessage,
        partyId: updated.partyId,
        data: {
          complaintId: updated.complaintId,
          showComplaintId: complaint.showComplaintId,
          status,
          type: 'COMPLAINT_STATUS_UPDATED',
        },
      });

      // 2. Notify Company
      await this.notificationService.sendNotification({
        title: statusTitle,
        message: statusMessage,
        companyId: updated.companyId,
        data: {
          complaintId: updated.complaintId,
          showComplaintId: complaint.showComplaintId,
          status,
          type: 'COMPLAINT_STATUS_UPDATED',
        },
      });

      // 3. Notify Driver if attached
      if (updated.driverId) {
        await this.notificationService.sendNotification({
          title: statusTitle,
          message: statusMessage,
          driverId: updated.driverId,
          data: {
            complaintId: updated.complaintId,
            showComplaintId: complaint.showComplaintId,
            status,
            type: 'COMPLAINT_STATUS_UPDATED',
          },
        });
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to send status update notification: ${err.message}`,
        err.stack,
      );
    }

    return updated;
  }

  async getCounts(reqUser?: any) {
    const where: any = {};
    if (reqUser && reqUser.roles) {
      if (reqUser.roles.includes(Role.VENDOR)) {
        where.companyId = reqUser.sub;
      } else if (reqUser.roles.includes(Role.PARTY)) {
        where.partyId = reqUser.sub;
      } else if (reqUser.roles.includes(Role.DRIVER)) {
        where.driverId = reqUser.sub;
      } else if (
        reqUser.roles.includes(Role.ADMIN) &&
        !reqUser.roles.includes(Role.SUPER_ADMIN)
      ) {
        const adminCategories = await this.prisma.adminCategory.findMany({
          where: { userId: reqUser.sub },
        });
        const categoryIds = adminCategories.map((ac) => ac.categoryId);
        where.product = { categoryId: { in: categoryIds } };
      }
    }

    const pending = await this.prisma.complaint.count({
      where: {
        ...where,
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
        ...where,
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
