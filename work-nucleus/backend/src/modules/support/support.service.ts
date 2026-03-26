import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HiringPlanStatus, ApplicationStatus } from '@prisma/client';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalOrgs,
      totalUsers,
      activeUsers,
      totalActivePlans,
      totalOpenTickets,
      recentOrgs,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.hiringPlan.count({ where: { status: HiringPlanStatus.ACTIVE } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
      this.prisma.organization.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, industry: true, createdAt: true },
      }),
    ]);

    // Orgs needing attention: those with open critical/high tickets
    const orgsNeedingAttention = await this.prisma.supportTicket.groupBy({
      by: ['orgId'],
      where: { priority: { in: ['CRITICAL', 'HIGH'] }, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } },
      _count: true,
    });

    return {
      totalOrgs,
      totalUsers,
      activeUsers,
      totalActivePlans,
      totalOpenTickets,
      orgsNeedingAttention: orgsNeedingAttention.length,
      recentOrgs,
    };
  }

  async getOrganizations(query: { page: number; limit: number; search?: string; industry?: string }) {
    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.industry) {
      where.industry = query.industry;
    }

    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          industry: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              hiringPlans: { where: { status: HiringPlanStatus.ACTIVE } },
              supportTickets: { where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } },
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    // Get latest health score for each org
    const orgIds = orgs.map((o) => o.id);
    const latestHealth = await this.prisma.orgHealthMetric.findMany({
      where: { orgId: { in: orgIds } },
      orderBy: { metricDate: 'desc' },
      distinct: ['orgId'],
      select: { orgId: true, healthScore: true, riskFlags: true },
    });

    const healthMap = new Map(latestHealth.map((h) => [h.orgId, h]));

    const data = orgs.map((org) => ({
      ...org,
      healthScore: healthMap.get(org.id)?.healthScore ?? null,
      riskFlags: healthMap.get(org.id)?.riskFlags ?? [],
    }));

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getOrganizationDetail(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        settings: true,
        _count: {
          select: {
            users: true,
            hiringPlans: true,
            candidates: true,
            supportTickets: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const [activePlans, activeUsers, openTickets, latestHealth] = await Promise.all([
      this.prisma.hiringPlan.count({ where: { orgId, status: HiringPlanStatus.ACTIVE } }),
      this.prisma.user.count({ where: { orgId, isActive: true } }),
      this.prisma.supportTicket.count({ where: { orgId, status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
      this.prisma.orgHealthMetric.findFirst({
        where: { orgId },
        orderBy: { metricDate: 'desc' },
      }),
    ]);

    return {
      ...org,
      activePlans,
      activeUsers,
      openTickets,
      latestHealth,
    };
  }

  async getOrgUsers(orgId: string, query: { page: number; limit: number }) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { orgId },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          avatarUrl: true,
        },
      }),
      this.prisma.user.count({ where: { orgId } }),
    ]);

    return {
      data: users,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getOrgHiringPlans(orgId: string, query: { page: number; limit: number; status?: string }) {
    const where: any = { orgId };
    if (query.status) {
      where.status = query.status;
    }

    const [plans, total] = await Promise.all([
      this.prisma.hiringPlan.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          department: true,
          quarter: true,
          year: true,
          totalRoles: true,
          filledRoles: true,
          status: true,
          designation: true,
          createdAt: true,
          updatedAt: true,
          hiringManager: { select: { id: true, name: true } },
        },
      }),
      this.prisma.hiringPlan.count({ where }),
    ]);

    return {
      data: plans,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getOrgHealth(orgId: string, months: number) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const metrics = await this.prisma.orgHealthMetric.findMany({
      where: { orgId, metricDate: { gte: startDate } },
      orderBy: { metricDate: 'asc' },
    });

    return metrics;
  }
}
