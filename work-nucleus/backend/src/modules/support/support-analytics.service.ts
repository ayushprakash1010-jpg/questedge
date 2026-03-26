import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HiringPlanStatus, ApplicationStatus } from '@prisma/client';

@Injectable()
export class SupportAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTicketVolume(period: string, groupBy?: string) {
    const months = period === 'weekly' ? 3 : 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const tickets = await this.prisma.supportTicket.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, category: true, priority: true, orgId: true },
    });

    // Group by month
    const volumeByMonth: Record<string, number> = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      volumeByMonth[key] = 0;
    }

    for (const t of tickets) {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (volumeByMonth[key] !== undefined) volumeByMonth[key]++;
    }

    // Group by category
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const t of tickets) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    }

    return {
      trend: Object.entries(volumeByMonth).map(([month, count]) => ({ month, count })),
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      total: tickets.length,
    };
  }

  async getResponseTime(groupBy?: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { firstResponseAt: { not: null } },
      select: {
        createdAt: true,
        firstResponseAt: true,
        resolvedAt: true,
        priority: true,
        category: true,
      },
    });

    const groups: Record<string, { responseTimes: number[]; resolutionTimes: number[] }> = {};

    for (const t of tickets) {
      const key = groupBy === 'category' ? t.category : t.priority;
      if (!groups[key]) groups[key] = { responseTimes: [], resolutionTimes: [] };

      const responseHours = Math.ceil(
        (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60),
      );
      groups[key].responseTimes.push(responseHours);

      if (t.resolvedAt) {
        const resolutionHours = Math.ceil(
          (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60),
        );
        groups[key].resolutionTimes.push(resolutionHours);
      }
    }

    return Object.entries(groups).map(([group, data]) => ({
      group,
      avgResponseHours: data.responseTimes.length > 0
        ? Math.round(data.responseTimes.reduce((s, v) => s + v, 0) / data.responseTimes.length)
        : 0,
      avgResolutionHours: data.resolutionTimes.length > 0
        ? Math.round(data.resolutionTimes.reduce((s, v) => s + v, 0) / data.resolutionTimes.length)
        : 0,
      ticketCount: data.responseTimes.length,
    }));
  }

  async getSlaCompliance(period: string) {
    const months = period === 'weekly' ? 3 : 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        createdAt: { gte: startDate },
        resolvedAt: { not: null },
        slaDeadline: { not: null },
      },
      select: { resolvedAt: true, slaDeadline: true, priority: true, createdAt: true },
    });

    const byPriority: Record<string, { met: number; breached: number }> = {};
    for (const t of tickets) {
      if (!byPriority[t.priority]) byPriority[t.priority] = { met: 0, breached: 0 };
      if (new Date(t.resolvedAt!) <= new Date(t.slaDeadline!)) {
        byPriority[t.priority].met++;
      } else {
        byPriority[t.priority].breached++;
      }
    }

    const overall = tickets.reduce(
      (acc, t) => {
        if (new Date(t.resolvedAt!) <= new Date(t.slaDeadline!)) acc.met++;
        else acc.breached++;
        return acc;
      },
      { met: 0, breached: 0 },
    );

    return {
      overall: {
        ...overall,
        total: overall.met + overall.breached,
        complianceRate: overall.met + overall.breached > 0
          ? Math.round((overall.met / (overall.met + overall.breached)) * 100)
          : 100,
      },
      byPriority: Object.entries(byPriority).map(([priority, data]) => ({
        priority,
        ...data,
        total: data.met + data.breached,
        complianceRate: data.met + data.breached > 0
          ? Math.round((data.met / (data.met + data.breached)) * 100)
          : 100,
      })),
    };
  }

  async getAllOrgHealth() {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, name: true, industry: true },
    });

    const latestMetrics = await this.prisma.orgHealthMetric.findMany({
      orderBy: { metricDate: 'desc' },
      distinct: ['orgId'],
    });

    const metricsMap = new Map(latestMetrics.map((m) => [m.orgId, m]));

    return orgs.map((org) => ({
      ...org,
      health: metricsMap.get(org.id) || null,
    }));
  }

  async getOrgHealthDetail(orgId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.prisma.orgHealthMetric.findMany({
      where: { orgId, metricDate: { gte: sixMonthsAgo } },
      orderBy: { metricDate: 'asc' },
    });
  }

  async getRepPerformance() {
    const reps = await this.prisma.user.findMany({
      where: { role: { in: ['SUPPORT_REP', 'SUPPORT_ADMIN'] } },
      select: { id: true, name: true, email: true },
    });

    const repStats = await Promise.all(
      reps.map(async (rep) => {
        const [total, resolved, avgResponse] = await Promise.all([
          this.prisma.supportTicket.count({ where: { assigneeId: rep.id } }),
          this.prisma.supportTicket.count({ where: { assigneeId: rep.id, status: { in: ['RESOLVED', 'CLOSED'] } } }),
          this.prisma.supportTicket.findMany({
            where: { assigneeId: rep.id, firstResponseAt: { not: null } },
            select: { createdAt: true, firstResponseAt: true },
          }),
        ]);

        const avgResponseHours = avgResponse.length > 0
          ? Math.round(
              avgResponse.reduce(
                (s, t) =>
                  s + (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60),
                0,
              ) / avgResponse.length,
            )
          : 0;

        return {
          ...rep,
          totalTickets: total,
          resolvedTickets: resolved,
          resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
          avgResponseHours,
        };
      }),
    );

    return repStats.sort((a, b) => b.resolvedTickets - a.resolvedTickets);
  }

  async computeOrgHealth() {
    const orgs = await this.prisma.organization.findMany({
      select: { id: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = await Promise.all(
      orgs.map(async (org) => {
        const [activeUsers, hiringPlans, totalRolesAgg, openTickets] = await Promise.all([
          this.prisma.user.count({ where: { orgId: org.id, isActive: true } }),
          this.prisma.hiringPlan.count({ where: { orgId: org.id, status: HiringPlanStatus.ACTIVE } }),
          this.prisma.hiringPlan.aggregate({
            where: { orgId: org.id, status: { in: [HiringPlanStatus.ACTIVE, HiringPlanStatus.COMPLETED] } },
            _sum: { totalRoles: true, filledRoles: true },
          }),
          this.prisma.supportTicket.count({
            where: { orgId: org.id, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
          }),
        ]);

        const totalRoles = totalRolesAgg._sum.totalRoles || 0;
        const filledRoles = totalRolesAgg._sum.filledRoles || 0;
        const fillRate = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;

        // Health score: 0-100 based on user activity, fill rate, open tickets
        const riskFlags: string[] = [];
        let score = 100;

        if (activeUsers === 0) { score -= 30; riskFlags.push('No active users'); }
        else if (activeUsers < 3) { score -= 10; riskFlags.push('Low user count'); }

        if (hiringPlans === 0) { score -= 20; riskFlags.push('No active hiring plans'); }

        if (fillRate < 25 && totalRoles > 0) { score -= 15; riskFlags.push('Low fill rate'); }

        if (openTickets > 5) { score -= 15; riskFlags.push('High open ticket count'); }
        else if (openTickets > 2) { score -= 5; }

        score = Math.max(0, Math.min(100, score));

        return this.prisma.orgHealthMetric.upsert({
          where: { orgId_metricDate: { orgId: org.id, metricDate: today } },
          create: {
            orgId: org.id,
            metricDate: today,
            activeUsers,
            hiringPlanCount: hiringPlans,
            openRoles: totalRoles - filledRoles,
            fillRate,
            healthScore: score,
            riskFlags,
          },
          update: {
            activeUsers,
            hiringPlanCount: hiringPlans,
            openRoles: totalRoles - filledRoles,
            fillRate,
            healthScore: score,
            riskFlags,
          },
        });
      }),
    );

    return { computed: results.length, results };
  }
}
