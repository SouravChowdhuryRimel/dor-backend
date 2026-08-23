import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Role } from '@prisma/client';

export interface ChatClientData {
  userId: string;
  roles: string[];
  email?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // 1. Extract token from query or headers
      let token = client.handshake.query.token as string;
      const authHeader = client.handshake.headers.authorization;

      if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token) {
        this.logger.warn(`Chat connection rejected: No token provided.`);
        client.disconnect();
        return;
      }

      // 2. Verify token
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'fallback_secret';
      const payload: {
        sub: string;
        roles: string[];
        email?: string;
      } = await this.jwtService.verifyAsync(token, {
        secret,
      });

      if (payload && payload.sub && payload.roles) {
        // Save user details to socket data
        client.data = {
          userId: payload.sub,
          roles: payload.roles,
          email: payload.email,
        };

        // Every user joins a unique room user_${userId} to receive messages
        const roomName = `user_${payload.sub}`;
        await client.join(roomName);
        this.logger.log(
          `Chat connected: ${payload.sub} joined room: ${roomName}`,
        );
      } else {
        this.logger.warn(`Chat connection rejected: Invalid payload.`);
        client.disconnect();
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Chat authentication failed: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    body: {
      conversationId: string;
      message?: string;
      file?: string;
      image?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const sender = client.data as ChatClientData;
      if (!sender || !sender.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { conversationId, message, file, image } = body;
      if (!conversationId || (!message && !file && !image)) {
        client.emit('error', {
          message:
            'conversationId and at least one of message, file, or image are required',
        });
        return;
      }

      // Identify the sender's primary role for the chat context
      // (If they have multiple roles, we take the first allowed one or fallback to USER)
      const senderRole = (sender.roles[0] || Role.USER) as Role;

      // Save to database
      const result = await this.chatService.sendMessage(
        conversationId,
        sender.userId,
        senderRole,
        message,
        file,
        image,
      );

      // Broadcast message to both sender and receiver rooms
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

      this.server
        .to(`user_${sender.userId}`)
        .to(`user_${result.receiverId}`)
        .emit('message', eventData);

      this.logger.log(
        `Chat message sent from ${sender.userId} to ${result.receiverId} in conversation ${conversationId}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error in send_message event: ${err.message}`);
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const sender = client.data as ChatClientData;
      if (!sender || !sender.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { conversationId } = body;
      if (!conversationId) {
        client.emit('error', { message: 'conversationId is required' });
        return;
      }

      const senderRole = (sender.roles[0] || Role.USER) as Role;

      // Mark messages as read in DB
      const result = await this.chatService.markConversationAsRead(
        conversationId,
        sender.userId,
        senderRole,
      );

      // Emit read confirmation back to both sender and receiver
      const eventData = {
        conversationId,
        readerId: sender.userId,
        readerRole: senderRole,
        count: result.count,
      };

      this.server
        .to(`user_${sender.userId}`)
        .to(`user_${result.receiverId}`)
        .emit('messages_read', eventData);

      this.logger.log(
        `Conversation ${conversationId} marked read by ${sender.userId}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error in mark_read event: ${err.message}`);
      client.emit('error', { message: err.message });
    }
  }
}
