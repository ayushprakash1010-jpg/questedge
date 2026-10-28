import { Test, TestingModule } from '@nestjs/testing';
import { HireDetectionService } from './hire-detection.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../comms/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';
import { StatusCheckResponse, BypassRiskLevel, TrustLevel } from '@prisma/client';

describe('HireDetectionService', () => {
  let service: HireDetectionService;
  let prisma: any;
  let emailService: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      mandate: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      referral: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      hireBypassFlag: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'flag-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      candidateStatusCheck: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'check-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      companyTrustScore: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      organization: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    emailService = {
      sendCandidateStatusCheckEmail: jest.fn().mockResolvedValue(undefined),
    };

    notifications = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HireDetectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<HireDetectionService>(HireDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onMandateStatusChange', () => {
    it('should dispatch check-ins when mandate is marked FILLED', async () => {
      prisma.referral.findMany.mockResolvedValue([
        {
          id: 'ref-1',
          candidateProfileId: 'cand-1',
          mandateId: 'mandate-1',
          mandate: { title: 'Lead Architect', organization: { name: 'Acme Corp' } },
          candidateProfile: { name: 'Alice Dev', email: 'alice@example.com' },
          statusChecks: [],
        },
      ]);

      await service.onMandateStatusChange('mandate-1', 'FILLED');

      expect(prisma.candidateStatusCheck.create).toHaveBeenCalled();
      expect(emailService.sendCandidateStatusCheckEmail).toHaveBeenCalled();
    });

    it('should ignore mandates when status is not FILLED or CLOSED', async () => {
      await service.onMandateStatusChange('mandate-1', 'ACTIVE');
      expect(prisma.referral.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getStatusCheckByToken', () => {
    it('should throw NotFoundException if token does not exist', async () => {
      prisma.candidateStatusCheck.findUnique.mockResolvedValue(null);
      await expect(service.getStatusCheckByToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return sanitized check data for a valid token', async () => {
      prisma.candidateStatusCheck.findUnique.mockResolvedValue({
        id: 'check-1',
        question: 'Did you get hired?',
        response: null,
        expiresAt: new Date(Date.now() + 86400000),
        candidateProfile: { name: 'Alice' },
        referral: {
          mandate: {
            title: 'Senior Engineer',
            organization: { name: 'Tech Co' },
          },
        },
      });

      const res = await service.getStatusCheckByToken('valid-token');
      expect(res.candidateName).toBe('Alice');
      expect(res.companyName).toBe('Tech Co');
      expect(res.hasResponded).toBe(false);
    });
  });

  describe('processCandidateResponse', () => {
    it('should update check and flag critical risk if candidate reports HIRED', async () => {
      prisma.candidateStatusCheck.findUnique.mockResolvedValue({
        id: 'check-1',
        referralId: 'ref-1',
        response: null,
        expiresAt: new Date(Date.now() + 86400000),
        candidateProfile: { name: 'Alice' },
        referral: {
          id: 'ref-1',
          mandateId: 'mandate-1',
          status: 'ACTIVATED',
          mandate: { id: 'mandate-1', orgId: 'org-1', title: 'Senior Engineer' },
        },
      });

      const res = await service.processCandidateResponse(
        'valid-token',
        StatusCheckResponse.HIRED,
        'Joined two weeks ago',
      );

      expect(res.success).toBe(true);
      expect(prisma.candidateStatusCheck.update).toHaveBeenCalled();
      expect(prisma.hireBypassFlag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            riskLevel: BypassRiskLevel.CRITICAL,
          }),
        }),
      );
    });
  });
});

