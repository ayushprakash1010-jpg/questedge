import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiMatchingService } from './ai-matching.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AiMatchingService', () => {
  let service: AiMatchingService;
  let prisma: any;
  let config: any;

  const mockCandidate = {
    id: 'candidate-uuid-1',
    name: 'Alice Developer',
    headline: 'Senior Full Stack Engineer',
    currentDesignation: 'Senior Software Engineer',
    currentCompany: 'Tech Corp',
    experienceYears: 6,
    skills: ['TypeScript', 'React.js', 'Node.js', 'NestJS', 'PostgreSQL', 'Docker'],
    currentLocation: 'Bengaluru',
    workModel: 'Hybrid',
    noticePeriodDays: 30,
    expectedCtc: 3200000,
    updatedAt: new Date('2026-01-01'),
  };

  const mockMandate = {
    id: 'mandate-uuid-1',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    requiredExperience: '5-8 years',
    mandatorySkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    preferredSkills: ['Docker', 'AWS'],
    workModel: 'Hybrid',
    location: 'Bengaluru',
    noticePeriodPref: '30 days',
    compensationMax: 3500000,
    updatedAt: new Date('2026-01-01'),
    organization: { id: 'org-uuid-1', name: 'Acme Software' },
  };

  beforeEach(async () => {
    prisma = {
      candidateProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      mandate: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      referral: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    config = {
      get: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') return null; // Test deterministic engine
        if (key === 'GEMINI_MODEL') return 'gemini-flash-latest';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMatchingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AiMatchingService>(AiMatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateCandidateAgainstMandate (Deterministic)', () => {
    it('should compute high match score and STRONG_MATCH verdict for well-aligned candidate', async () => {
      const result = await service.evaluateCandidateAgainstMandate(mockCandidate, mockMandate);

      expect(result).toBeDefined();
      expect(result.matchScore).toBeGreaterThanOrEqual(80);
      expect(result.verdict).toBe('STRONG_MATCH');
      expect(result.scoreBreakdown.skillsFit).toBeGreaterThanOrEqual(30);
      expect(result.scoreBreakdown.experienceFit).toBe(25);
      expect(result.matchedSkills).toContain('TypeScript');
      expect(result.matchedSkills).toContain('React');
      expect(result.matchedSkills).toContain('PostgreSQL');
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.isAiGenerated).toBe(false);
    });

    it('should penalize missing mandatory skills and lower experience', async () => {
      const weakCandidate = {
        id: 'candidate-uuid-weak',
        name: 'Junior Marketer',
        headline: 'Marketing Specialist',
        currentDesignation: 'Marketing Associate',
        experienceYears: 1,
        skills: ['SEO', 'Content Writing'],
        noticePeriodDays: 90,
        expectedCtc: 4000000,
        updatedAt: new Date('2026-01-01'),
      };

      const result = await service.evaluateCandidateAgainstMandate(weakCandidate, mockMandate);

      expect(result.matchScore).toBeLessThan(60);
      expect(result.verdict).toMatch(/POTENTIAL_MATCH|LOW_FIT/);
      expect(result.missingSkills).toContain('TypeScript');
      expect(result.gaps.some((g) => g.includes('Missing mandatory'))).toBe(true);
      expect(result.gaps.some((g) => g.includes('Experience gap'))).toBe(true);
    });

    it('should cache results when called repeatedly with unchanged timestamps', async () => {
      const first = await service.evaluateCandidateAgainstMandate(mockCandidate, mockMandate);
      const second = await service.evaluateCandidateAgainstMandate(mockCandidate, mockMandate);

      expect(second).toBe(first); // Reference equality from in-memory cache
    });
  });

  describe('preflightCheck', () => {
    it('should evaluate candidate from DTO data against mandate', async () => {
      prisma.mandate.findUnique.mockResolvedValue(mockMandate);

      const result = await service.preflightCheck({
        mandateId: 'mandate-uuid-1',
        candidateName: 'Bob Builder',
        skills: ['TypeScript', 'React.js'],
        experienceYears: 5,
        noticePeriodDays: 15,
      });

      expect(result).toBeDefined();
      expect(result.matchScore).toBeGreaterThanOrEqual(65);
      expect(result.matchedSkills).toContain('TypeScript');
    });
  });

  describe('syncReferralMatchScore', () => {
    it('should evaluate and persist match score to referral record', async () => {
      const mockReferral = {
        id: 'ref-1',
        mandate: mockMandate,
        candidateProfile: mockCandidate,
      };
      prisma.referral.findUnique.mockResolvedValue(mockReferral);
      prisma.referral.update.mockResolvedValue({
        id: 'ref-1',
        aiMatchScore: 88,
        aiMatchSummary: 'Strong match for role',
      });

      const res = await service.syncReferralMatchScore('ref-1');

      expect(prisma.referral.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ref-1' },
          data: expect.objectContaining({
            aiMatchScore: expect.any(Number),
            aiMatchSummary: expect.any(String),
          }),
        }),
      );
      expect(res.referralId).toBe('ref-1');
    });
  });

  describe('getRecommendationsForCandidate', () => {
    it('should return active mandates ranked by match score', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(mockCandidate);
      prisma.mandate.findMany.mockResolvedValue([
        mockMandate,
        {
          ...mockMandate,
          id: 'mandate-unrelated',
          title: 'Graphic Designer',
          department: 'Creative',
          mandatorySkills: ['Figma', 'Photoshop'],
          preferredSkills: [],
          requiredExperience: '2 years',
          updatedAt: new Date('2026-01-01'),
        },
      ]);

      const recommendations = await service.getRecommendationsForCandidate(
        'candidate-uuid-1',
        5,
      );

      expect(recommendations.length).toBe(2);
      expect(recommendations[0].mandate.id).toBe('mandate-uuid-1');
      expect(recommendations[0].match.matchScore).toBeGreaterThan(
        recommendations[1].match.matchScore,
      );
    });
  });
});
