import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from 'src/core/database/database.service';
import { NotificationGateway } from './notification.gateway';
import { FcmService } from './fcm.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;
  let notificationGateway: any;
  let fcmService: any;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    party: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationGateway = {
    sendNotificationToUser: jest.fn(),
    sendNotificationToCompany: jest.fn(),
    sendNotificationToParty: jest.fn(),
    sendNotificationToDriver: jest.fn(),
    sendNotificationToAdmin: jest.fn(),
  };

  const mockFcmService = {
    sendPushNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
        { provide: FcmService, useValue: mockFcmService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prisma = module.get(PrismaService);
    notificationGateway = module.get(NotificationGateway);
    fcmService = module.get(FcmService);
  });

  describe('sendNotification', () => {
    it('should create DB notification, emit to User, and send FCM push notification when userId is provided', async () => {
      const mockCreatedNotif = {
        notificationId: 'notif-1',
        title: 'নতুন নোটিফিকেশন',
        message: 'টেস্ট মেসেজ',
        userId: 'user-1',
        isRead: false,
      };

      prisma.notification.create.mockResolvedValue(mockCreatedNotif);
      prisma.user.findUnique.mockResolvedValue({ fcmToken: 'token-user-123' });
      fcmService.sendPushNotification.mockResolvedValue(true);

      const result = await service.sendNotification({
        title: 'নতুন নোটিফিকেশন',
        message: 'টেস্ট মেসেজ',
        userId: 'user-1',
        data: { type: 'NEW_ORDER', orderId: 'ord-101' },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          title: 'নতুন নোটিফিকেশন',
          message: 'টেস্ট মেসেজ',
          userId: 'user-1',
          companyId: undefined,
          partyId: undefined,
          driverId: undefined,
          inquiryId: undefined,
        },
      });

      expect(notificationGateway.sendNotificationToUser).toHaveBeenCalledWith(
        'user-1',
        mockCreatedNotif,
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });

      expect(fcmService.sendPushNotification).toHaveBeenCalledWith(
        'token-user-123',
        'নতুন নোটিফিকেশন',
        'টেস্ট মেসেজ',
        { type: 'NEW_ORDER', orderId: 'ord-101' },
        undefined,
      );

      expect(result).toEqual(mockCreatedNotif);
    });

    it('should create DB notification, emit to Company, and send FCM push notification when companyId is provided', async () => {
      const mockCreatedNotif = {
        notificationId: 'notif-2',
        title: 'কোম্পানি নোটিফিকেশন',
        message: 'কোম্পানি মেসেজ',
        companyId: 'company-1',
        isRead: false,
      };

      prisma.notification.create.mockResolvedValue(mockCreatedNotif);
      prisma.company.findUnique.mockResolvedValue({ fcmToken: 'token-comp-456' });
      fcmService.sendPushNotification.mockResolvedValue(true);

      const result = await service.sendNotification({
        title: 'কোম্পানি নোটিফিকেশন',
        message: 'কোম্পানি মেসেজ',
        companyId: 'company-1',
        data: { type: 'COMPANY_APPROVED' },
      });

      expect(notificationGateway.sendNotificationToCompany).toHaveBeenCalledWith(
        'company-1',
        mockCreatedNotif,
      );

      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });

      expect(fcmService.sendPushNotification).toHaveBeenCalledWith(
        'token-comp-456',
        'কোম্পানি নোটিফিকেশন',
        'কোম্পানি মেসেজ',
        { type: 'COMPANY_APPROVED' },
        undefined,
      );

      expect(result).toEqual(mockCreatedNotif);
    });

    it('should create DB notification, emit to Party, and send FCM push notification when partyId is provided', async () => {
      const mockCreatedNotif = {
        notificationId: 'notif-3',
        title: 'পার্টি নোটিফিকেশন',
        message: 'পার্টি মেসেজ',
        partyId: 'party-1',
        isRead: false,
      };

      prisma.notification.create.mockResolvedValue(mockCreatedNotif);
      prisma.party.findUnique.mockResolvedValue({ fcmToken: 'token-party-789' });
      fcmService.sendPushNotification.mockResolvedValue(true);

      const result = await service.sendNotification({
        title: 'পার্টি নোটিফিকেশন',
        message: 'পার্টি মেসেজ',
        partyId: 'party-1',
        data: { type: 'PARTY_VERIFIED' },
      });

      expect(notificationGateway.sendNotificationToParty).toHaveBeenCalledWith(
        'party-1',
        mockCreatedNotif,
      );

      expect(prisma.party.findUnique).toHaveBeenCalledWith({
        where: { partyId: 'party-1' },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });

      expect(fcmService.sendPushNotification).toHaveBeenCalledWith(
        'token-party-789',
        'পার্টি নোটিফিকেশন',
        'পার্টি মেসেজ',
        { type: 'PARTY_VERIFIED' },
        undefined,
      );

      expect(result).toEqual(mockCreatedNotif);
    });

    it('should create DB notification, emit to Driver, and send FCM push notification when driverId is provided', async () => {
      const mockCreatedNotif = {
        notificationId: 'notif-4',
        title: 'ড্রাইভার নোটিফিকেশন',
        message: 'ড্রাইভার মেসেজ',
        driverId: 'driver-1',
        isRead: false,
      };

      prisma.notification.create.mockResolvedValue(mockCreatedNotif);
      prisma.driver.findUnique.mockResolvedValue({ fcmToken: 'token-driver-999' });
      fcmService.sendPushNotification.mockResolvedValue(true);

      const result = await service.sendNotification({
        title: 'ড্রাইভার নোটিফিকেশন',
        message: 'ড্রাইভার মেসেজ',
        driverId: 'driver-1',
        data: { type: 'DRIVER_VERIFIED' },
      });

      expect(notificationGateway.sendNotificationToDriver).toHaveBeenCalledWith(
        'driver-1',
        mockCreatedNotif,
      );

      expect(prisma.driver.findUnique).toHaveBeenCalledWith({
        where: { driverId: 'driver-1' },
        select: { fcmToken: true, isPushNotificationEnabled: true },
      });

      expect(fcmService.sendPushNotification).toHaveBeenCalledWith(
        'token-driver-999',
        'ড্রাইভার নোটিফিকেশন',
        'ড্রাইভার মেসেজ',
        { type: 'DRIVER_VERIFIED' },
        undefined,
      );

      expect(result).toEqual(mockCreatedNotif);
    });

    it('should skip FCM push notification if actor has no fcmToken registered', async () => {
      const mockCreatedNotif = {
        notificationId: 'notif-5',
        title: 'নোটিফিকেশন',
        message: 'মেসেজ',
        userId: 'user-2',
        isRead: false,
      };

      prisma.notification.create.mockResolvedValue(mockCreatedNotif);
      prisma.user.findUnique.mockResolvedValue({ fcmToken: null, isPushNotificationEnabled: true });

      const result = await service.sendNotification({
        title: 'নোটিফিকেশন',
        message: 'মেসেজ',
        userId: 'user-2',
      });

      expect(notificationGateway.sendNotificationToUser).toHaveBeenCalled();
      expect(fcmService.sendPushNotification).not.toHaveBeenCalled();
      expect(result).toEqual(mockCreatedNotif);
    });

    it('should skip FCM push notification if isPushNotificationEnabled is false', async () => {
      const mockCreatedNotif = {
        notificationId: 'notif-6',
        title: 'নোটিফিকেশন',
        message: 'মেসেজ',
        userId: 'user-3',
        isRead: false,
      };

      prisma.notification.create.mockResolvedValue(mockCreatedNotif);
      prisma.user.findUnique.mockResolvedValue({
        fcmToken: 'valid-token',
        isPushNotificationEnabled: false,
      });

      const result = await service.sendNotification({
        title: 'নোটিফিকেশন',
        message: 'মেসেজ',
        userId: 'user-3',
      });

      expect(notificationGateway.sendNotificationToUser).toHaveBeenCalled();
      expect(fcmService.sendPushNotification).not.toHaveBeenCalled();
      expect(result).toEqual(mockCreatedNotif);
    });
  });

  describe('markAsRead', () => {
    it('should update isRead to true if actor matches notification owner', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        notificationId: 'notif-1',
        companyId: 'comp-10',
        isRead: false,
      });
      prisma.notification.update.mockResolvedValue({
        notificationId: 'notif-1',
        companyId: 'comp-10',
        isRead: true,
      });

      const res = await service.markAsRead('notif-1', 'comp-10');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { notificationId: 'notif-1' },
        data: { isRead: true },
      });
      expect(res.isRead).toBe(true);
    });

    it('should throw NotFoundException if notification is not found', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('invalid-id', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if actor does not own notification', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        notificationId: 'notif-1',
        companyId: 'comp-10',
        isRead: false,
      });

      await expect(service.markAsRead('notif-1', 'intruder-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('togglePushNotification', () => {
    it('should toggle push notification for User', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        isPushNotificationEnabled: false,
        fcmToken: null,
      });

      const res = await service.togglePushNotification('user-1', false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isPushNotificationEnabled: false },
        select: { id: true, isPushNotificationEnabled: true, fcmToken: true },
      });
      expect(res.success).toBe(true);
      expect(res.isPushNotificationEnabled).toBe(false);
    });

    it('should toggle push notification and update fcmToken for Company', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue({ companyId: 'comp-1' });
      prisma.company.update.mockResolvedValue({
        companyId: 'comp-1',
        isPushNotificationEnabled: true,
        fcmToken: 'new-token',
      });

      const res = await service.togglePushNotification('comp-1', true, 'new-token');
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { companyId: 'comp-1' },
        data: { isPushNotificationEnabled: true, fcmToken: 'new-token' },
        select: { companyId: true, isPushNotificationEnabled: true, fcmToken: true },
      });
      expect(res.success).toBe(true);
      expect(res.isPushNotificationEnabled).toBe(true);
      expect(res.fcmToken).toBe('new-token');
    });

    it('should throw NotFoundException if actor is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.party.findUnique.mockResolvedValue(null);
      prisma.driver.findUnique.mockResolvedValue(null);

      await expect(service.togglePushNotification('unknown-id', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPushNotificationStatus', () => {
    it('should return status for User', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isPushNotificationEnabled: true,
        fcmToken: 'user-token',
      });

      const res = await service.getPushNotificationStatus('user-1');
      expect(res).toEqual({
        isPushNotificationEnabled: true,
        hasFcmToken: true,
      });
    });

    it('should return status for Party', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.party.findUnique.mockResolvedValue({
        partyId: 'party-1',
        isPushNotificationEnabled: false,
        fcmToken: null,
      });

      const res = await service.getPushNotificationStatus('party-1');
      expect(res).toEqual({
        isPushNotificationEnabled: false,
        hasFcmToken: false,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return total and unread notification counts for actor', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(4); // unread

      const res = await service.getUnreadCount('comp-123');
      expect(res).toEqual({
        total: 15,
        unreadCount: 4,
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read and return updated count', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await service.markAllAsRead('party-456');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: 'party-456' },
            { companyId: 'party-456' },
            { partyId: 'party-456' },
            { driverId: 'party-456' },
          ],
          isRead: false,
        },
        data: { isRead: true },
      });
      expect(res).toEqual({
        success: true,
        message: 'All notifications marked as read',
        updatedCount: 5,
      });
    });
  });

  describe('findAllForActor', () => {
    it('should return paginated notifications with unreadCount in meta', async () => {
      const mockList = [
        { notificationId: 'n-1', title: 'Test', isRead: false },
      ];
      prisma.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread
      prisma.notification.findMany.mockResolvedValue(mockList);

      const res = await service.findAllForActor('user-1', { page: 1, limit: 10 });
      expect(res.data).toEqual(mockList);
      expect(res.meta.total).toBe(10);
      expect(res.meta.unreadCount).toBe(3);
    });

    it('should filter by isRead when provided in query', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(2) // total matching filter
        .mockResolvedValueOnce(2); // unread count
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findAllForActor('user-1', { isRead: 'false' });
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });
  });
});
