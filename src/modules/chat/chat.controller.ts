import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Role } from '@prisma/client';

export interface RequestWithUser {
  user: {
    sub: string;
    roles: string[];
    email?: string;
  };
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('conversations')
  @ApiOperation({
    summary: 'Create or retrieve a conversation with another user',
  })
  async getOrCreateConversation(
    @Req() req: RequestWithUser,
    @Body() dto: CreateConversationDto,
  ) {
    const { sub: userId, roles } = req.user;
    const senderRole = (roles[0] || Role.USER) as Role;
    return this.chatService.getOrCreateConversation(
      userId,
      senderRole,
      dto.receiverId,
      dto.receiverRole,
    );
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List all active conversations for the current user',
  })
  async listConversations(@Req() req: RequestWithUser) {
    const { sub: userId, roles } = req.user;
    const senderRole = (roles[0] || Role.USER) as Role;
    return this.chatService.listConversations(userId, senderRole);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get message history in a conversation' })
  async getMessages(
    @Req() req: RequestWithUser,
    @Param('id') conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    const { sub: userId, roles } = req.user;
    const senderRole = (roles[0] || Role.USER) as Role;
    return this.chatService.getMessages(
      conversationId,
      userId,
      senderRole,
      query.limit,
      query.before,
    );
  }

  @Post('conversations/:id/messages')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'file', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, callback) => {
            const path = './uploads/chat';
            try {
              if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
              }
              callback(null, path);
            } catch (error) {
              callback(error as Error, path);
            }
          },
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            const prefix =
              file.fieldname === 'image' ? 'chat-img' : 'chat-file';
            callback(null, `${prefix}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Send a message in a conversation via HTTP fallback with optional attachments',
  })
  async sendMessage(
    @Req() req: RequestWithUser,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @UploadedFiles()
    files?: {
      image?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    const { sub: userId, roles } = req.user;
    const senderRole = (roles[0] || Role.USER) as Role;

    let imageUrl: string | undefined = dto.image;
    let fileUrl: string | undefined = dto.file;

    if (files) {
      if (files.image && files.image.length > 0) {
        imageUrl = `/uploads/chat/${files.image[0].filename}`;
      }
      if (files.file && files.file.length > 0) {
        fileUrl = `/uploads/chat/${files.file[0].filename}`;
      }
    }

    const result = await this.chatService.sendMessage(
      conversationId,
      userId,
      senderRole,
      dto.message,
      fileUrl,
      imageUrl,
    );

    // Broadcast message via WebSockets to synchronize other tabs / the receiver
    const eventData = {
      messageId: result.chatMessage.messageId,
      conversationId: result.chatMessage.conversationId,
      senderId: result.chatMessage.senderId,
      senderRole: result.chatMessage.senderRole,
      message: result.chatMessage.message,
      file: result.chatMessage.file,
      image: result.chatMessage.image,
      isRead: result.chatMessage.isRead,
      createdAt: result.chatMessage.createdAt,
    };

    if (this.chatGateway.server) {
      this.chatGateway.server
        .to(`user_${userId}`)
        .to(`user_${result.receiverId}`)
        .emit('message', eventData);
    }

    return result.chatMessage;
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  async markConversationAsRead(
    @Req() req: RequestWithUser,
    @Param('id') conversationId: string,
  ) {
    const { sub: userId, roles } = req.user;
    const senderRole = (roles[0] || Role.USER) as Role;

    const result = await this.chatService.markConversationAsRead(
      conversationId,
      userId,
      senderRole,
    );

    // Emit read event via WebSockets
    const eventData = {
      conversationId,
      readerId: userId,
      readerRole: senderRole,
      count: result.count,
    };

    if (this.chatGateway.server) {
      this.chatGateway.server
        .to(`user_${userId}`)
        .to(`user_${result.receiverId}`)
        .emit('messages_read', eventData);
    }

    return { success: true, ...result };
  }
}
