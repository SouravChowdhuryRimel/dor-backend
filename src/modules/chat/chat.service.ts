import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { Role, Prisma } from '@prisma/client';
import { SearchChatUsersQueryDto } from './dto/search-chat-users-query.dto';
import { createPaginatedResponse } from '../../shared/pagination/pagination.util';

export interface ParticipantProfile {
  id: string;
  name: string;
  role: Role;
  image: string | null;
  email: string | null;
  categoryId?: string;
  categoryIds?: string[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate if two roles are allowed to chat per the business logic Chat Matrix.
   */
  validateChatMatrix(role1: Role, role2: Role): boolean {
    if (role1 === Role.SUPER_ADMIN) {
      return role2 === Role.ADMIN;
    }
    if (role1 === Role.ADMIN) {
      return role2 === Role.SUPER_ADMIN || role2 === Role.VENDOR;
    }
    if (role1 === Role.VENDOR) {
      return (
        role2 === Role.ADMIN || role2 === Role.DRIVER || role2 === Role.PARTY
      );
    }
    if (role1 === Role.DRIVER) {
      return role2 === Role.VENDOR || role2 === Role.PARTY;
    }
    if (role1 === Role.PARTY) {
      return role2 === Role.VENDOR || role2 === Role.DRIVER;
    }
    return false;
  }

  /**
   * Fetch a unified profile representation of any participant across their role-specific database tables.
   */
  async getParticipantProfile(
    id: string,
    role: Role,
  ): Promise<ParticipantProfile | null> {
    try {
      if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
        const user = await this.prisma.user.findUnique({
          where: { id },
          include: { adminCategories: true },
        });
        if (!user) return null;
        return {
          id: user.id,
          name: user.name || 'Admin',
          role,
          image: null,
          email: user.email,
          categoryIds: user.adminCategories.map((ac) => ac.categoryId),
        };
      }
      if (role === Role.VENDOR) {
        const company = await this.prisma.company.findUnique({
          where: { companyId: id },
        });
        if (!company) return null;
        return {
          id: company.companyId,
          name: company.companyName,
          role,
          image: company.companyImage,
          email: company.email,
          categoryId: company.categoryId,
        };
      }
      if (role === Role.PARTY) {
        const party = await this.prisma.party.findUnique({
          where: { partyId: id },
        });
        if (!party) return null;
        return {
          id: party.partyId,
          name: party.partyName,
          role,
          image: party.profileImage,
          email: party.email,
          categoryId: party.categoryId,
        };
      }
      if (role === Role.DRIVER) {
        const driver = await this.prisma.driver.findUnique({
          where: { driverId: id },
        });
        if (!driver) return null;
        return {
          id: driver.driverId,
          name: driver.driverName,
          role,
          image: driver.driverImage,
          email: driver.email,
        };
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Error resolving participant profile: ${error.message}`,
      );
    }
    return null;
  }

  /**
   * Validate if two participants are allowed to communicate based on category scoping.
   */
  async validateCategoryScope(
    p1: { id: string; role: Role },
    p2: { id: string; role: Role },
  ): Promise<boolean> {
    // Super Admins bypass category checks.
    if (p1.role === Role.SUPER_ADMIN || p2.role === Role.SUPER_ADMIN) {
      return true;
    }

    const profile1 = await this.getParticipantProfile(p1.id, p1.role);
    const profile2 = await this.getParticipantProfile(p2.id, p2.role);
    if (!profile1 || !profile2) {
      return false;
    }

    // Admin <-> Company (VENDOR): Admin must be assigned to the Company's category
    if (p1.role === Role.ADMIN && p2.role === Role.VENDOR) {
      const adminCatIds = profile1.categoryIds || [];
      const vendorCatId = profile2.categoryId;
      return vendorCatId ? adminCatIds.includes(vendorCatId) : false;
    }
    if (p2.role === Role.ADMIN && p1.role === Role.VENDOR) {
      const adminCatIds = profile2.categoryIds || [];
      const vendorCatId = profile1.categoryId;
      return vendorCatId ? adminCatIds.includes(vendorCatId) : false;
    }

    // Operational roles (Company, Party) can only chat within the exact same category
    const isP1Categorized = (
      [Role.VENDOR, Role.PARTY] as Role[]
    ).includes(p1.role);
    const isP2Categorized = (
      [Role.VENDOR, Role.PARTY] as Role[]
    ).includes(p2.role);

    if (isP1Categorized && isP2Categorized) {
      return profile1.categoryId === profile2.categoryId;
    }

    return true;
  }

  /**
   * Retrieve or create a unique Conversation between two participants.
   */
  async getOrCreateConversation(
    user1Id: string,
    user1Role: Role,
    user2Id: string,
    user2Role: Role,
  ) {
    if (!this.validateChatMatrix(user1Role, user2Role)) {
      throw new BadRequestException(
        'Chat interaction not allowed between these roles',
      );
    }

    const hasAccess = await this.validateCategoryScope(
      { id: user1Id, role: user1Role },
      { id: user2Id, role: user2Role },
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'Chat access denied due to category scoping restrictions',
      );
    }

    // Sort participants lexicographically by ID to enforce unique database mapping.
    let participant1Id = user1Id;
    let participant1Role = user1Role;
    let participant2Id = user2Id;
    let participant2Role = user2Role;

    if (user1Id > user2Id) {
      participant1Id = user2Id;
      participant1Role = user2Role;
      participant2Id = user1Id;
      participant2Role = user1Role;
    }

    let conversation = await this.prisma.conversation.findUnique({
      where: {
        participant1Id_participant1Role_participant2Id_participant2Role: {
          participant1Id,
          participant1Role,
          participant2Id,
          participant2Role,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          participant1Id,
          participant1Role,
          participant2Id,
          participant2Role,
        },
      });
    }

    return conversation;
  }

  /**
   * List all conversations for the authenticated user, complete with the other participant's profile and last message.
   */
  async listConversations(userId: string, role: Role) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: userId, participant1Role: role },
          { participant2Id: userId, participant2Role: role },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const list = [];
    for (const conv of conversations) {
      const isP1 =
        conv.participant1Id === userId && conv.participant1Role === role;
      const otherId = isP1 ? conv.participant2Id : conv.participant1Id;
      const otherRole = isP1 ? conv.participant2Role : conv.participant1Role;

      const otherProfile = await this.getParticipantProfile(otherId, otherRole);
      if (!otherProfile) continue;

      const lastMessage = await this.prisma.chatMessage.findFirst({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'desc' },
      });

      const unreadCount = await this.prisma.chatMessage.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          isRead: false,
        },
      });

      list.push({
        id: conv.id,
        otherParticipant: {
          id: otherProfile.id,
          name: otherProfile.name,
          role: otherProfile.role,
          image: otherProfile.image,
          email: otherProfile.email,
        },
        lastMessage: lastMessage
          ? {
              messageId: lastMessage.messageId,
              message: lastMessage.message,
              senderId: lastMessage.senderId,
              senderRole: lastMessage.senderRole,
              isRead: lastMessage.isRead,
              createdAt: lastMessage.createdAt,
              file: lastMessage.file,
              image: lastMessage.image,
            }
          : null,
        unreadCount,
        updatedAt: conv.updatedAt,
      });
    }

    return list.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.updatedAt;
      const timeB = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }

  /**
   * Persist a new chat message and verify sender authorization.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: Role,
    messageText?: string,
    file?: string,
    image?: string,
  ) {
    if (!messageText && !file && !image) {
      throw new BadRequestException(
        'Message text, file, or image attachment is required',
      );
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    const isP1 =
      conversation.participant1Id === senderId &&
      conversation.participant1Role === senderRole;
    const isP2 =
      conversation.participant2Id === senderId &&
      conversation.participant2Role === senderRole;

    if (!isP1 && !isP2) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        senderRole,
        message: messageText || null,
        file: file || null,
        image: image || null,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const otherId = isP1
      ? conversation.participant2Id
      : conversation.participant1Id;
    const otherRole = isP1
      ? conversation.participant2Role
      : conversation.participant1Role;

    return {
      chatMessage,
      receiverId: otherId,
      receiverRole: otherRole,
    };
  }

  /**
   * Retrieve message history for a conversation.
   */
  async getMessages(
    conversationId: string,
    userId: string,
    role: Role,
    limit = 50,
    before?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    const isP1 =
      conversation.participant1Id === userId &&
      conversation.participant1Role === role;
    const isP2 =
      conversation.participant2Id === userId &&
      conversation.participant2Role === role;

    if (!isP1 && !isP2) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const whereClause: Prisma.ChatMessageWhereInput = { conversationId };
    if (before) {
      whereClause.createdAt = { lt: new Date(before) };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  /**
   * Mark all unread messages from the other user in this conversation as read.
   */
  async markConversationAsRead(
    conversationId: string,
    userId: string,
    role: Role,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    const isP1 =
      conversation.participant1Id === userId &&
      conversation.participant1Role === role;
    const isP2 =
      conversation.participant2Id === userId &&
      conversation.participant2Role === role;

    if (!isP1 && !isP2) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const updateResult = await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    const otherId = isP1
      ? conversation.participant2Id
      : conversation.participant1Id;
    const otherRole = isP1
      ? conversation.participant2Role
      : conversation.participant1Role;

    return {
      count: updateResult.count,
      receiverId: otherId,
      receiverRole: otherRole,
    };
  }

  /**
   * Search users/contacts for chat based on role permissions and unified participant schema.
   */
  async searchChatUsers(
    userId: string,
    senderRole: Role,
    query: SearchChatUsersQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const search = query.search?.trim();

    // 1. Determine allowed target roles for the sender role
    let allowedTargetRoles: Role[] = [];
    if (senderRole === Role.SUPER_ADMIN) {
      allowedTargetRoles = [Role.ADMIN];
    } else if (senderRole === Role.ADMIN) {
      allowedTargetRoles = [Role.VENDOR, Role.DRIVER];
    } else if (senderRole === Role.VENDOR) {
      allowedTargetRoles = [Role.PARTY, Role.DRIVER];
    } else if (senderRole === Role.PARTY) {
      allowedTargetRoles = [Role.VENDOR, Role.DRIVER];
    } else if (senderRole === Role.DRIVER) {
      allowedTargetRoles = [Role.VENDOR, Role.PARTY];
    }

    // Filter by query.targetRole if provided and allowed
    if (query.targetRole) {
      if (allowedTargetRoles.includes(query.targetRole)) {
        allowedTargetRoles = [query.targetRole];
      } else {
        return createPaginatedResponse([], 0, page, limit);
      }
    }

    const candidateResults: Array<{
      id: string;
      name: string;
      picture: string | null;
      phoneNumber: string;
      email: string | null;
      role: Role;
    }> = [];

    // 2. Fetch candidates for each target role
    for (const targetRole of allowedTargetRoles) {
      if (targetRole === Role.ADMIN) {
        const whereClause: Prisma.UserWhereInput = {
          roles: { has: Role.ADMIN },
          id: { not: userId },
        };
        if (search) {
          whereClause.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
          ];
        }
        const users = await this.prisma.user.findMany({
          where: whereClause,
        });
        for (const u of users) {
          candidateResults.push({
            id: u.id,
            name: u.name || 'Admin',
            picture: u.profileImage,
            phoneNumber: u.phoneNumber || '',
            email: u.email || null,
            role: Role.ADMIN,
          });
        }
      } else if (targetRole === Role.VENDOR) {
        const whereClause: Prisma.CompanyWhereInput = {
          companyId: { not: userId },
        };
        if (search) {
          whereClause.OR = [
            { companyName: { contains: search, mode: 'insensitive' } },
            { ownerName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
          ];
        }
        if (senderRole === Role.ADMIN) {
          const adminCategories = await this.prisma.adminCategory.findMany({
            where: { userId },
          });
          const catIds = adminCategories.map((ac) => ac.categoryId);
          if (catIds.length > 0) {
            whereClause.categoryId = { in: catIds };
          }
        }
        const companies = await this.prisma.company.findMany({
          where: whereClause,
        });
        for (const c of companies) {
          candidateResults.push({
            id: c.companyId,
            name: c.companyName,
            picture: c.companyImage,
            phoneNumber: c.phoneNumber || '',
            email: c.email || null,
            role: Role.VENDOR,
          });
        }
      } else if (targetRole === Role.PARTY) {
        const whereClause: Prisma.PartyWhereInput = {
          partyId: { not: userId },
        };
        if (search) {
          whereClause.OR = [
            { partyName: { contains: search, mode: 'insensitive' } },
            { businessName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
          ];
        }
        if (senderRole === Role.VENDOR) {
          const company = await this.prisma.company.findUnique({
            where: { companyId: userId },
          });
          if (company) {
            const filters: Prisma.PartyWhereInput[] = [
              { companyId: userId },
              { categoryId: company.categoryId },
            ];
            if (whereClause.OR) {
              whereClause.AND = [
                { OR: whereClause.OR },
                { OR: filters },
              ];
              delete whereClause.OR;
            } else {
              whereClause.OR = filters;
            }
          }
        }
        const parties = await this.prisma.party.findMany({
          where: whereClause,
        });
        for (const p of parties) {
          candidateResults.push({
            id: p.partyId,
            name: p.businessName || p.partyName,
            picture: p.profileImage,
            phoneNumber: p.phoneNumber || '',
            email: p.email || null,
            role: Role.PARTY,
          });
        }
      } else if (targetRole === Role.DRIVER) {
        const whereClause: Prisma.DriverWhereInput = {
          driverId: { not: userId },
        };
        if (search) {
          whereClause.OR = [
            { driverName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
            { truckNumber: { contains: search, mode: 'insensitive' } },
          ];
        }
        const drivers = await this.prisma.driver.findMany({
          where: whereClause,
        });
        for (const d of drivers) {
          candidateResults.push({
            id: d.driverId,
            name: d.driverName,
            picture: d.driverImage,
            phoneNumber: d.phoneNumber || '',
            email: d.email || null,
            role: Role.DRIVER,
          });
        }
      }
    }

    const total = candidateResults.length;
    const skip = (page - 1) * limit;
    const paginatedCandidates = candidateResults.slice(skip, skip + limit);

    // 3. Attach conversation metadata for each candidate
    const data = [];
    for (const candidate of paginatedCandidates) {
      let p1Id = userId;
      let p1Role = senderRole;
      let p2Id = candidate.id;
      let p2Role = candidate.role;

      if (userId > candidate.id) {
        p1Id = candidate.id;
        p1Role = candidate.role;
        p2Id = userId;
        p2Role = senderRole;
      }

      const conversation = await this.prisma.conversation.findUnique({
        where: {
          participant1Id_participant1Role_participant2Id_participant2Role: {
            participant1Id: p1Id,
            participant1Role: p1Role,
            participant2Id: p2Id,
            participant2Role: p2Role,
          },
        },
      });

      let conversationId: string | null = null;
      let lastMessage: any = null;
      let unreadCount = 0;

      if (conversation) {
        conversationId = conversation.id;
        const msg = await this.prisma.chatMessage.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'desc' },
        });
        if (msg) {
          lastMessage = {
            messageId: msg.messageId,
            message: msg.message,
            file: msg.file,
            image: msg.image,
            senderId: msg.senderId,
            senderRole: msg.senderRole,
            isRead: msg.isRead,
            createdAt: msg.createdAt,
          };
        }
        unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            isRead: false,
          },
        });
      }

      data.push({
        id: candidate.id,
        name: candidate.name,
        picture: candidate.picture,
        phoneNumber: candidate.phoneNumber,
        email: candidate.email,
        role: candidate.role,
        conversationId,
        lastMessage,
        unreadCount,
      });
    }

    return createPaginatedResponse(data, total, page, limit);
  }
}
