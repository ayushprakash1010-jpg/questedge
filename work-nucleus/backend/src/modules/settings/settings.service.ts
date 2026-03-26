import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  maxInterviewRounds: 6,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async update(orgId: string, updates: Record<string, any>) {
    const current = await this.get(orgId);
    const merged = { ...(current.settings as any), ...updates };

    return this.prisma.orgSettings.update({
      where: { orgId },
      data: { settings: merged },
    });
  }
}
