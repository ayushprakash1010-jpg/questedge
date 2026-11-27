import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ALLOWED_SETTING_KEYS = new Set([
  'scoringWeights',
  'defaultPipelineStages',
  'notificationPreferences',
  'approvalWorkflowEnabled',
  'maxInterviewRounds',
  'autoTriggerBgvOnOfferAccept',
  'bgvProvider',
]);

const DEFAULT_SETTINGS = {
  scoringWeights: {
    technical: 40,
    leadership: 25,
    behavioural: 20,
    communication: 15,
  },
  defaultPipelineStages: [
    'Resume Screening',
    'Phone Screen',
    'Technical Round',
    'HR Round',
    'Leadership Round',
    'Offer',
  ],
  notificationPreferences: {
    feedbackSubmitted: true,
    feedbackPending: true,
    decisionMade: true,
    candidateAdded: true,
    jdApproved: true,
    stageSlaWarning: true,
    planCompleted: true,
  },
  approvalWorkflowEnabled: false,
  autoTriggerBgvOnOfferAccept: false,
  maxInterviewRounds: 6,
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  async get(orgId: string) {
    let settings = await this.prisma.orgSettings.findUnique({
      where: { orgId },
    });

    if (!settings) {
      settings = await this.prisma.orgSettings.create({
        data: { orgId, settings: DEFAULT_SETTINGS },
      });
    }

    return settings;
  }

  async update(
    orgId: string,
    updates: Record<string, any>,
    actorUserId?: string,
  ) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw new BadRequestException('Settings payload must be a JSON object');
    }

    const filtered: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (!ALLOWED_SETTING_KEYS.has(key)) {
        throw new BadRequestException(`Unsupported setting key: ${key}`);
      }
      filtered[key] = updates[key];
    }

    if (filtered.scoringWeights !== undefined) {
      const w = filtered.scoringWeights;
      if (!w || typeof w !== 'object' || Array.isArray(w)) {
        throw new BadRequestException('scoringWeights must be an object');
      }
      const vals = Object.values(w);
      if (
        vals.length === 0 ||
        vals.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0)
      ) {
        throw new BadRequestException(
          'scoringWeights values must be non-negative numbers',
        );
      }
      const sum = vals.reduce<number>(
        (acc, v) => acc + Number(v),
        0,
      );
      if (Math.round(sum) !== 100) {
        throw new BadRequestException(
          `scoringWeights must sum to 100 (received ${sum})`,
        );
      }
    }

    if (filtered.maxInterviewRounds !== undefined) {
      const rounds = Number(filtered.maxInterviewRounds);
      if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) {
        throw new BadRequestException(
          'maxInterviewRounds must be an integer between 1 and 20',
        );
      }
      filtered.maxInterviewRounds = rounds;
    }

    if (
      filtered.approvalWorkflowEnabled !== undefined &&
      typeof filtered.approvalWorkflowEnabled !== 'boolean'
    ) {
      throw new BadRequestException(
        'approvalWorkflowEnabled must be a boolean',
      );
    }

    if (
      filtered.autoTriggerBgvOnOfferAccept !== undefined &&
      typeof filtered.autoTriggerBgvOnOfferAccept !== 'boolean'
    ) {
      throw new BadRequestException(
        'autoTriggerBgvOnOfferAccept must be a boolean',
      );
    }

    if (filtered.bgvProvider !== undefined) {
      const normalized = String(filtered.bgvProvider).trim().toLowerCase();
      if (!['authbridge', 'ongrid', 'idfy'].includes(normalized)) {
        throw new BadRequestException(
          'bgvProvider must be one of authbridge, ongrid, or idfy',
        );
      }
      filtered.bgvProvider = normalized;
    }

    if (filtered.notificationPreferences !== undefined) {
      const prefs = filtered.notificationPreferences;
      if (
        !prefs ||
        typeof prefs !== 'object' ||
        Array.isArray(prefs) ||
        Object.values(prefs).some((v) => typeof v !== 'boolean')
      ) {
        throw new BadRequestException(
          'notificationPreferences must be a boolean map',
        );
      }
    }

    if (filtered.defaultPipelineStages !== undefined) {
      if (
        !Array.isArray(filtered.defaultPipelineStages) ||
        filtered.defaultPipelineStages.length === 0 ||
        filtered.defaultPipelineStages.some(
          (s: unknown) => typeof s !== 'string' || !s.trim(),
        )
      ) {
        throw new BadRequestException(
          'defaultPipelineStages must be a non-empty array of strings',
        );
      }
    }

    const current = await this.get(orgId);
    const merged = { ...(current.settings as any), ...filtered };

    const updated = await this.prisma.orgSettings.update({
      where: { orgId },
      data: { settings: merged },
    });

    await this.audit?.logSafe({
      orgId,
      userId: actorUserId,
      action: 'SETTINGS_UPDATED',
      entityType: 'ORG_SETTINGS',
      entityId: updated.id,
      changes: filtered,
    });

    return updated;
  }
}
