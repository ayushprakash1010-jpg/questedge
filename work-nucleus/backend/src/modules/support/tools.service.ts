import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportData(orgId: string, dataTypes: string[]) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const exportResult: Record<string, any> = { organization: org };

    if (dataTypes.includes('users')) {
      exportResult.users = await this.prisma.user.findMany({
        where: { orgId },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      });
    }

    if (dataTypes.includes('hiring-plans')) {
      exportResult.hiringPlans = await this.prisma.hiringPlan.findMany({
        where: { orgId },
        include: { skills: { include: { skill: true } } },
      });
    }

    if (dataTypes.includes('candidates')) {
      exportResult.candidates = await this.prisma.candidate.findMany({
        where: { orgId },
        include: { applications: true },
      });
    }

    if (dataTypes.includes('audit-logs')) {
      exportResult.auditLogs = await this.prisma.auditLog.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    }

    return {
      exportedAt: new Date().toISOString(),
      orgId,
      orgName: org.name,
      dataTypes,
      data: exportResult,
    };
  }

  async getFeatureFlags(orgId: string) {
    const settings = await this.prisma.orgSettings.findUnique({
      where: { orgId },
    });

    const allSettings = (settings?.settings as Record<string, any>) || {};
    const featureFlags = allSettings.featureFlags || {
      aiJdGeneration: true,
      aiInsights: true,
      advancedAnalytics: true,
      bulkCandidateImport: false,
      customPipelineStages: true,
      emailNotifications: true,
      slackIntegration: false,
      apiAccess: false,
    };

    return { orgId, featureFlags };
  }

  async updateFeatureFlags(orgId: string, flags: Record<string, boolean>) {
    const existing = await this.prisma.orgSettings.findUnique({ where: { orgId } });
    const currentSettings = (existing?.settings as Record<string, any>) || {};
    const currentFlags = currentSettings.featureFlags || {};

    const updatedSettings = {
      ...currentSettings,
      featureFlags: { ...currentFlags, ...flags },
    };

    if (existing) {
      await this.prisma.orgSettings.update({
        where: { orgId },
        data: { settings: updatedSettings },
      });
    } else {
      await this.prisma.orgSettings.create({
        data: { orgId, settings: updatedSettings },
      });
    }

    return { orgId, featureFlags: updatedSettings.featureFlags };
  }

  async bulkAction(action: string, params: Record<string, any>) {
    switch (action) {
      case 'close-old-tickets': {
        const daysOld = params.daysOld || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysOld);

        const result = await this.prisma.supportTicket.updateMany({
          where: {
            status: 'RESOLVED',
            resolvedAt: { lte: cutoff },
          },
          data: { status: 'CLOSED', closedAt: new Date() },
        });

        return { action, affected: result.count };
      }

      case 'deactivate-inactive-users': {
        const orgId = params.orgId;
        if (!orgId) throw new BadRequestException('orgId is required');
        const daysInactive = params.daysInactive || 90;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysInactive);

        const result = await this.prisma.user.updateMany({
          where: {
            orgId,
            isActive: true,
            updatedAt: { lte: cutoff },
            role: { notIn: ['ADMIN', 'SUPPORT_REP', 'SUPPORT_ADMIN'] },
          },
          data: { isActive: false },
        });

        return { action, affected: result.count };
      }

      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }
}
