import { Test, TestingModule } from '@nestjs/testing';
import { RecruiterService } from './recruiter.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';


describe('RecruiterService', () => {
  let service: RecruiterService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      recruiterProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      referral: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      mandateParticipation: {
        findMany: jest.fn(),
      },
      rewardTracking: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<RecruiterService>(RecruiterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('P4-01: computeTrustScore & Trust Profile', () => {
    const mockProfile = {
      id: 'rec-1',
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+919876543210',
      headline: 'Executive Tech Recruiter',
      bio: 'Over 8 years placing top engineering talent',
      portfolioUrl: 'https://priya.recruits',
      avatarUrl: 'https://priya.recruits/pic.jpg',
      specializations: ['Fullstack', 'DevOps'],
      experienceYears: 8,
      linkedinUrl: 'https://linkedin.com/in/priya',
      isVerified: true,
      verifiedAt: new Date(),
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago (~12 months)
      isActive: true,
    };

    it('should compute weighted trust score and tier for a verified recruiter', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(mockProfile);
      // Hired count = 25 (placement score: (25/50)*100 = 50)
      // Total refs = 30, consented = 27 (consent rate: 90%)
      prisma.referral.count
        .mockResolvedValueOnce(25) // hiredCount
        .mockResolvedValueOnce(30) // totalRefs
        .mockResolvedValueOnce(27); // consentedRefs

      const result = await service.computeTrustScore('rec-1');

      expect(result).toBeDefined();
      expect(result.tier).toBe('GOLD'); // weighted score should be >= 60
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.breakdown.placements.hiredCount).toBe(25);
      expect(result.breakdown.verified.isVerified).toBe(true);
      expect(result.breakdown.verified.score).toBe(100);
      expect(result.breakdown.consentRate.rate).toBe(90);
    });

    it('should return UNVERIFIED tier if recruiter is not verified', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        isVerified: false,
      });
      prisma.referral.count
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(45);

      const result = await service.computeTrustScore('rec-1');
      expect(result.tier).toBe('UNVERIFIED');
      expect(result.breakdown.verified.isVerified).toBe(false);
      expect(result.breakdown.verified.score).toBe(0);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(null);
      await expect(service.computeTrustScore('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject verification request if recruiter is already verified', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue(mockProfile);
      await expect(
        service.submitVerificationRequest('rec-1', {
          statement: 'I have 10 years of experience with senior leadership placements',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should accept verification request and update recruiter profile', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        isVerified: false,
      });
      prisma.recruiterProfile.update.mockResolvedValue({
        ...mockProfile,
        isVerified: false,
      });

      const res = await service.submitVerificationRequest('rec-1', {
        statement: '10 years of experience with senior leadership placements',
        linkedinUrl: 'https://linkedin.com/in/priya',
      });

      expect(res).toBeDefined();
      expect(prisma.recruiterProfile.update).toHaveBeenCalled();
    });

    it('should approve verification and set isVerified true on admin review', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        isVerified: false,
      });
      prisma.recruiterProfile.update.mockResolvedValue({
        ...mockProfile,
        isVerified: true,
      });

      const res = await service.reviewVerification('rec-1', 'APPROVED', 'Verified credentials');
      expect(prisma.recruiterProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-1' },
          data: expect.objectContaining({ isVerified: true }),
        }),
      );
    });

    it('should reject verification request without mutating isVerified', async () => {
      prisma.recruiterProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        isVerified: false,
      });

      const res = await service.reviewVerification('rec-1', 'REJECTED', 'Insufficient placement proofs');
      expect((res as any).reviewDecision).toBe('REJECTED');
      expect(prisma.recruiterProfile.update).not.toHaveBeenCalled();
    });
  });
});

