import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';
import { GetSupportTicketsDto } from './dto/get-support-tickets.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';
import { Role } from '@prisma/client';

import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createTicket(dto: CreateSupportTicketDto, reqUser: any) {
    const creatorId = reqUser.sub;
    const creatorRole = reqUser.roles[0] as Role;

    const count = await this.prisma.supportTicket.count();
    const showTicketId = `ST-${String(count + 1).padStart(6, '0')}`;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        showTicketId,
        title: dto.title,
        description: dto.description,
        creatorId,
        creatorRole,
      },
    });

    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { roles: { hasSome: [Role.ADMIN, Role.SUPER_ADMIN] } },
        select: { id: true },
      });

      const notifTitle = `নতুন সাপোর্ট টিকেট: #${showTicketId}`;
      const notifMessage = `ইউজার একটি নতুন সাপোর্ট টিকেট তৈরি করেছেন: "${dto.title}"`;

      for (const admin of adminUsers) {
        await this.notificationService.sendNotification({
          title: notifTitle,
          message: notifMessage,
          userId: admin.id,
          data: {
            type: 'SUPPORT_TICKET_CREATED',
            ticketId: ticket.ticketId,
            showTicketId,
          },
        });
      }

      this.notificationGateway.sendNotificationToAdmin({
        title: notifTitle,
        message: notifMessage,
        ticketId: ticket.ticketId,
        showTicketId,
        createdAt: new Date(),
      });
    } catch {
      // Ignore notification failures on ticket create
    }

    return ticket;
  }

  async findAll(query: GetSupportTicketsDto, reqUser: any) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const isAdmin =
      reqUser.roles.includes(Role.ADMIN) ||
      reqUser.roles.includes(Role.SUPER_ADMIN);
    if (!isAdmin) {
      where.creatorId = reqUser.sub;
    }

    const [total, data] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(ticketId: string, reqUser: any) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        `Support ticket with ID "${ticketId}" not found`,
      );
    }

    const isAdmin =
      reqUser.roles.includes(Role.ADMIN) ||
      reqUser.roles.includes(Role.SUPER_ADMIN);
    if (!isAdmin && ticket.creatorId !== reqUser.sub) {
      throw new ForbiddenException(
        'You do not have access to this support ticket',
      );
    }

    return ticket;
  }

  async replyTicket(
    ticketId: string,
    dto: ReplySupportTicketDto,
    reqUser: any,
  ) {
    const ticket = await this.findOne(ticketId, reqUser);

    let senderName = 'Unknown User';
    const senderRole = reqUser.roles[0] as Role;

    if (senderRole === Role.VENDOR) {
      const company = await this.prisma.company.findUnique({
        where: { companyId: reqUser.sub },
      });
      if (company) senderName = company.companyName;
    } else if (senderRole === Role.PARTY) {
      const party = await this.prisma.party.findUnique({
        where: { partyId: reqUser.sub },
      });
      if (party) senderName = party.partyName;
    } else if (senderRole === Role.DRIVER) {
      const driver = await this.prisma.driver.findUnique({
        where: { driverId: reqUser.sub },
      });
      if (driver) senderName = driver.driverName;
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: reqUser.sub },
      });
      if (user) senderName = user.name || user.email || 'Unknown User';
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: reqUser.sub,
        senderRole,
        senderName,
        message: dto.message,
        attachments: dto.attachments || [],
      },
    });

    const isAdmin =
      reqUser.roles.includes(Role.ADMIN) ||
      reqUser.roles.includes(Role.SUPER_ADMIN);
    const newStatus = isAdmin ? 'IN_PROGRESS' : 'OPEN';

    if (
      ticket.status !== newStatus &&
      ticket.status !== 'RESOLVED' &&
      ticket.status !== 'CLOSED'
    ) {
      await this.prisma.supportTicket.update({
        where: { ticketId },
        data: { status: newStatus },
      });
    }

    try {
      const notifTitle = `সাপোর্ট টিকেটে নতুন বার্তা: #${ticket.showTicketId}`;
      const notifMessage = `${senderName}: "${dto.message.slice(0, 60)}"`;

      if (isAdmin) {
        const notifPayload: any = {
          title: notifTitle,
          message: notifMessage,
          data: {
            type: 'SUPPORT_TICKET_REPLIED',
            ticketId,
            showTicketId: ticket.showTicketId,
          },
        };

        if (ticket.creatorRole === Role.VENDOR) {
          notifPayload.companyId = ticket.creatorId;
        } else if (ticket.creatorRole === Role.PARTY) {
          notifPayload.partyId = ticket.creatorId;
        } else if (ticket.creatorRole === Role.DRIVER) {
          notifPayload.driverId = ticket.creatorId;
        } else {
          notifPayload.userId = ticket.creatorId;
        }

        await this.notificationService.sendNotification(notifPayload);
      } else {
        this.notificationGateway.sendNotificationToAdmin({
          title: notifTitle,
          message: notifMessage,
          ticketId,
          showTicketId: ticket.showTicketId,
          createdAt: new Date(),
        });
      }
    } catch {
      // Ignore notification failures on reply
    }

    return message;
  }

  async updateStatus(ticketId: string, status: string, reqUser: any) {
    const ticket = await this.findOne(ticketId, reqUser);

    const updated = await this.prisma.supportTicket.update({
      where: { ticketId },
      data: { status },
    });

    try {
      const notifTitle = `সাপোর্ট টিকেট স্ট্যাটাস আপডেট: #${ticket.showTicketId}`;
      const notifMessage = `আপনার সাপোর্ট টিকেটের স্ট্যাটাস পরিবর্তন করে "${status}" করা হয়েছে।`;

      const notifPayload: any = {
        title: notifTitle,
        message: notifMessage,
        data: {
          type: 'SUPPORT_TICKET_STATUS_UPDATED',
          ticketId,
          status,
          showTicketId: ticket.showTicketId,
        },
      };

      if (ticket.creatorRole === Role.VENDOR) {
        notifPayload.companyId = ticket.creatorId;
      } else if (ticket.creatorRole === Role.PARTY) {
        notifPayload.partyId = ticket.creatorId;
      } else if (ticket.creatorRole === Role.DRIVER) {
        notifPayload.driverId = ticket.creatorId;
      } else {
        notifPayload.userId = ticket.creatorId;
      }

      await this.notificationService.sendNotification(notifPayload);
    } catch {
      // Ignore notification failures on status update
    }

    return updated;
  }
}
