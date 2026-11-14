import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getValidOrgId(actorId?: string, targetOrgId?: string): Promise<string> {
    if (targetOrgId) return targetOrgId;
    if (actorId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: { orgId: true },
      });
      if (actor?.orgId) return actor.orgId;
    }
    const fallbackOrg = await this.prisma.organization.findFirst({
      select: { id: true },
    });
    if (!fallbackOrg) throw new Error('No valid organization found for audit trail');
    return fallbackOrg.id;
  }

  async exportData(orgId: string, dataTypes: string[], actorId?: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const exportResult: Record<string, any> = { organization: org };

    if (dataTypes.includes('users')) {
      exportResult.users = await this.prisma.user.findMany({
        where: { orgId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
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

    if (actorId) {
      await this.audit
        .log({
          orgId,
          userId: actorId,
          action: 'DATA_EXPORTED',
          entityType: 'ORGANIZATION',
          entityId: orgId,
          changes: { dataTypes },
        })
        .catch(() => null);
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

  async updateFeatureFlags(
    orgId: string,
    flags: Record<string, boolean>,
    actorId?: string,
  ) {
    const existing = await this.prisma.orgSettings.findUnique({
      where: { orgId },
    });
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

    if (actorId) {
      await this.audit
        .log({
          orgId,
          userId: actorId,
          action: 'FEATURE_FLAGS_UPDATED',
          entityType: 'ORG_SETTINGS',
          entityId: orgId,
          changes: { updatedFlags: flags },
        })
        .catch(() => null);
    }

    return { orgId, featureFlags: updatedSettings.featureFlags };
  }

  async bulkAction(
    action: string,
    params: Record<string, any>,
    actorId?: string,
    reason?: string,
  ) {
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

        if (actorId) {
          const auditOrgId = await this.getValidOrgId(actorId);
          await this.audit
            .log({
              orgId: auditOrgId,
              userId: actorId,
              action: 'BULK_CLOSE_OLD_TICKETS',
              entityType: 'SUPPORT_TICKET',
              changes: {
                affected: result.count,
                daysOld,
                reason: reason || 'Automated bulk resolution closure',
              },
            })
            .catch(() => null);
        }

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

        if (actorId) {
          await this.audit
            .log({
              orgId,
              userId: actorId,
              action: 'BULK_DEACTIVATE_INACTIVE_USERS',
              entityType: 'USER',
              changes: {
                affected: result.count,
                daysInactive,
                reason: reason || 'Bulk inactive user deactivation',
              },
            })
            .catch(() => null);
        }

        return { action, affected: result.count };
      }

      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }
}
