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
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
      const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // 3. Check if company (VENDOR)
      if (payload && payload.roles && payload.roles.includes(Role.VENDOR)) {
        const companyId = payload.sub;
        const roomName = `company_${companyId}`;
        await client.join(roomName);
        this.logger.log(`Company connected: ${companyId} joined room: ${roomName}`);
      } else {
        this.logger.warn(`Connection attempt rejected: User is not a VENDOR.`);
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

  sendNotificationToCompany(companyId: string, notification: any) {
    const roomName = `company_${companyId}`;
    this.logger.log(`Sending real-time notification to company ${companyId} via room ${roomName}`);
    this.server.to(roomName).emit('notification', notification);
  }
}
