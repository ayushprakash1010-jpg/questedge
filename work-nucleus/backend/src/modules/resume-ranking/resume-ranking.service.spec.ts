import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ResumeRankingService } from './resume-ranking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EvidenceRankingService } from './evidence-ranking.service';
import { RankingScorecardStore } from './ranking-scorecard.store';
import { FileUploadService } from '../file-upload/file-upload.service';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: 'A readable fictional resume with React project implementation and sufficient professional information.',
      }),
    },
  })),
}));

describe('ResumeRankingService', () => {
  const legacyWeights = {
    skillsMatch: 25,
    experienceRelevance: 20,
    projectRelevance: 15,
    educationCertifications: 10,
    domainIndustryFit: 10,
    roleSeniorityFit: 10,
    culturalSoftSignals: 5,
    logisticsAvailability: 5,
  };
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
        {
          provide: RankingScorecardStore,
          useValue: { resolve: jest.fn().mockResolvedValue([]) },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: EvidenceRankingService, useValue: { rank: jest.fn() } },
        {
          provide: FileUploadService,
          useValue: { getPresignedUrl: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ResumeRankingService>(ResumeRankingService);
  });

  describe('Shared evidence integration', () => {
    it('retains saved profile statements alongside a readable resume', async () => {
      jest
        .spyOn(service as any, 'extractSingleResume')
        .mockResolvedValue(
          'A readable resume describing React checkout development and enough professional experience.',
        );
      const rows = await (service as any).extractResumeTexts([
        {
          id: 'profile-a',
          name: 'Example Candidate',
          resumeUrl: 'resumes/profile-a.pdf',
          profileText: 'Project technologies: React, TypeScript',
        },
      ]);
      expect(rows[0].resumeText).toContain('React checkout development');
      expect(rows[0].resumeText).toContain('PROFILE STATEMENTS');
      expect(rows[0].resumeText).toContain(
        'Project technologies: React, TypeScript',
      );
    });
    it('preserves project technologies and zero experience in a profile packet', () => {
      const text = (service as any).buildProfileText({
        name: 'Example Candidate',
        currentDesignation: 'Graduate',
        experienceYears: 0,
        skills: ['React'],
        projects: [
          {
            name: 'Checkout',
            description:
              'Built checkout validation for a shopping application.',
            technologies: ['React', 'TypeScript'],
          },
        ],
      });
      expect(text).toContain('Project technologies: React, TypeScript');
      expect(text).toContain('Total Experience: 0 years');
    });

    it('resolves a stored resume key and recognizes PDF MIME type on a signed URL', async () => {
      (service as any).fileUpload.getPresignedUrl.mockResolvedValue(
        'https://example.com/resume.pdf?signature=fictional',
      );
      const bytes = new TextEncoder().encode('%PDF-1.4 document');
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => bytes.buffer,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            text: 'A readable fictional resume with project experience.',
          }),
        } as Response);
      try {
        const result = await (service as any).extractSingleResume(
          'resumes/example/resume.pdf',
        );
        expect(result).toContain('readable fictional resume');
        expect(
          (service as any).fileUpload.getPresignedUrl,
        ).toHaveBeenCalledWith('resumes/example/resume.pdf');
        const document = fetchMock.mock.calls[1][1]!.body as FormData;
        expect((document.get('file') as Blob).type).toBe('application/pdf');
        expect(String(fetchMock.mock.calls[1][0])).toContain(
          '/ai/extract-resume-text',
        );
      } finally {
        fetchMock.mockRestore();
      }
    });

    it('uses the shared evaluator for quick and mandate ranking and saves audit evidence', async () => {
      const candidate = {
        candidateId: 'candidate-id',
        candidateName: 'Example Candidate',
        resumeText:
          'Skills: React. Built the checkout validation and payment frontend in React.',
      };
      const weights = {
        skillsMatch: 100,
        experienceRelevance: 0,
        projectRelevance: 0,
        educationCertifications: 0,
        domainIndustryFit: 0,
        roleSeniorityFit: 0,
        culturalSoftSignals: 0,
        logisticsAvailability: 0,
      };
      const audit = {
        model: 'configured-test-model',
        shortlistingRules: {},
        documentHash: 'fictional-hash',
      };
      const evidence = (service as any).evidenceRanking;
      evidence.rank.mockResolvedValue({
        rankings: [
          {
            ...candidate,
            scoreBreakdown: {
              skillsMatch: {
                score: 100,
                maxScore: 100,
                evidence: ['Built checkout validation'],
                criteria: [{ text: 'React', score: 100 }],
              },
              eligibility: 'MEETS_REQUIREMENTS',
              _evaluation: audit,
            },
          },
        ],
        summary: 'Evaluated',
        evaluation: { weights },
      });
      const quick = await service.quickRank('org-123', {
        jdText: 'Build checkout applications with React.',
        resumes: [candidate],
      });
      prisma.mandate.findFirst.mockResolvedValue(mockMandate);
      prisma.resumeRankingSession = {
        create: jest.fn().mockResolvedValue({ id: 'session-new' }),
        update: jest.fn(),
      };
      prisma.resumeRankingResult = { createMany: jest.fn() };
      prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
      jest.spyOn(service as any, 'gatherCandidateData').mockResolvedValue([{}]);
      jest.spyOn(service as any, 'extractResumeTexts').mockResolvedValue([
        {
          id: candidate.candidateId,
          name: candidate.candidateName,
          resumeText: candidate.resumeText,
        },
      ]);
      jest
        .spyOn(service, 'getSessionResults')
        .mockResolvedValue({ rankings: [] } as any);
      await service.rankResumes('org-123', 'user-1', {
        mandateId: mockMandate.id,
        candidateIds: [candidate.candidateId],
      });
      expect(evidence.rank).toHaveBeenCalledTimes(2);
      expect(
        evidence.rank.mock.calls.every((call: any) => call[0] === 'org-123'),
      ).toBe(true);
      const stored =
        prisma.resumeRankingResult.createMany.mock.calls[0][0].data[0];
      expect(stored).not.toHaveProperty('isDisqualified');
      expect(stored.scoreBreakdown._evaluation).toEqual(audit);
      expect(stored.scoreBreakdown.skillsMatch.criteria).toHaveLength(1);
      expect(Number(stored.totalScore)).toBe(quick.rankings[0].totalScore);
      expect(prisma.resumeRankingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            customWeights: weights,
          }),
        }),
      );
    });
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
        [
          { candidateId: 'cand-1', candidateName: 'Arjun Mehta' },
          { candidateId: 'cand-2', candidateName: 'Kavita Patel' },
        ],
        legacyWeights,
      );

      expect(Array.isArray(sanitized)).toBe(true);
      expect(sanitized).toHaveLength(2);

      const arjun = sanitized.find((r: any) => r.candidateId === 'cand-1');
      const kavita = sanitized.find((r: any) => r.candidateId === 'cand-2');

      // Legacy logistics points are excluded: 24+19+14+9+9+9+4 = 88.
      expect(Number(arjun.totalScore)).toBe(88);
      // Arjun's verdict should be re-derived: >= 85 is EXCELLENT_FIT
      expect(arjun.verdict).toBe('EXCELLENT_FIT');
      expect(arjun.rank).toBe(1);

      // Legacy logistics points are excluded: 19+16+12+8+8+7+4 = 74.
      expect(Number(kavita.totalScore)).toBe(74);
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
        [{ candidateId: 'cand-overflow', candidateName: 'Test Overflow' }],
        legacyWeights,
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
      expect(breakdown.logisticsAvailability.maxScore).toBe(0);

      // Total must equal the clamped sum: 25 + 20 + 0 + ... = 45
      expect(Number(cand.totalScore)).toBe(45);
      // Under calibrated thresholds (85+, 70-84, 55-69, <55), score 45 is WEAK_FIT (<55)
      expect(cand.verdict).toBe('WEAK_FIT');
    });

    it('uses configured score limits rather than AI-provided limits or totals', () => {
      const response = {
        rankings: [
          {
            candidateId: 'candidate-1',
            candidateName: 'Candidate One',
            totalScore: 100,
            scoreBreakdown: {
              skillsMatch: { score: 500, maxScore: 500 },
            },
          },
        ],
      };

      const defaults = (service as any).sanitizeRankingResults(
        response,
        'session-default',
        [{ candidateId: 'candidate-1', candidateName: 'Candidate One' }],
      );
      expect(defaults[0].scoreBreakdown.skillsMatch).toMatchObject({
        score: 35,
        maxScore: 35,
      });
      expect(Number(defaults[0].totalScore)).toBe(35);

      const custom = (service as any).sanitizeRankingResults(
        response,
        'session-custom',
        [{ candidateId: 'candidate-1', candidateName: 'Candidate One' }],
        {
          skillsMatch: 10,
          experienceRelevance: 30,
          projectRelevance: 15,
          educationCertifications: 10,
          domainIndustryFit: 10,
          roleSeniorityFit: 10,
          culturalSoftSignals: 5,
          logisticsAvailability: 10,
        },
      );
      expect(custom[0].scoreBreakdown.skillsMatch).toMatchObject({
        score: 10,
        maxScore: 10,
      });
      expect(Number(custom[0].totalScore)).toBe(10);

      const missingBreakdown = (service as any).sanitizeRankingResults(
        { rankings: [{ candidateId: 'candidate-1', totalScore: 99 }] },
        'session-missing',
        [{ candidateId: 'candidate-1', candidateName: 'Candidate One' }],
      );
      expect(Number(missingBreakdown[0].totalScore)).toBe(0);
    });
  });

  describe('Custom Scoring Weights', () => {
    it('rejects incomplete and non-100-point weights before ranking', async () => {
      prisma.mandate.findFirst.mockResolvedValue(mockMandate);
      await expect(
        service.quickRank('org-123', {
          jdText: 'A fictional role requiring React and TypeScript.',
          resumes: [
            {
              resumeText:
                'Fictional resume with React and TypeScript experience.',
            },
          ],
          customWeights: { skillsMatch: 10 },
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.rankResumes('org-123', 'user-1', {
          mandateId: 'mandate-123',
          candidateIds: ['cand-1'],
          customWeights: {
            skillsMatch: 10,
            experienceRelevance: 20,
            projectRelevance: 15,
            educationCertifications: 10,
            domainIndustryFit: 10,
            roleSeniorityFit: 10,
            culturalSoftSignals: 5,
            logisticsAvailability: 5,
          },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.mandate.findFirst).not.toHaveBeenCalled();
    });

    it('honors zero and custom maxima when calculating scores', () => {
      const weights = (service as any).resolveWeights({
        skillsMatch: 0,
        experienceRelevance: 30,
        projectRelevance: 15,
        educationCertifications: 10,
        domainIndustryFit: 10,
        roleSeniorityFit: 10,
        culturalSoftSignals: 5,
        logisticsAvailability: 20,
      });
      const rows = (service as any).sanitizeRankingResults(
        {
          rankings: [
            {
              candidateId: 'candidate-1',
              scoreBreakdown: { skillsMatch: { score: 25, maxScore: 25 } },
            },
          ],
        },
        'session-zero-weight',
        [{ candidateId: 'candidate-1', candidateName: 'Candidate One' }],
        weights,
      );
      expect(rows[0].scoreBreakdown.skillsMatch).toMatchObject({
        score: 0,
        maxScore: 0,
      });
      expect(Number(rows[0].totalScore)).toBe(0);
    });
  });

  describe('Quick Rank Candidate ID Preservation', () => {
    it('rejects missing, duplicate, and invented AI candidate IDs', () => {
      const expected = [
        { candidateId: 'alice', candidateName: 'Alice' },
        { candidateId: 'bob', candidateName: 'Bob' },
      ];
      for (const ids of [
        ['alice'],
        ['alice', 'alice'],
        ['alice', 'invented'],
      ]) {
        expect(() =>
          (service as any).sanitizeRankingResults(
            { rankings: ids.map((candidateId) => ({ candidateId })) },
            'session-invalid',
            expected,
          ),
        ).toThrow(ServiceUnavailableException);
      }
    });

    it('uses the submitted candidate name and rejects duplicate input IDs', async () => {
      const rows = (service as any).sanitizeRankingResults(
        {
          rankings: [{ candidateId: 'alice', candidateName: 'Invented Name' }],
        },
        'session-name',
        [{ candidateId: 'alice', candidateName: 'Alice' }],
      );
      expect(rows[0].candidateName).toBe('Alice');

      await expect(
        service.quickRank('org-123', {
          jdText: 'A fictional job requiring React and TypeScript.',
          resumes: [
            {
              candidateId: 'same',
              resumeText:
                'Fictional resume with React and TypeScript experience.',
            },
            {
              candidateId: 'same',
              resumeText: 'Another fictional resume with different experience.',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('preserves client-provided candidateId throughout ranking', async () => {
      jest
        .spyOn(service as any, 'evaluate')
        .mockImplementation(async (_org: string, payload: any) => ({
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
      expect(result.rankings[0].totalScore).toBe(74);
    });
  });

  it('surfaces evaluation failure without rerunning the entire ranking', async () => {
    const evaluator = (service as any).evidenceRanking.rank;
    evaluator.mockRejectedValue(
      new ServiceUnavailableException('Provider unavailable'),
    );
    await expect(
      service.quickRank('org-123', {
        jdText: 'This position requires delivery experience.',
        resumes: [
          {
            candidateId: 'C1',
            resumeText: 'Delivered multiple projects over the past five years.',
          },
        ],
      }),
    ).rejects.toThrow('Provider unavailable');
    expect(evaluator).toHaveBeenCalledTimes(1);
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
          disqualificationReason:
            'Failed mandatory skills: missing React experience',
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
        [
          { candidateId: 'cand-failed', candidateName: 'Vikram Sharma' },
          { candidateId: 'cand-passed', candidateName: 'Arjun Mehta' },
        ],
        legacyWeights,
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
