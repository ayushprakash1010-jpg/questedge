import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { DecisionsService } from '../decisions/decisions.service';
import { Auth0ManagementService } from '../../auth/auth0-management.service';

describe('Phase 3 OrgSettings Enforcement & Auth0 Invite Email', () => {
  describe('SettingsService validation & auditing', () => {
    const mockPrisma = {
      orgSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const mockAudit = { logSafe: jest.fn() };
    let service: SettingsService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new SettingsService(mockPrisma as any, mockAudit as any);
    });

    it('rejects scoringWeights that do not sum to 100', async () => {
      await expect(
        service.update('org-1', {
          scoringWeights: { technical: 50, leadership: 10, behavioural: 10, communication: 10 },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.orgSettings.update).not.toHaveBeenCalled();
    });

    it('rejects unknown setting keys', async () => {
      await expect(
        service.update('org-1', { arbitraryFlag: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists valid settings and writes an audit log', async () => {
      mockPrisma.orgSettings.findUnique.mockResolvedValue({
        id: 'set-1',
        orgId: 'org-1',
        settings: { maxInterviewRounds: 6, approvalWorkflowEnabled: false },
      });
      mockPrisma.orgSettings.update.mockResolvedValue({
        id: 'set-1',
        orgId: 'org-1',
        settings: { maxInterviewRounds: 4, approvalWorkflowEnabled: true },
      });

      await service.update(
        'org-1',
        { maxInterviewRounds: 4, approvalWorkflowEnabled: true },
        'admin-1',
      );

      expect(mockPrisma.orgSettings.update).toHaveBeenCalled();
      expect(mockAudit.logSafe).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-1',
          userId: 'admin-1',
          action: 'SETTINGS_UPDATED',
          entityType: 'ORG_SETTINGS',
        }),
      );
    });
  });

  describe('PipelineService maxInterviewRounds enforcement', () => {
    const mockPrisma = {
      hiringPlan: { findFirst: jest.fn() },
      orgSettings: { findUnique: jest.fn() },
      pipelineStage: { count: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    };
    let service: PipelineService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new PipelineService(mockPrisma as any);
    });

    it('blocks creating a stage when maxInterviewRounds is reached', async () => {
      mockPrisma.hiringPlan.findFirst.mockResolvedValue({ id: 'plan-1', orgId: 'org-1' });
      mockPrisma.orgSettings.findUnique.mockResolvedValue({
        settings: { maxInterviewRounds: 3 },
      });
      mockPrisma.pipelineStage.count.mockResolvedValue(3);

      await expect(
        service.createStage('plan-1', { name: 'Round 4', stageType: 'TECHNICAL' as any }, 'org-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.pipelineStage.create).not.toHaveBeenCalled();
    });
  });

  describe('DecisionsService approvalWorkflowEnabled enforcement', () => {
    const mockPrisma = {
      selectionDecision: { findFirst: jest.fn(), update: jest.fn() },
      orgSettings: { findUnique: jest.fn() },
    };
    const mockConfig = { get: jest.fn() };
    let service: DecisionsService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new DecisionsService(mockPrisma as any, mockConfig as any);
    });

    it('blocks markCommunicationSent when approvalWorkflowEnabled is true and unapproved', async () => {
      mockPrisma.selectionDecision.findFirst.mockResolvedValue({
        id: 'dec-1',
        approvedById: null,
        application: { hiringPlan: { orgId: 'org-1' } },
      });
      mockPrisma.orgSettings.findUnique.mockResolvedValue({
        settings: { approvalWorkflowEnabled: true },
      });

      await expect(service.markCommunicationSent('app-1', 'org-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.selectionDecision.update).not.toHaveBeenCalled();
    });

    it('allows markCommunicationSent after decision is approved', async () => {
      mockPrisma.selectionDecision.findFirst.mockResolvedValue({
        id: 'dec-1',
        approvedById: 'hr-1',
        application: { hiringPlan: { orgId: 'org-1' } },
      });
      mockPrisma.orgSettings.findUnique.mockResolvedValue({
        settings: { approvalWorkflowEnabled: true },
      });
      mockPrisma.selectionDecision.update.mockResolvedValue({
        id: 'dec-1',
        communicationSent: true,
      });

      const res = await service.markCommunicationSent('app-1', 'org-1');
      expect(res.communicationSent).toBe(true);
    });
  });

  describe('Auth0ManagementService invite email delivery', () => {
    it('dispatches invite email with Auth0 password ticket URL and tolerates email failures', async () => {
      const mockConfig = {
        get: jest.fn((k: string) =>
          k === 'FRONTEND_URL' ? 'https://app.questedge.in' : undefined,
        ),
      };
      const mockEmail = {
        sendNotificationEmail: jest.fn().mockResolvedValue(true),
      };
      const service = new Auth0ManagementService(
        mockConfig as any,
        mockEmail as any,
      );
      (service as any).management = {
        users: {
          create: jest.fn().mockResolvedValue({ data: { user_id: 'auth0|new-user' } }),
        },
        tickets: {
          changePassword: jest.fn().mockResolvedValue({
            data: { ticket: 'https://auth.questedge.in/lo/reset?ticket=abc' },
          }),
        },
      };

      const sub = await service.createUser('new@company.com', 'Priya');
      expect(sub).toBe('auth0|new-user');
      expect(mockEmail.sendNotificationEmail).toHaveBeenCalledWith(
        'new@company.com',
        'You have been invited to QuestEdge',
        expect.stringContaining('Priya'),
        'https://auth.questedge.in/lo/reset?ticket=abc',
      );

      // Should not throw even if email delivery fails
      mockEmail.sendNotificationEmail.mockRejectedValueOnce(new Error('SMTP down'));
      await expect(
        service.createUser('new2@company.com', 'Rohan'),
      ).resolves.toBe('auth0|new-user');
    });
  });
});
