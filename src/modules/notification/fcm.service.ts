import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: App | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.firebaseApp = existingApps[0]!;
        return;
      }

      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials missing in environment variables. FCM Push notifications disabled.',
        );
        return;
      }

      // Format private key appropriately if \n is escaped as string
      if (privateKey && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      this.firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.logger.log(`Firebase Admin SDK initialized successfully for project: ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase Admin SDK: ${error.message}`, error.stack);
    }
  }

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    badge?: number,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      this.logger.warn('FCM Push notification skipped: Firebase Admin SDK not initialized.');
      return false;
    }

    if (!fcmToken || fcmToken.trim() === '') {
      this.logger.warn('FCM Push notification skipped: Target fcmToken is empty.');
      return false;
    }

    try {
      // Ensure all values in data dictionary are strings
      const safeData: Record<string, string> = {};
      if (data) {
        Object.entries(data).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            safeData[key] = String(val);
          }
        });
      }

      const message: Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: safeData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'chat_messages',
            sound: 'default',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
              ...(badge !== undefined && badge !== null ? { badge } : {}),
            },
          },
        },
      };

      const response = await getMessaging(this.firebaseApp).send(message);
      this.logger.log(
        `FCM push notification sent successfully to token [${fcmToken.slice(0, 10)}...]: ${response}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send FCM push notification: ${error.message}`);
      return false;
    }
  }
}
