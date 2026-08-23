import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import {
  CompanyStatus,
  ComplaintStatus,
  DeliveryStatus,
  OrderStatus,
} from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuperAdminSummary(reqUser?: any) {
    const isAdmin =
      reqUser?.roles?.includes('ADMIN') &&
      !reqUser?.roles?.includes('SUPER_ADMIN');
    let categoryIds: string[] = [];
    if (isAdmin) {
      const adminCategories = await this.prisma.adminCategory.findMany({
        where: { userId: reqUser.sub },
      });
      categoryIds = adminCategories.map((ac) => ac.categoryId);
    }

    const companyWhere: any = {};
    if (isAdmin) {
      companyWhere.categoryId = { in: categoryIds };
    }

    const pendingCompanyWhere: any = { status: CompanyStatus.PENDING };
    if (isAdmin) {
      pendingCompanyWhere.categoryId = { in: categoryIds };
    }

    const orderWhere: any = {};
    if (isAdmin) {
      orderWhere.product = { categoryId: { in: categoryIds } };
    }

    const complaintWhere: any = {
      status: {
        in: [
          ComplaintStatus.PENDING,
          ComplaintStatus.UNDER_REVIEW,
          ComplaintStatus.REOPENED,
        ],
      },
    };
    if (isAdmin) {
      complaintWhere.company = { categoryId: { in: categoryIds } };
    }

    const driverWhere: any = {};
    if (isAdmin) {
      driverWhere.categoryId = { in: categoryIds };
    }

    const partyWhere: any = {};
    if (isAdmin) {
      partyWhere.categoryId = { in: categoryIds };
    }

    const totalCompanies = await this.prisma.company.count({
      where: companyWhere,
    });
    const pendingVerificationCompanies = await this.prisma.company.count({
      where: pendingCompanyWhere,
    });
    const totalOrders = await this.prisma.order.count({ where: orderWhere });
    const totalComplaints = await this.prisma.complaint.count({
      where: complaintWhere,
    });

    const totalDrivers = await this.prisma.driver.count({ where: driverWhere });
    const totalParties = await this.prisma.party.count({ where: partyWhere });

    const totalOrderValueAggregate = await this.prisma.order.aggregate({
      where: orderWhere,
      _sum: { totalRate: true, bag: true },
    });
    const totalOrderValue = totalOrderValueAggregate._sum.totalRate || 0;
    const totalBagsOrdered = totalOrderValueAggregate._sum.bag || 0;

    // Status breakdowns
    const companyStatuses = await this.prisma.company.groupBy({
      where: companyWhere,
      by: ['status'],
      _count: { _all: true },
    });
    const companyStatusBreakdown = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      BLOCKED: 0,
    };
    companyStatuses.forEach((c) => {
      companyStatusBreakdown[c.status] = c._count._all;
    });

    const complaintStatuses = await this.prisma.complaint.groupBy({
      where: complaintWhere,
      by: ['status'],
      _count: { _all: true },
    });
    const complaintStatusBreakdown = {
      PENDING: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      REOPENED: 0,
      CANCELLED: 0,
    };
    complaintStatuses.forEach((c) => {
      complaintStatusBreakdown[c.status] = c._count._all;
    });

    // Weekly trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }
    const startOfTrend = new Date(last7Days[0]);

    const trendOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfTrend,
        },
        ...orderWhere,
      },
      select: {
        createdAt: true,
        totalRate: true,
      },
    });

    const weeklyOrderValueTrend = last7Days.map((date) => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = trendOrders.filter(
        (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd,
      );

      const count = dayOrders.length;
      const orderValue = dayOrders.reduce((sum, o) => sum + o.totalRate, 0);

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      const dateLabel = date.toLocaleDateString('en-US', options);

      return {
        date: date.toISOString().split('T')[0],
        label: dateLabel,
        count,
        orderValue,
      };
    });

    // Top performers
    const productOrdersGroup = await this.prisma.order.groupBy({
      where: orderWhere,
      by: ['productId'],
      _count: { _all: true },
      _sum: { bag: true, totalRate: true },
      orderBy: {
        _sum: {
          totalRate: 'desc',
        },
      },
      take: 5,
    });
    const productIds = productOrdersGroup.map((g) => g.productId);
    const productsInfo = await this.prisma.product.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, productName: true },
    });
    const topProducts = productOrdersGroup.map((g) => {
      const info = productsInfo.find((p) => p.productId === g.productId);
      return {
        productId: g.productId,
        productName: info?.productName || 'Unknown',
        orderCount: g._count._all,
        totalBags: g._sum.bag || 0,
        totalOrderValue: g._sum.totalRate || 0,
      };
    });

    const companyOrdersGroup = await this.prisma.order.groupBy({
      where: orderWhere,
      by: ['companyId'],
      _sum: { totalRate: true, bag: true },
      _count: { _all: true },
      orderBy: {
        _sum: {
          totalRate: 'desc',
        },
      },
      take: 5,
    });
    const companyIds = companyOrdersGroup.map((g) => g.companyId);
    const companiesInfo = await this.prisma.company.findMany({
      where: { companyId: { in: companyIds } },
      select: { companyId: true, companyName: true, ownerName: true },
    });
    const topCompanies = companyOrdersGroup.map((g) => {
      const info = companiesInfo.find((c) => c.companyId === g.companyId);
      return {
        companyId: g.companyId,
        companyName: info?.companyName || 'Unknown',
        ownerName: info?.ownerName || 'Unknown',
        orderCount: g._count._all,
        totalBags: g._sum.bag || 0,
        totalOrderValue: g._sum.totalRate || 0,
      };
    });

    const partyOrdersGroup = await this.prisma.order.groupBy({
      where: orderWhere,
      by: ['partyId'],
      _sum: { totalRate: true, bag: true },
      _count: { _all: true },
      orderBy: {
        _sum: {
          totalRate: 'desc',
        },
      },
      take: 5,
    });
    const filteredPartyGroups = partyOrdersGroup.filter(
      (g) => g.partyId !== null,
    );
    const partyIds = filteredPartyGroups.map((g) => g.partyId as string);
    const partiesInfo = await this.prisma.party.findMany({
      where: { partyId: { in: partyIds } },
      select: { partyId: true, partyName: true, businessName: true },
    });
    const topParties = filteredPartyGroups.map((g) => {
      const info = partiesInfo.find((p) => p.partyId === g.partyId);
      return {
        partyId: g.partyId,
        partyName: info?.partyName || 'Unknown',
        businessName: info?.businessName || 'Unknown',
        orderCount: g._count._all,
        totalBags: g._sum.bag || 0,
        totalOrderValue: g._sum.totalRate || 0,
      };
    });

    // Generate recent activities by fetching recent records
    const recentCompanies = await this.prisma.company.findMany({
      where: companyWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { companyName: true, createdAt: true },
    });

    const recentComplaints = await this.prisma.complaint.findMany({
      where: complaintWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { title: true, createdAt: true },
    });

    const recentOrders = await this.prisma.order.findMany({
      where: orderWhere,
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

    activities.sort((a, b) => b.time.getTime() - a.time.getTime());

    return {
      todaySummary: {
        totalCompanies,
        pendingVerificationCompanies,
        totalOrders,
        totalComplaints,
        totalOrderValue,
        totalDrivers,
        totalParties,
        totalBagsOrdered,
      },
      companyStatusBreakdown,
      complaintStatusBreakdown,
      weeklyOrderValueTrend,
      topProducts,
      topCompanies,
      topParties,
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

    const orderValueAggregate = await this.prisma.order.aggregate({
      where: { companyId },
      _sum: { totalRate: true, bag: true },
    });
    const totalOrderValue = orderValueAggregate._sum.totalRate || 0;
    const totalBagsOrdered = orderValueAggregate._sum.bag || 0;

    // Delivery Status Breakdown
    const deliveryStatuses = await this.prisma.delivery.groupBy({
      where: {
        order: { companyId },
      },
      by: ['status'],
      _count: { _all: true },
    });
    const deliveryStatusBreakdown = {
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      IN_TRANSIT: 0,
      REACHED: 0,
      DELIVERED: 0,
    };
    deliveryStatuses.forEach((d) => {
      deliveryStatusBreakdown[d.status] = d._count._all;
    });

    // Complaint Status Breakdown
    const complaintStatuses = await this.prisma.complaint.groupBy({
      where: { companyId },
      by: ['status'],
      _count: { _all: true },
    });
    const complaintStatusBreakdown = {
      PENDING: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      REOPENED: 0,
      CANCELLED: 0,
    };
    complaintStatuses.forEach((c) => {
      complaintStatusBreakdown[c.status] = c._count._all;
    });

    // Weekly Revenue Trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }
    const startOfTrend = new Date(last7Days[0]);

    const trendOrders = await this.prisma.order.findMany({
      where: {
        companyId,
        createdAt: { gte: startOfTrend },
      },
      select: { createdAt: true, totalRate: true },
    });

    const weeklyOrderValueTrend = last7Days.map((date) => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = trendOrders.filter(
        (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd,
      );

      const count = dayOrders.length;
      const orderValue = dayOrders.reduce((sum, o) => sum + o.totalRate, 0);

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      const dateLabel = date.toLocaleDateString('en-US', options);

      return {
        date: date.toISOString().split('T')[0],
        label: dateLabel,
        count,
        orderValue,
      };
    });

    // Monthly Revenue Trend for the last 6 months
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      d.setHours(0, 0, 0, 0);
      last6Months.push(d);
    }
    const startOf6MonthTrend = new Date(last6Months[0]);

    const sixMonthTrendOrders = await this.prisma.order.findMany({
      where: {
        companyId,
        createdAt: { gte: startOf6MonthTrend },
      },
      select: { createdAt: true, totalRate: true, bag: true },
    });

    const sixMonthOrderValueTrend = last6Months.map((date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const monthOrders = sixMonthTrendOrders.filter(
        (o) => o.createdAt >= monthStart && o.createdAt <= monthEnd,
      );

      const count = monthOrders.length;
      const orderValue = monthOrders.reduce((sum, o) => sum + o.totalRate, 0);
      const bags = monthOrders.reduce((sum, o) => sum + (o.bag || 0), 0);

      const monthLabel = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: monthLabel,
        count,
        orderValue,
        bags,
      };
    });

    // Top Parties
    const partyOrdersGroup = await this.prisma.order.groupBy({
      where: { companyId },
      by: ['partyId'],
      _sum: { totalRate: true, bag: true },
      _count: { _all: true },
      orderBy: {
        _sum: { totalRate: 'desc' },
      },
      take: 5,
    });
    const filteredPartyGroups = partyOrdersGroup.filter(
      (g) => g.partyId !== null,
    );
    const partyIds = filteredPartyGroups.map((g) => g.partyId as string);
    const partiesInfo = await this.prisma.party.findMany({
      where: { partyId: { in: partyIds } },
      select: { partyId: true, partyName: true, businessName: true },
    });
    const topParties = filteredPartyGroups.map((g) => {
      const info = partiesInfo.find((p) => p.partyId === g.partyId);
      return {
        partyId: g.partyId,
        partyName: info?.partyName || 'Unknown',
        businessName: info?.businessName || 'Unknown',
        orderCount: g._count._all,
        totalBags: g._sum.bag || 0,
        totalOrderValue: g._sum.totalRate || 0,
      };
    });

    // Top Products
    const productOrdersGroup = await this.prisma.order.groupBy({
      where: { companyId },
      by: ['productId'],
      _sum: { totalRate: true, bag: true },
      _count: { _all: true },
      orderBy: {
        _sum: { totalRate: 'desc' },
      },
      take: 5,
    });
    const productIds = productOrdersGroup.map((g) => g.productId);
    const productsInfo = await this.prisma.product.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, productName: true },
    });
    const topProducts = productOrdersGroup.map((g) => {
      const info = productsInfo.find((p) => p.productId === g.productId);
      return {
        productId: g.productId,
        productName: info?.productName || 'Unknown',
        orderCount: g._count._all,
        totalBags: g._sum.bag || 0,
        totalOrderValue: g._sum.totalRate || 0,
      };
    });

    // Recent Orders
    const recentOrdersRaw = await this.prisma.order.findMany({
      where: { companyId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        party: {
          select: {
            partyName: true,
            businessName: true,
          },
        },
        product: {
          select: {
            productName: true,
          },
        },
      },
    });
    const recentOrders = recentOrdersRaw.map((o) => ({
      orderId: o.orderId,
      showOrderId: o.showOrderId,
      partyName: o.party?.partyName || null,
      businessName: o.party?.businessName || null,
      productName: o.product?.productName || null,
      bag: o.bag,
      bagSize: o.bagSize,
      totalRate: o.totalRate,
      createdAt: o.createdAt,
    }));

    const documents = [
      {
        name: 'ট্রেড লাইসেন্স',
        description: 'কোম্পানি ট্রেড লাইসেন্স কপি',
        file: company.incomeTax || null,
      },
      {
        name: 'জাতীয় পরিচয়পত্র',
        description: 'মালিকের NID কপি',
        file:
          company.companyDocument.length > 0
            ? company.companyDocument[0]
            : null,
      },
      {
        name: 'ব্যাংক তথ্য',
        description: 'ব্যাংক স্টেটমেন্ট বা চেক বই কপি',
        file:
          company.companyDocument.length > 1
            ? company.companyDocument[1]
            : null,
      },
    ];

    // Today's orders count
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayOrdersCount = await this.prisma.order.count({
      where: {
        companyId,
        createdAt: { gte: startOfToday },
      },
    });

    // Stock alert count
    const companyProducts = await this.prisma.product.findMany({
      where: { companyId },
      select: { stockSize: true, minimumOrder: true },
    });
    const stockAlertCount = companyProducts.filter(
      (p) => p.stockSize <= 0 || p.stockSize < p.minimumOrder,
    ).length;

    // Completed deliveries count (total completed deliveries)
    const completedDeliveriesCount = await this.prisma.delivery.count({
      where: {
        order: { companyId },
        status: DeliveryStatus.DELIVERED,
      },
    });

    // Active complaints count
    const activeComplaintsCount = await this.prisma.complaint.count({
      where: {
        companyId,
        status: {
          in: [
            ComplaintStatus.PENDING,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.REOPENED,
          ],
        },
      },
    });

    // Active parties count
    const activePartiesCount = await this.prisma.party.count({
      where: { companyId },
    });

    // Sales growth percentage
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const thisMonthOrders = await this.prisma.order.aggregate({
      where: {
        companyId,
        createdAt: { gte: startOfThisMonth },
      },
      _sum: { totalRate: true },
    });
    const thisMonthSales = thisMonthOrders._sum.totalRate || 0;

    const lastMonthOrders = await this.prisma.order.aggregate({
      where: {
        companyId,
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: { totalRate: true },
    });
    const lastMonthSales = lastMonthOrders._sum.totalRate || 0;

    let salesGrowth = 0;
    if (lastMonthSales > 0) {
      salesGrowth = parseFloat(
        (((thisMonthSales - lastMonthSales) / lastMonthSales) * 100).toFixed(1),
      );
    } else if (thisMonthSales > 0) {
      salesGrowth = 100.0;
    }

    // Pending Deliveries: Orders that are not delivered or cancelled yet
    const pendingOrdersRaw = await this.prisma.order.findMany({
      where: {
        companyId,
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.ACCEPTED,
            OrderStatus.PROCESSING,
            OrderStatus.DISPATCHED,
          ],
        },
      },
      include: {
        party: {
          select: {
            partyName: true,
            businessName: true,
          },
        },
        product: {
          select: {
            productName: true,
            unit: true,
          },
        },
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingDeliveries = pendingOrdersRaw.map((o) => {
      const latestDelivery = o.deliveries?.[0] || null;
      let deliveryStatus = 'Pending';
      if (latestDelivery) {
        if (latestDelivery.status === DeliveryStatus.IN_TRANSIT) {
          deliveryStatus = 'In Transit';
        } else if (latestDelivery.status === DeliveryStatus.REACHED) {
          deliveryStatus = 'Reached';
        } else if (latestDelivery.status === DeliveryStatus.ACCEPTED) {
          deliveryStatus = 'Accepted';
        } else if (latestDelivery.status === DeliveryStatus.REJECTED) {
          deliveryStatus = 'Rejected';
        }
      }
      return {
        orderId: o.orderId,
        showOrderId: o.showOrderId,
        partyName:
          o.party?.businessName || o.party?.partyName || 'Unknown Party',
        productName: o.product?.productName || 'Unknown Product',
        quantity: o.bag,
        unit: o.product?.unit || o.bagSize || 'Bag',
        totalAmount: o.totalRate,
        deliveryStatus,
        createdAt: o.createdAt,
      };
    });

    return {
      ownerName: company.ownerName,
      companyName: company.companyName,
      totalSales: totalOrderValue,
      salesGrowth,
      todayOrdersCount,
      stockAlertCount,
      completedDeliveriesCount,
      activeComplaintsCount,
      activePartiesCount,
      pendingDeliveries,

      // original response fields to preserve compatibility
      metrics: {
        totalOrders,
        totalDrivers,
        totalParties,
        totalComplaints,
        totalOrderValue,
        totalBagsOrdered,
      },
      deliveryStatusBreakdown,
      complaintStatusBreakdown,
      weeklyOrderValueTrend,
      sixMonthOrderValueTrend,
      topParties,
      topProducts,
      recentOrders,
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
                DeliveryStatus.PENDING,
                DeliveryStatus.ACCEPTED,
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.REACHED,
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
    const companyIds = new Set<string>(
      orderedCompanies.map((o) => o.companyId),
    );
    if (party.companyId) {
      companyIds.add(party.companyId);
    }
    const activeCompanies = companyIds.size;

    const pendingComplaints = await this.prisma.complaint.count({
      where: {
        partyId,
        status: {
          in: [
            ComplaintStatus.PENDING,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.REOPENED,
          ],
        },
      },
    });

    const orderValueAggregate = await this.prisma.order.aggregate({
      where: { partyId },
      _sum: { totalRate: true, bag: true },
    });
    const totalOrderValue = orderValueAggregate._sum.totalRate || 0;
    const totalBagsOrdered = orderValueAggregate._sum.bag || 0;

    // Weekly Spend Trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }
    const startOfTrend = new Date(last7Days[0]);

    const trendOrders = await this.prisma.order.findMany({
      where: {
        partyId,
        createdAt: { gte: startOfTrend },
      },
      select: { createdAt: true, totalRate: true },
    });

    const weeklyOrderValueTrend = last7Days.map((date) => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = trendOrders.filter(
        (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd,
      );

      const count = dayOrders.length;
      const orderValue = dayOrders.reduce((sum, o) => sum + o.totalRate, 0);

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      const dateLabel = date.toLocaleDateString('en-US', options);

      return {
        date: date.toISOString().split('T')[0],
        label: dateLabel,
        count,
        orderValue,
      };
    });

    // Top Products
    const productOrdersGroup = await this.prisma.order.groupBy({
      where: { partyId },
      by: ['productId'],
      _sum: { totalRate: true, bag: true },
      _count: { _all: true },
      orderBy: {
        _sum: { totalRate: 'desc' },
      },
      take: 5,
    });
    const productIds = productOrdersGroup.map((g) => g.productId);
    const productsInfo = await this.prisma.product.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, productName: true },
    });
    const topProducts = productOrdersGroup.map((g) => {
      const info = productsInfo.find((p) => p.productId === g.productId);
      return {
        productId: g.productId,
        productName: info?.productName || 'Unknown',
        orderCount: g._count._all,
        totalBags: g._sum.bag || 0,
        totalOrderValue: g._sum.totalRate || 0,
      };
    });

    // Recent Inquiries
    const recentInquiriesRaw = await this.prisma.inquiry.findMany({
      where: { partyId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            categoryName: true,
          },
        },
      },
    });
    const recentInquiries = recentInquiriesRaw.map((inq) => ({
      inquiryId: inq.inquiryId,
      title: inq.title,
      description: inq.description,
      categoryName: inq.category?.categoryName || null,
      createdAt: inq.createdAt,
    }));

    // Recent Offers
    const recentOffersRaw = await this.prisma.offer.findMany({
      where: { partyId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            productName: true,
          },
        },
      },
    });
    const recentOffers = recentOffersRaw.map((off) => ({
      offerId: off.offerId,
      offerPrice: off.offerPrice,
      discountRate: off.discountRate,
      description: off.description,
      status: off.status,
      productName: off.product?.productName || null,
      startDate: off.startDate,
      endDate: off.endDate,
    }));

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
        totalOrderValue,
        totalBagsOrdered,
      },
      weeklyOrderValueTrend,
      topProducts,
      recentOrders,
      recentInquiries,
      recentOffers,
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
            DeliveryStatus.PENDING,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.REACHED,
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

    const proofUploadPending = await this.prisma.delivery.count({
      where: {
        driverId,
        OR: [
          { status: DeliveryStatus.IN_TRANSIT, pickupProof: null },
          { status: DeliveryStatus.DELIVERED, deliveryProof: null },
        ],
      },
    });

    const totalDeliveries = await this.prisma.delivery.count({
      where: { driverId },
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }
    const startOfTrend = new Date(last7Days[0]);

    const trendDeliveries = await this.prisma.delivery.findMany({
      where: {
        driverId,
        createdAt: { gte: startOfTrend },
      },
      select: { createdAt: true },
    });

    const weeklyDeliveryTrend = last7Days.map((date) => {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const count = trendDeliveries.filter(
        (d) => d.createdAt >= dayStart && d.createdAt <= dayEnd,
      ).length;

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      const dateLabel = date.toLocaleDateString('en-US', options);

      return {
        date: date.toISOString().split('T')[0],
        label: dateLabel,
        count,
      };
    });

    const currentLocation =
      driver.upozela && driver.district
        ? `${driver.upozela}, ${driver.district}`
        : driver.district || driver.upozela || '';

    // Fetch ongoing deliveries list with order, company and party details
    const ongoingDeliveriesRaw = await this.prisma.delivery.findMany({
      where: {
        driverId,
        status: {
          in: [
            DeliveryStatus.PENDING,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.REACHED,
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

    // Recent Deliveries
    const recentDeliveriesRaw = await this.prisma.delivery.findMany({
      where: { driverId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            company: {
              select: {
                companyName: true,
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
    });
    const recentDeliveries = recentDeliveriesRaw.map((d) => ({
      deliveryId: d.deliveryId,
      status: d.status,
      orderId: d.orderId,
      showOrderId: d.order?.showOrderId || null,
      companyName: d.order?.company?.companyName || null,
      partyName:
        d.order?.party?.businessName || d.order?.party?.partyName || null,
      destinationAddress: d.address,
      upozela: d.upozela,
      district: d.district,
      deliveryTime: d.deliveryTime,
      createdAt: d.createdAt,
    }));

    return {
      driverName: driver.driverName,
      metrics: {
        todaysAssignments,
        ongoingDeliveries,
        completedDeliveries,
        proofUploadPending,
        totalDeliveries,
      },
      weeklyDeliveryTrend,
      currentLocation,
      ongoingDeliveries: ongoingDeliveriesList,
      recentDeliveries,
    };
  }
}
