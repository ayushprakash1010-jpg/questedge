import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(data: {
    targetOrgId: string;
    targetUserId?: string;
    sessionType: 'SHADOW' | 'IMPERSONATE';
    reason: string;
    supportUserId: string;
    ipAddress?: string;
  }) {
    return this.prisma.supportSession.create({
      data: {
        supportUserId: data.supportUserId,
        targetOrgId: data.targetOrgId,
        targetUserId: data.targetUserId,
        sessionType: data.sessionType,
        reason: data.reason,
        ipAddress: data.ipAddress,
      },
      include: {
        supportUser: { select: { id: true, name: true } },
        targetOrg: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async endSession(id: string, supportUserId: string) {
    const session = await this.prisma.supportSession.findUnique({
      where: { id },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.supportUserId !== supportUserId) {
      throw new ForbiddenException('You can only end your own sessions');
    }

    return this.prisma.supportSession.update({
      where: { id },
      data: { endedAt: new Date() },
    });
  }

  async listSessions(query: {
    page: number;
    limit: number;
    orgId?: string;
    supportUserId?: string;
  }) {
    const where: any = {};
    if (query.orgId) where.targetOrgId = query.orgId;
    if (query.supportUserId) where.supportUserId = query.supportUserId;

    const [sessions, total] = await Promise.all([
      this.prisma.supportSession.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { startedAt: 'desc' },
        include: {
          supportUser: { select: { id: true, name: true } },
          targetOrg: { select: { id: true, name: true } },
          targetUser: { select: { id: true, name: true } },
        },
      }),
      this.prisma.supportSession.count({ where }),
    ]);

    return {
      data: sessions,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async getActiveSessions() {
    return this.prisma.supportSession.findMany({
      where: { endedAt: null },
      orderBy: { startedAt: 'desc' },
      include: {
        supportUser: { select: { id: true, name: true } },
        targetOrg: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true } },
      },
    });
  }

  async getSession(id: string) {
    const session = await this.prisma.supportSession.findUnique({
      where: { id },
      include: {
        supportUser: { select: { id: true, name: true, email: true } },
        targetOrg: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }
}
