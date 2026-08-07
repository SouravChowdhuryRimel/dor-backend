import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/database.service';
import { CompanyStatus, ComplaintStatus } from '@prisma/client';

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
}
