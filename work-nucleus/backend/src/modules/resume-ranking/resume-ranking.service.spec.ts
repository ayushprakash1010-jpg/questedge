import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ResumeRankingService } from './resume-ranking.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ResumeRankingService', () => {
  let service: ResumeRankingService;
  let prisma: any;
  let config: any;

  const mockMandate = {
    id: 'mandate-123',
    orgId: 'org-123',
    title: 'Senior Full Stack Developer',
    department: 'Engineering',
    requiredExperience: '5-8 years',
    mandatorySkills: ['React', 'Node.js', 'PostgreSQL'],
    preferredSkills: ['AWS', 'Docker'],
    educationRequirement: 'Bachelor in Computer Science',
    workModel: 'Hybrid',
    location: 'Bengaluru',
  };

  beforeEach(async () => {
    prisma = {
      mandate: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      candidate: {
        findMany: jest.fn(),
      },
      candidateProfile: {
        findMany: jest.fn(),
      },
      referral: {
        findMany: jest.fn(),
      },
      rankingSession: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'session-123', ...data }),
          ),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      rankedCandidate: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    config = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'GEMINI_API_KEY') return 'test-gemini-key';
        if (key === 'GEMINI_MODEL') return 'gemini-flash-lite-latest';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeRankingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<ResumeRankingService>(ResumeRankingService);
  });

  describe('Tenant Scoping & Mandate Verification', () => {
    it('should throw NotFoundException if mandate does not belong to organization', async () => {
      prisma.mandate.findFirst.mockResolvedValue(null);

      await expect(
        service.rankResumes('org-hacker', 'user-1', {
          mandateId: 'mandate-123',
          candidateIds: ['cand-1'],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.mandate.findFirst).toHaveBeenCalledWith({
        where: { id: 'mandate-123', orgId: 'org-hacker' },
      });
    });

    it('should strictly scope CandidateProfile and Referral lookups to org and mandate', async () => {
      prisma.mandate.findFirst.mockResolvedValue(mockMandate);
      prisma.candidate.findMany.mockResolvedValue([]);
      prisma.candidateProfile.findMany.mockResolvedValue([]);
      prisma.referral.findMany.mockResolvedValue([]);

      await expect(
        service.rankResumes('org-123', 'user-1', {
          mandateId: 'mandate-123',
          candidateIds: ['cand-foreign-1'],
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify Candidate lookup includes orgId and mandate scoping
      expect(prisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['cand-foreign-1'] },
            orgId: 'org-123',
            applications: {
              some: {
                OR: [
                  { mandateId: 'mandate-123' },
                  { hiringPlanId: 'mandate-123' },
                ],
              },
            },
          },
        }),
      );

      // Verify CandidateProfile lookup includes mandate and org scoping via applications or referrals
      expect(prisma.candidateProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['cand-foreign-1'] },
            OR: expect.arrayContaining([
              expect.objectContaining({
                applications: expect.objectContaining({
                  some: {
                    OR: [
                      { mandateId: 'mandate-123' },
                      { hiringPlanId: 'mandate-123' },
                    ],
                  },
                }),
              }),
              expect.objectContaining({
                referrals: expect.objectContaining({
                  some: {
                    mandate: { id: 'mandate-123', orgId: 'org-123' },
                  },
                }),
              }),
            ]),
          }),
        }),
      );

      // Verify Referral lookup includes mandate and org scoping
      expect(prisma.referral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['cand-foreign-1'] },
            mandate: { id: 'mandate-123', orgId: 'org-123' },
          },
        }),
      );
    });
  });

  describe('Dimension Score Recalculation & Verdict Derivation', () => {
    it('recalculates totalScore from dimension sum and derives verdict and sorted ranks', () => {
      const rawAiResponse = {
        rankings: [
          {
            candidateId: 'cand-2',
            candidateName: 'Kavita Patel',
            // LLM provided inconsistent total of 77, but sum is 19+16+12+8+8+7+4+5 = 79
            totalScore: 77,
            verdict: 'PARTIAL_FIT',
            scoreBreakdown: {
              skillsMatch: { score: 19, maxScore: 25 },
              experienceRelevance: { score: 16, maxScore: 20 },
              projectRelevance: { score: 12, maxScore: 15 },
              educationCertifications: { score: 8, maxScore: 10 },
              domainIndustryFit: { score: 8, maxScore: 10 },
              roleSeniorityFit: { score: 7, maxScore: 10 },
              culturalSoftSignals: { score: 4, maxScore: 5 },
              logisticsAvailability: { score: 5, maxScore: 5 },
            },
            strengths: ['Strong React'],
            gaps: ['Python instead of Node.js'],
          },
          {
            candidateId: 'cand-1',
            candidateName: 'Arjun Mehta',
            // LLM provided inconsistent total of 92, but sum is 24+19+14+9+9+9+4+5 = 93
            totalScore: 92,
            verdict: 'STRONG_FIT',
            scoreBreakdown: {
              skillsMatch: { score: 24, maxScore: 25 },
              experienceRelevance: { score: 19, maxScore: 20 },
              projectRelevance: { score: 14, maxScore: 15 },
              educationCertifications: { score: 9, maxScore: 10 },
              domainIndustryFit: { score: 9, maxScore: 10 },
              roleSeniorityFit: { score: 9, maxScore: 10 },
              culturalSoftSignals: { score: 4, maxScore: 5 },
              logisticsAvailability: { score: 5, maxScore: 5 },
            },
            strengths: ['Full stack React and Node.js'],
            gaps: [],
          },
        ],
      };

      const sanitized = (service as any).sanitizeRankingResults(
        rawAiResponse,
        'test-session-123',
      );

      expect(Array.isArray(sanitized)).toBe(true);
      expect(sanitized).toHaveLength(2);

      const arjun = sanitized.find((r: any) => r.candidateId === 'cand-1');
      const kavita = sanitized.find((r: any) => r.candidateId === 'cand-2');

      // Arjun's score should be recalculated from sum: 24+19+14+9+9+9+4+5 = 93
      expect(Number(arjun.totalScore)).toBe(93);
      // Arjun's verdict should be re-derived: >= 85 is EXCELLENT_FIT
      expect(arjun.verdict).toBe('EXCELLENT_FIT');
      expect(arjun.rank).toBe(1);

      // Kavita's score should be recalculated from sum: 19+16+12+8+8+7+4+5 = 79
      expect(Number(kavita.totalScore)).toBe(79);
      // Kavita's verdict should be re-derived: >= 70 is STRONG_FIT
      expect(kavita.verdict).toBe('STRONG_FIT');
      expect(kavita.rank).toBe(2);

      // Must be properly sorted descending
      expect(sanitized[0].candidateId).toBe('cand-1');
      expect(sanitized[1].candidateId).toBe('cand-2');
    });

    it('clamps dimension scores exceeding their maxScore and populates missing dimensions', () => {
      const rawAiResponse = {
        rankings: [
          {
            candidateId: 'cand-overflow',
            candidateName: 'Test Overflow',
            totalScore: 120, // Erroneous total
            verdict: 'EXCELLENT_FIT',
            scoreBreakdown: {
              skillsMatch: { score: 35, maxScore: 25 }, // Exceeds max 25
              experienceRelevance: { score: 25, maxScore: 20 }, // Exceeds max 20
              // Other 6 dimensions omitted by LLM
            },
            strengths: ['Great skills'],
            gaps: [],
          },
        ],
      };

      const sanitized = (service as any).sanitizeRankingResults(
        rawAiResponse,
        'test-session-clamped',
      );

      expect(sanitized).toHaveLength(1);
      const cand = sanitized[0];
      const breakdown = cand.scoreBreakdown as any;

      // skillsMatch must be clamped to 25
      expect(breakdown.skillsMatch.score).toBe(25);
      expect(breakdown.skillsMatch.maxScore).toBe(25);

      // experienceRelevance must be clamped to 20
      expect(breakdown.experienceRelevance.score).toBe(20);
      expect(breakdown.experienceRelevance.maxScore).toBe(20);

      // Missing dimensions must default cleanly with score 0
      expect(breakdown.projectRelevance.score).toBe(0);
      expect(breakdown.projectRelevance.maxScore).toBe(15);
      expect(breakdown.logisticsAvailability.score).toBe(0);
      expect(breakdown.logisticsAvailability.maxScore).toBe(5);

      // Total must equal the clamped sum: 25 + 20 + 0 + ... = 45
      expect(Number(cand.totalScore)).toBe(45);
      // Under calibrated thresholds (85+, 70-84, 55-69, <55), score 45 is WEAK_FIT (<55)
      expect(cand.verdict).toBe('WEAK_FIT');
    });
  });

  describe('Quick Rank Candidate ID Preservation', () => {
    it('preserves client-provided candidateId throughout ranking', async () => {
      jest
        .spyOn(service as any, 'callAiWithRetry')
        .mockImplementation(async (payload: any) => ({
          summary: 'Strong candidate pool',
          rankings: payload.candidates.map((c: any) => ({
            candidateId: c.candidateId,
            candidateName: c.candidateName,
            totalScore: 88,
            verdict: 'EXCELLENT_FIT',
            scoreBreakdown: {
              skillsMatch: { score: 22, maxScore: 25 },
              experienceRelevance: { score: 18, maxScore: 20 },
              projectRelevance: { score: 13, maxScore: 15 },
              educationCertifications: { score: 9, maxScore: 10 },
              domainIndustryFit: { score: 9, maxScore: 10 },
              roleSeniorityFit: { score: 8, maxScore: 10 },
              culturalSoftSignals: { score: 4, maxScore: 5 },
              logisticsAvailability: { score: 5, maxScore: 5 },
            },
            strengths: ['Great skills'],
            gaps: [],
            standoutFactors: ['Solid background'],
            comparisonNote: 'Best match',
            recommendation: 'Interview immediately',
          })),
          jdCoverage: {
            poolStrength: 'EXCELLENT',
            strongFitCount: 1,
            avgMustHaveCoverage: 0.9,
          },
        }));

      const dto = {
        jdText:
          'Looking for a Senior Full Stack Engineer with React and Node.js experience.',
        jobTitle: 'Senior Full Stack Engineer',
        resumes: [
          {
            candidateId: 'custom-client-id-abc',
            candidateName: 'John Doe',
            resumeText:
              'John Doe, 6 years experience in React, Node.js, TypeScript.',
          },
        ],
      };

      const result = await service.quickRank('org-123', dto);

      expect(result).toBeDefined();
      expect(result.rankings).toHaveLength(1);
      expect(result.rankings[0].candidateId).toBe('custom-client-id-abc');
      expect(result.rankings[0].candidateName).toBe('John Doe');
      expect(result.rankings[0].totalScore).toBe(88);
    });
  });

  describe('Multi-Model Fallback & Resilience', () => {
    it('should fall back to next model when attempt 1 hits a 503 high demand error', async () => {
      const modelsAttempted: string[] = [];

      jest
        .spyOn(service as any, 'callAiRankingService')
        .mockImplementation(async (payload: any, overrideModel?: string) => {
          modelsAttempted.push(overrideModel || 'default');
          if (modelsAttempted.length === 1) {
            throw new Error(
              '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
            );
          }
          return {
            summary: 'Pool evaluated successfully via fallback',
            rankings: [
              {
                candidateId: 'cand-1',
                candidateName: 'Alice',
                totalScore: 90,
                verdict: 'EXCELLENT_FIT',
                scoreBreakdown: {
                  skillsMatch: { score: 25, maxScore: 25 },
                  experienceRelevance: { score: 20, maxScore: 20 },
                  projectRelevance: { score: 15, maxScore: 15 },
                  educationCertifications: { score: 10, maxScore: 10 },
                  domainIndustryFit: { score: 10, maxScore: 10 },
                  roleSeniorityFit: { score: 10, maxScore: 10 },
                  culturalSoftSignals: { score: 5, maxScore: 5 },
                  logisticsAvailability: { score: 5, maxScore: 5 },
                },
                strengths: ['Expert in React'],
                gaps: [],
                standoutFactors: ['Proven track record'],
                comparisonNote: 'Top candidate',
                recommendation: 'Fast track',
              },
            ],
            jdCoverage: {
              poolStrength: 'EXCELLENT',
              strongFitCount: 1,
              avgMustHaveCoverage: 1.0,
            },
          };
        });

      const dto = {
        jdText: 'Looking for a Senior React Engineer.',
        jobTitle: 'Senior React Engineer',
        resumes: [
          {
            candidateId: 'cand-1',
            candidateName: 'Alice',
            resumeText:
              'Alice Smith, 8 years Senior React and Full Stack engineer with scalable cloud architectures.',
          },
        ],
      };

      const result = await service.quickRank('org-123', dto);

      expect(result).toBeDefined();
      expect(result.rankings[0].candidateName).toBe('Alice');
      expect(modelsAttempted.length).toBe(2);
      expect(modelsAttempted[0]).toBe('gemini-flash-lite-latest');
      expect(modelsAttempted[1]).toBe('gemini-3.1-flash-lite');
    });
  });

  describe('Shortlisting Knockout Rules & Disqualification Handling', () => {
    it('correctly tags disqualified candidates, sets verdict to DISQUALIFIED, and places qualified candidates first', () => {
      const candidates = [
        {
          candidateId: 'cand-failed',
          candidateName: 'Vikram Sharma',
          totalScore: 88,
          verdict: 'STRONG_FIT',
          isDisqualified: true,
          disqualificationReason: 'Failed mandatory skills: missing React experience',
          scoreBreakdown: {
            skillsMatch: { score: 10, maxScore: 25 },
            experienceRelevance: { score: 20, maxScore: 20 },
            projectRelevance: { score: 15, maxScore: 15 },
            educationCertifications: { score: 10, maxScore: 10 },
            domainIndustryFit: { score: 10, maxScore: 10 },
            roleSeniorityFit: { score: 10, maxScore: 10 },
            culturalSoftSignals: { score: 4, maxScore: 5 },
            logisticsAvailability: { score: 4, maxScore: 5 },
          },
        },
        {
          candidateId: 'cand-passed',
          candidateName: 'Arjun Mehta',
          totalScore: 85,
          verdict: 'STRONG_FIT',
          isDisqualified: false,
          disqualificationReason: null,
          scoreBreakdown: {
            skillsMatch: { score: 24, maxScore: 25 },
            experienceRelevance: { score: 18, maxScore: 20 },
            projectRelevance: { score: 14, maxScore: 15 },
            educationCertifications: { score: 9, maxScore: 10 },
            domainIndustryFit: { score: 9, maxScore: 10 },
            roleSeniorityFit: { score: 9, maxScore: 10 },
            culturalSoftSignals: { score: 4, maxScore: 5 },
            logisticsAvailability: { score: 4, maxScore: 5 },
          },
        },
      ];

      const sanitized = (service as any).sanitizeRankingResults(
        { rankings: candidates },
        'test-session-knockouts',
      );

      // Qualified candidate must be sorted first (rank 1) despite candidate-failed having higher raw points
      expect(sanitized[0].candidateId).toBe('cand-passed');
      expect(sanitized[0].rank).toBe(1);
      expect(sanitized[0].isDisqualified).toBe(false);
      expect(sanitized[0].verdict).toBe('EXCELLENT_FIT');

      // Disqualified candidate must be sorted second (rank 2) with DISQUALIFIED verdict
      expect(sanitized[1].candidateId).toBe('cand-failed');
      expect(sanitized[1].rank).toBe(2);
      expect(sanitized[1].isDisqualified).toBe(true);
      expect(sanitized[1].verdict).toBe('DISQUALIFIED');
      expect(sanitized[1].disqualificationReason).toBe(
        'Failed mandatory skills: missing React experience',
      );
      expect(sanitized[1].scoreBreakdown.isDisqualified).toBe(true);
      expect(sanitized[1].scoreBreakdown.disqualificationReason).toBe(
        'Failed mandatory skills: missing React experience',
      );
    });
  });
});
