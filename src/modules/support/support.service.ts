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

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(dto: CreateSupportTicketDto, reqUser: any) {
    const creatorId = reqUser.sub;
    const creatorRole = reqUser.roles[0] as Role;

    const count = await this.prisma.supportTicket.count();
    const showTicketId = `ST-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.supportTicket.create({
      data: {
        showTicketId,
        title: dto.title,
        description: dto.description,
        creatorId,
        creatorRole,
      },
    });
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

    return message;
  }

  async updateStatus(ticketId: string, status: string, reqUser: any) {
    await this.findOne(ticketId, reqUser);

    return this.prisma.supportTicket.update({
      where: { ticketId },
      data: { status },
    });
  }
}
