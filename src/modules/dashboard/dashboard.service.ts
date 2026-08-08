import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CompanyStatus, ComplaintStatus, DeliveryStatus } from '@prisma/client';


@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuperAdminSummary() {
    const totalCompanies = await this.prisma.company.count();
    const pendingVerificationCompanies = await this.prisma.company.count({
      where: { status: CompanyStatus.PENDING },
    });
    const totalOrders = await this.prisma.order.count();
    const totalComplaints = await this.prisma.complaint.count({
      where: {
        status: {
          in: [ComplaintStatus.PENDING, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.REOPENED],
        },
      },
    });

    // Generate recent activities by fetching recent records
    const recentCompanies = await this.prisma.company.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { companyName: true, createdAt: true },
    });

    const recentComplaints = await this.prisma.complaint.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { title: true, createdAt: true },
    });

    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { showOrderId: true, createdAt: true },
    });

    const activities: { title: string; time: Date; type: string }[] = [];

    recentCompanies.forEach((c) => {
      activities.push({
        title: `নতুন কোম্পানি নিবন্ধিত: ${c.companyName}`,
        time: c.createdAt,
        type: 'COMPANY',
      });
    });

    recentComplaints.forEach((cmp) => {
      activities.push({
        title: `একটি অভিযোগ পাওয়া গেছে: ${cmp.title}`,
        time: cmp.createdAt,
        type: 'COMPLAINT',
      });
    });

    recentOrders.forEach((o) => {
      activities.push({
        title: `নতুন অর্ডার করা হয়েছে: #${o.showOrderId}`,
        time: o.createdAt,
        type: 'ORDER',
      });
    });

    // Sort recent activities by time descending
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());

    return {
      todaySummary: {
        totalCompanies,
        pendingVerificationCompanies,
        totalOrders,
        totalComplaints,
      },
      recentActivity: activities.slice(0, 10),
    };
  }

  async getCompanySummary(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { companyId },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const totalOrders = await this.prisma.order.count({
      where: { companyId },
    });

    const totalDrivers = await this.prisma.companyDriver.count({
      where: { companyId },
    });

    const totalParties = await this.prisma.party.count({
      where: { companyId },
    });

    const totalComplaints = await this.prisma.complaint.count({
      where: { companyId },
    });

    // Calculate growth chart: orders of the current week grouped by day of the week
    const orders = await this.prisma.order.findMany({
      where: { companyId },
      select: { createdAt: true, totalRate: true },
    });

    // Initialize days of the week in Bengali / English
    const weekdays = [
      { day: 'Saturday', count: 0, revenue: 0 },
      { day: 'Sunday', count: 0, revenue: 0 },
      { day: 'Monday', count: 0, revenue: 0 },
      { day: 'Tuesday', count: 0, revenue: 0 },
      { day: 'Wednesday', count: 0, revenue: 0 },
      { day: 'Thursday', count: 0, revenue: 0 },
      { day: 'Friday', count: 0, revenue: 0 },
    ];

    const dayNameMap: { [key: number]: string } = {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    };

    orders.forEach((o) => {
      const dayIndex = o.createdAt.getDay(); // 0 is Sunday, 6 is Saturday
      const dayName = dayNameMap[dayIndex];
      const weekdayObj = weekdays.find((w) => w.day === dayName);
      if (weekdayObj) {
        weekdayObj.count += 1;
        weekdayObj.revenue += o.totalRate;
      }
    });

    const documents = [
      {
        name: 'ট্রেড লাইসেন্স',
        description: 'কোম্পানি ট্রেড লাইসেন্স কপি',
        file: company.incomeTax || null, // Reuse or fallback
      },
      {
        name: 'জাতীয় পরিচয়পত্র',
        description: 'মালিকের NID কপি',
        file: company.companyDocument.length > 0 ? company.companyDocument[0] : null,
      },
      {
        name: 'ব্যাংক তথ্য',
        description: 'ব্যাংক স্টেটমেন্ট বা চেক বই কপি',
        file: company.companyDocument.length > 1 ? company.companyDocument[1] : null,
      },
    ];

    return {
      companyName: company.companyName,
      metrics: {
        totalOrders,
        totalDrivers,
        totalParties,
        totalComplaints,
      },
      growthChart: weekdays,
      documents,
    };
  }

  async getPartySummary(partyId: string) {
    const party = await this.prisma.party.findUnique({
      where: { partyId },
    });
    if (!party) {
      throw new NotFoundException(`Party with ID "${partyId}" not found`);
    }

    const totalOrders = await this.prisma.order.count({
      where: { partyId },
    });

    const ongoingOrders = await this.prisma.order.count({
      where: {
        partyId,
        deliveries: {
          some: {
            status: {
              in: [
                DeliveryStatus.VAN_COMING,
                DeliveryStatus.TRANSFER_IN_PROGRESS,
                DeliveryStatus.NEAREST_TRANSFER,
              ],
            },
          },
        },
      },
    });

    const deliveryRemaining = await this.prisma.order.count({
      where: {
        partyId,
        deliveries: {
          none: {},
        },
      },
    });

    // Active companies: companies from party's orders plus party's own companyId
    const orderedCompanies = await this.prisma.order.findMany({
      where: { partyId },
      select: { companyId: true },
      distinct: ['companyId'],
    });
    const companyIds = new Set<string>(orderedCompanies.map((o) => o.companyId));
    if (party.companyId) {
      companyIds.add(party.companyId);
    }
    const activeCompanies = companyIds.size;

    const pendingComplaints = await this.prisma.complaint.count({
      where: {
        partyId,
        status: {
          in: [ComplaintStatus.PENDING, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.REOPENED],
        },
      },
    });

    // Fetch the 5 most recent orders with related details for the "Recent Orders" list
    const recentOrdersRaw = await this.prisma.order.findMany({
      where: { partyId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            companyName: true,
          },
        },
        product: {
          select: {
            productName: true,
          },
        },
        deliveries: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            driver: {
              select: {
                driverName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    const recentOrders = recentOrdersRaw.map((o) => {
      const latestDelivery = o.deliveries?.[0] || null;
      return {
        orderId: o.orderId,
        showOrderId: o.showOrderId,
        companyName: o.company?.companyName || null,
        productName: o.product?.productName || null,
        bag: o.bag,
        bagSize: o.bagSize,
        totalRate: o.totalRate,
        createdAt: o.createdAt,
        driverName: latestDelivery?.driver?.driverName || null,
        driverPhone: latestDelivery?.driver?.phoneNumber || null,
        deliveryStatus: latestDelivery?.status || null,
      };
    });

    return {
      businessName: party.businessName,
      metrics: {
        totalOrders,
        ongoingOrders,
        deliveryRemaining,
        activeCompanies,
        pendingComplaints,
      },
      recentOrders,
    };
  }

  async getDriverSummary(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });
    if (!driver) {
      throw new NotFoundException(`Driver with ID "${driverId}" not found`);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysAssignments = await this.prisma.delivery.count({
      where: {
        driverId,
        deliveryTime: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    const ongoingDeliveries = await this.prisma.delivery.count({
      where: {
        driverId,
        status: {
          in: [
            DeliveryStatus.VAN_COMING,
            DeliveryStatus.TRANSFER_IN_PROGRESS,
            DeliveryStatus.NEAREST_TRANSFER,
          ],
        },
      },
    });

    const completedDeliveries = await this.prisma.delivery.count({
      where: {
        driverId,
        status: DeliveryStatus.DELIVERED,
      },
    });

    const proofUploadPending = 0; // Default or mocked to 0 as there is no proof table/column

    const currentLocation = driver.upozela && driver.district 
      ? `${driver.upozela}, ${driver.district}` 
      : driver.district || driver.upozela || '';

    // Fetch ongoing deliveries list with order, company and party details
    const ongoingDeliveriesRaw = await this.prisma.delivery.findMany({
      where: {
        driverId,
        status: {
          in: [
            DeliveryStatus.VAN_COMING,
            DeliveryStatus.TRANSFER_IN_PROGRESS,
            DeliveryStatus.NEAREST_TRANSFER,
          ],
        },
      },
      include: {
        order: {
          include: {
            company: {
              select: {
                companyName: true,
                address: true,
                upozela: true,
                district: true,
              },
            },
            party: {
              select: {
                businessName: true,
                partyName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const ongoingDeliveriesList = ongoingDeliveriesRaw.map((d) => {
      const company = d.order?.company;
      const party = d.order?.party;
      const pickupPoint = company 
        ? `${company.companyName} গেট, ${company.upozela || company.district || ''}` 
        : null;

      return {
        deliveryId: d.deliveryId,
        status: d.status,
        orderId: d.orderId,
        showOrderId: d.order?.showOrderId || null,
        companyName: company?.companyName || null,
        partyName: party?.businessName || party?.partyName || null,
        pickupPoint,
        destinationAddress: d.address,
        upozela: d.upozela,
        district: d.district,
        deliveryTime: d.deliveryTime,
      };
    });

    return {
      driverName: driver.driverName,
      metrics: {
        todaysAssignments,
        ongoingDeliveries,
        completedDeliveries,
        proofUploadPending,
      },
      currentLocation,
      ongoingDeliveries: ongoingDeliveriesList,
    };
  }
}
