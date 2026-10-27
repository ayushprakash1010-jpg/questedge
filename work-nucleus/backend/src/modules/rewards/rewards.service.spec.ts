import { Test, TestingModule } from '@nestjs/testing';
import { RewardsService, calculateReferralReward } from './rewards.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RewardsService', () => {
  let service: RewardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        {
          provide: PrismaService,
          useValue: {
            rewardTracking: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateReferralReward (P2-03)', () => {
    it('should return exact fixed reward for FIXED reward type', () => {
      const reward = calculateReferralReward({
        referralRewardAmount: 50000,
        referralRewardType: 'FIXED',
      });
      expect(reward).toBe(50000);
    });

    it('should default to FIXED reward if type is not specified', () => {
      const reward = calculateReferralReward({
        referralRewardAmount: 25000,
      });
      expect(reward).toBe(25000);
    });

    it('should calculate percentage reward from actual offered salary', () => {
      // 10% on a 2,000,000 INR salary -> 200,000 INR
      const reward = calculateReferralReward(
        {
          referralRewardAmount: 10,
          referralRewardType: 'PERCENTAGE',
          compensationMin: 1500000,
          compensationMax: 2500000,
        },
        2000000,
      );
      expect(reward).toBe(200000);
    });

    it('should calculate percentage reward from mandate compensation midpoint if actual salary not provided', () => {
      // 10% on midpoint of 1,000,000 and 2,000,000 (1,500,000) -> 150,000 INR
      const reward = calculateReferralReward({
        referralRewardAmount: 10,
        referralRewardType: 'PERCENTAGE',
        compensationMin: 1000000,
        compensationMax: 2000000,
      });
      expect(reward).toBe(150000);
    });

    it('should calculate percentage reward from max compensation if min is missing', () => {
      // 5% on 2,000,000 -> 100,000 INR
      const reward = calculateReferralReward({
        referralRewardAmount: 5,
        referralRewardType: 'PERCENTAGE',
        compensationMax: 2000000,
      });
      expect(reward).toBe(100000);
    });

    it('should clamp percentage rewards to 100% max', () => {
      // 150% clamped to 100% on 1,000,000 -> 1,000,000
      const reward = calculateReferralReward(
        {
          referralRewardAmount: 150,
          referralRewardType: 'PERCENTAGE',
        },
        1000000,
      );
      expect(reward).toBe(1000000);
    });

    it('should return 0 for negative or zero amounts', () => {
      expect(
        calculateReferralReward({ referralRewardAmount: 0 }),
      ).toBe(0);
      expect(
        calculateReferralReward({ referralRewardAmount: -500 }),
      ).toBe(0);
      expect(
        calculateReferralReward({
          referralRewardAmount: -10,
          referralRewardType: 'PERCENTAGE',
        }),
      ).toBe(0);
    });
  });

  describe('P4-05: Reward Disputes & Immutable Audit Trail', () => {
    let mockPrisma: any;
    let mockAuditService: any;
    let mockSecurityService: any;
    let disputeService: RewardsService;

    const baseReward = {
      id: 'rew-123',
      referralId: 'ref-456',
      recruiterId: 'rec-789',
      orgId: 'org-111',
      mandateId: 'man-222',
      rewardAmount: 50000,
      currency: 'INR',
      status: 'PENDING_APPROVAL',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      recruiter: { id: 'rec-789', name: 'Alok Kumar', email: 'alok@test.com', auth0Sub: 'auth0|alok' },
      referral: {
        candidateProfile: { name: 'Rohit Verma', email: 'rohit@test.com' },
        mandate: {
          title: 'Staff Platform Engineer',
          organization: { id: 'org-111', name: 'Acme Corp' },
        },
      },
    };

    beforeEach(() => {
      mockPrisma = {
        rewardTracking: {
          findUnique: jest.fn(),
          update: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
        auditLog: {
          findMany: jest.fn(),
        },
        securityLog: {
          findMany: jest.fn(),
        },
      };

      mockAuditService = {
        log: jest.fn().mockResolvedValue({ id: 'aud-1' }),
      };

      mockSecurityService = {
        append: jest.fn().mockResolvedValue({ id: 'sec-1', hash: 'sha256-hash-val' }),
        verifyChain: jest.fn().mockResolvedValue({ ok: true, brokenAtIndex: -1, total: 5 }),
      };

      disputeService = new RewardsService(
        mockPrisma as any,
        mockAuditService as any,
        mockSecurityService as any,
      );
    });

    it('should successfully raise a dispute and set status to DISPUTED with audit logging', async () => {
      mockPrisma.rewardTracking.findUnique.mockResolvedValue(baseReward);
      mockPrisma.rewardTracking.update.mockResolvedValue({
        ...baseReward,
        status: 'DISPUTED',
      });

      const result = await disputeService.raiseDispute(
        'rew-123',
        { orgId: 'org-111', userId: 'user-admin-1', userType: 'COMPANY_ADMIN' },
        {
          reason: 'CLAWBACK_EARLY_EXIT' as any,
          details: 'Candidate resigned after 35 days within the 90 day guarantee.',
          evidenceUrls: ['https://proof.example.com/resignation.pdf'],
        },
      );

      expect(result).toBeDefined();
      expect(mockPrisma.rewardTracking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rew-123' },
          data: expect.objectContaining({
            status: 'DISPUTED',
          }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REWARD_DISPUTED',
          entityId: 'rew-123',
        }),
      );
      expect(mockSecurityService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-111',
          payload: expect.objectContaining({
            action: 'REWARD_DISPUTE_RAISED',
            rewardId: 'rew-123',
          }),
        }),
      );
    });

    it('should reject raising dispute if reward is already DISPUTED', async () => {
      mockPrisma.rewardTracking.findUnique.mockResolvedValue({
        ...baseReward,
        status: 'DISPUTED',
      });

      await expect(
        disputeService.raiseDispute(
          'rew-123',
          { orgId: 'org-111', userType: 'COMPANY_ADMIN' },
          { reason: 'OTHER' as any, details: 'Duplicate candidate submission.' },
        ),
      ).rejects.toThrow();
    });

    it('should reject if actor belongs to a different organisation', async () => {
      mockPrisma.rewardTracking.findUnique.mockResolvedValue(baseReward);

      await expect(
        disputeService.raiseDispute(
          'rew-123',
          { orgId: 'unauthorized-org', userType: 'COMPANY_ADMIN' },
          { reason: 'OTHER' as any, details: 'Unauthorized attempt' },
        ),
      ).rejects.toThrow('Unauthorized');
    });

    it('should resolve dispute as UPHELD by cancelling the reward', async () => {
      mockPrisma.rewardTracking.findUnique.mockResolvedValue({
        ...baseReward,
        status: 'DISPUTED',
        notes: JSON.stringify({ dispute: { reason: 'CLAWBACK_EARLY_EXIT', status: 'OPEN' } }),
      });
      mockPrisma.rewardTracking.update.mockResolvedValue({
        ...baseReward,
        status: 'CANCELLED',
      });

      const res = await disputeService.resolveDispute(
        'rew-123',
        { userId: 'admin-1', role: 'ADMIN' },
        {
          decision: 'UPHELD' as any,
          resolutionNotes: 'Verified candidate early exit. Reward clawback applied.',
        },
      );

      expect(mockPrisma.rewardTracking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rew-123' },
          data: expect.objectContaining({
            status: 'CANCELLED',
          }),
        }),
      );
      expect(res.disputeResolution.decision).toBe('UPHELD');
    });

    it('should resolve dispute as REJECTED by restoring reward to APPROVED', async () => {
      mockPrisma.rewardTracking.findUnique.mockResolvedValue({
        ...baseReward,
        status: 'DISPUTED',
      });
      mockPrisma.rewardTracking.update.mockResolvedValue({
        ...baseReward,
        status: 'APPROVED',
      });

      await disputeService.resolveDispute(
        'rew-123',
        { userId: 'admin-1', role: 'ADMIN' },
        {
          decision: 'REJECTED' as any,
          resolutionNotes: 'Ownership verified. Dispute dismissed.',
        },
      );

      expect(mockPrisma.rewardTracking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        }),
      );
    });

    it('should resolve dispute as SETTLED with custom settlement amount', async () => {
      mockPrisma.rewardTracking.findUnique.mockResolvedValue({
        ...baseReward,
        status: 'DISPUTED',
      });
      mockPrisma.rewardTracking.update.mockResolvedValue({
        ...baseReward,
        status: 'APPROVED',
        rewardAmount: 30000,
      });

      await disputeService.resolveDispute(
        'rew-123',
        { userId: 'admin-1', role: 'ADMIN' },
        {
          decision: 'SETTLED' as any,
          resolutionNotes: 'Mutual 60% settlement agreed.',
          settlementAmount: 30000,
        },
      );

      expect(mockPrisma.rewardTracking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            rewardAmount: 30000,
          }),
        }),
      );
    });

    it('should get complete cryptographic audit trail with verified SHA-256 chain integrity', async () => {
      mockPrisma.rewardTracking.findUnique.mockResolvedValue({
        ...baseReward,
        notes: JSON.stringify({
          dispute: { reason: 'CLAWBACK_EARLY_EXIT', status: 'RESOLVED' },
          history: [{ action: 'DISPUTE_RAISED', timestamp: '2026-10-27T00:00:00Z' }],
        }),
      });

      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'aud-1', action: 'REWARD_DISPUTED', entityId: 'rew-123' },
      ]);

      mockPrisma.securityLog.findMany.mockResolvedValue([
        {
          id: 'sec-1',
          eventType: 'CONFIG_CHANGED',
          hash: 'hash-1',
          prevHash: null,
          createdAt: new Date(),
          payload: { rewardId: 'rew-123', action: 'REWARD_DISPUTE_RAISED' },
        },
      ]);

      const auditTrail = await disputeService.getRewardAuditTrail('rew-123');

      expect(auditTrail).toBeDefined();
      expect(auditTrail.securityChain.isTamperEvident).toBe(true);
      expect(auditTrail.securityChain.chainIntact).toBe(true);
      expect(auditTrail.securityChain.totalOrgBlocksVerified).toBe(5);
      expect(auditTrail.securityChain.entries.length).toBe(1);
      expect(auditTrail.auditLogs.length).toBe(1);
    });
  });
});

