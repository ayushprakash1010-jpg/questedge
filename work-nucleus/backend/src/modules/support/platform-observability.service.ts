import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlatformObservabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // ── AI Cost ─────────────────────────────────────────────────────

  async getAiCostDashboard(opts: { days?: number; orgId?: string }) {
    const { days = 30, orgId } = opts;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const where: any = { createdAt: { gte: from } };
    if (orgId) where.orgId = orgId;

    const [totals, byAgentRaw, byOrgRaw] = await this.prisma.$transaction([
      // Aggregate totals
      this.prisma.aiCallLog.aggregate({
        where,
        _sum: { tokensInput: true, tokensOutput: true, costInPaise: true },
        _count: { _all: true },
      }),
      // Group by agent
      this.prisma.aiCallLog.groupBy({
        by: ['agentName'],
        where,
        _sum: { tokensInput: true, tokensOutput: true, costInPaise: true },
        _count: { _all: true },
        orderBy: { _sum: { costInPaise: 'desc' } },
      }),
      // Group by org (top 20 by cost)
      this.prisma.aiCallLog.groupBy({
        by: ['orgId'],
        where,
        _sum: { costInPaise: true },
        _count: { _all: true },
        orderBy: { _sum: { costInPaise: 'desc' } },
        take: 20,
      }),
    ]);

    // Daily breakdown via raw query
    const byDayRaw = await this.prisma.$queryRaw<
      { date: string; calls: bigint; cost: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', "created_at")::date::text AS date,
        COUNT(*) AS calls,
        COALESCE(SUM("cost_in_paise"), 0) AS cost
      FROM "ai_call_logs"
      WHERE "created_at" >= ${from}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const failedCount = await this.prisma.aiCallLog.count({
      where: { ...where, status: 'ERROR' },
    });
    const totalCalls = totals._count._all;
    const errorRate = totalCalls > 0 ? failedCount / totalCalls : 0;

    // Enrich byOrg with org names
    const orgIds = byOrgRaw.map((o) => o.orgId).filter(Boolean) as string[];
    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

    return {
      period: { from: from.toISOString(), to: new Date().toISOString(), days },
      totalCalls,
      totalTokensInput: totals._sum.tokensInput ?? 0,
      totalTokensOutput: totals._sum.tokensOutput ?? 0,
      totalCostPaise: totals._sum.costInPaise ?? 0,
      errorRate: Math.round(errorRate * 10000) / 10000,
      byAgent: byAgentRaw.map((a) => ({
        agentName: a.agentName,
        calls: (a._count as any)?._all ?? 0,
        costPaise: (a._sum as any)?.costInPaise ?? 0,
        inputTokens: (a._sum as any)?.tokensInput ?? 0,
        outputTokens: (a._sum as any)?.tokensOutput ?? 0,
      })),
      byOrg: byOrgRaw.map((o) => ({
        orgId: o.orgId,
        orgName: o.orgId ? (orgMap[o.orgId] ?? 'Unknown') : 'Internal',
        calls: (o._count as any)?._all ?? 0,
        costPaise: (o._sum as any)?.costInPaise ?? 0,
      })),
      byDay: (byDayRaw as any[]).map((d) => ({
        date: d.date,
        calls: Number(d.calls),
        costPaise: Number(d.cost),
      })),
    };
  }

  async listAiCallLogs(opts: {
    page?: number;
    limit?: number;
    orgId?: string;
    agentName?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    const { page = 1, limit = 50, orgId, agentName, status, from, to } = opts;
    const where: any = {};
    if (orgId) where.orgId = orgId;
    if (agentName)
      where.agentName = { contains: agentName, mode: 'insensitive' };
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiCallLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orgId: true,
          agentName: true,
          modelUsed: true,
          tokensInput: true,
          tokensOutput: true,
          costInPaise: true,
          latencyMs: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.aiCallLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Platform Audit Log ──────────────────────────────────────────

  async listPlatformAuditLog(opts: {
    page?: number;
    limit?: number;
    orgId?: string;
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) {
    const {
      page = 1,
      limit = 50,
      orgId,
      userId,
      action,
      entityType,
      from,
      to,
    } = opts;
    const where: any = {};
    // No orgId = cross-org view (SUPPORT_ADMIN privilege enforced at controller level)
    if (orgId) where.orgId = orgId;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Platform Security Log ───────────────────────────────────────

  async listPlatformSecurityLog(opts: {
    page?: number;
    limit?: number;
    orgId?: string;
    eventType?: string;
    from?: string;
    to?: string;
  }) {
    const { page = 1, limit = 50, orgId, eventType, from, to } = opts;
    const where: any = {};
    if (orgId) where.orgId = orgId;
    if (eventType)
      where.eventType = { contains: eventType, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.securityLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orgId: true,
          eventType: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          // hash and prevHash intentionally excluded from API response
        },
      }),
      this.prisma.securityLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
