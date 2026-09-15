import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Role } from 'src/common/constants/role.enum';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
        this.logger.warn(`Connection attempt rejected: No token provided.`);
        client.disconnect();
        return;
      }

      // 2. Verify token
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'fallback_secret';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // 3. Join rooms based on roles
      if (payload && payload.sub) {
        const actorId = payload.sub;
        // Always join primary user room so direct user notifications are received
        await client.join(`user_${actorId}`);

        if (payload.roles) {
          if (payload.roles.includes(Role.VENDOR)) {
            const roomName = `company_${actorId}`;
            await client.join(roomName);
            this.logger.log(
              `Company connected: ${actorId} joined room: ${roomName}`,
            );
          }
          if (payload.roles.includes(Role.PARTY)) {
            const roomName = `party_${actorId}`;
            await client.join(roomName);
            this.logger.log(
              `Party connected: ${actorId} joined room: ${roomName}`,
            );
          }
          if (payload.roles.includes(Role.DRIVER)) {
            const roomName = `driver_${actorId}`;
            await client.join(roomName);
            this.logger.log(
              `Driver connected: ${actorId} joined room: ${roomName}`,
            );
          }
          if (payload.roles.includes(Role.USER)) {
            const roomName = `user_${actorId}`;
            await client.join(roomName);
            this.logger.log(
              `User connected: ${actorId} joined room: ${roomName}`,
            );
          }
          if (
            payload.roles.includes(Role.ADMIN) ||
            payload.roles.includes(Role.SUPER_ADMIN)
          ) {
            const roomName = 'admin';
            await client.join(roomName);
            this.logger.log(
              `Admin connected: ${actorId} joined room: ${roomName}`,
            );
          }
        }
      } else {
        this.logger.warn(
          `Connection attempt rejected: No roles in token payload.`,
        );
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Connection authentication failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendNotificationToUser(userId: string, notification: any) {
    const roomName = `user_${userId}`;
    this.logger.log(
      `Sending real-time notification to user ${userId} via room ${roomName}`,
    );
    if (this.server) {
      this.server.to(roomName).emit('notification', notification);
    }
  }

  sendNotificationToCompany(companyId: string, notification: any) {
    const roomName = `company_${companyId}`;
    this.logger.log(
      `Sending real-time notification to company ${companyId} via room ${roomName}`,
    );
    if (this.server) {
      this.server.to(roomName).emit('notification', notification);
    }
  }

  sendNotificationToParty(partyId: string, notification: any) {
    const roomName = `party_${partyId}`;
    this.logger.log(
      `Sending real-time notification to party ${partyId} via room ${roomName}`,
    );
    if (this.server) {
      this.server.to(roomName).emit('notification', notification);
    }
  }

  sendNotificationToDriver(driverId: string, notification: any) {
    const roomName = `driver_${driverId}`;
    this.logger.log(
      `Sending real-time notification to driver ${driverId} via room ${roomName}`,
    );
    if (this.server) {
      this.server.to(roomName).emit('notification', notification);
    }
  }

  sendNotificationToAdmin(notification: any) {
    const roomName = 'admin';
    this.logger.log(
      `Sending real-time notification to admins via room ${roomName}`,
    );
    if (this.server) {
      this.server.to(roomName).emit('notification', notification);
    }
  }
}
