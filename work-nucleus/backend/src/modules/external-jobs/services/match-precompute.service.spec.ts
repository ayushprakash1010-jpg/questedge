import { MatchPrecomputeService } from './match-precompute.service';
import { NormalizerService } from './normalizer.service';

describe('MatchPrecomputeService', () => {
  let service: MatchPrecomputeService;

  const mockPrisma = {
    candidateProfile: { findMany: jest.fn() },
    externalJob: { findMany: jest.fn() },
    externalJobMatch: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchPrecomputeService(
      mockPrisma as any,
      new NormalizerService(),
    );
  });

  // ── Helper factories ──────────────────────────────────────────────

  function makeCandidate(overrides: any = {}) {
    return {
      id: 'cand-1',
      skills: ['React', 'Node.js', 'TypeScript', 'Python'],
      experienceYears: 5,
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru', 'Mumbai'],
      workModel: 'hybrid',
      currentCtc: 1500000,
      expectedCtc: 2000000,
      noticePeriodDays: 30,
      preferredRoles: ['Full Stack Developer', 'Backend Engineer'],
      preferredIndustries: [],
      currentDesignation: 'Software Engineer',
      headline: 'Full Stack Developer',
      ...overrides,
    };
  }

  function makeJob(overrides: any = {}) {
    return {
      id: 'job-1',
      title: 'Senior Full Stack Developer',
      extractedSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      experienceLevel: 'Senior',
      location: 'Bengaluru, Karnataka',
      city: 'Bengaluru',
      workplaceType: 'Hybrid',
      salaryMin: 1800000,
      salaryMax: 3000000,
      salaryCurrency: 'INR',
      employmentType: 'Full-time',
      department: 'Engineering',
      companyName: 'TestCorp',
      ...overrides,
    };
  }

  // ── computeMatchesForCandidate() ──────────────────────────────────

  describe('computeMatchesForCandidate()', () => {
    it('should write matches to the database', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate();
      const jobs = [makeJob()];

      const count = await service.computeMatchesForCandidate(candidate, jobs);
      expect(count).toBe(1);
      expect(mockPrisma.externalJobMatch.deleteMany).toHaveBeenCalledWith({
        where: { candidateProfileId: 'cand-1' },
      });
      expect(mockPrisma.externalJobMatch.createMany).toHaveBeenCalledTimes(1);
    });

    it('should keep at most 100 matches', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 100 });

      const candidate = makeCandidate();
      const jobs = Array.from({ length: 120 }, (_, i) =>
        makeJob({ id: `job-${i}`, title: `Role ${i}` }),
      );

      const count = await service.computeMatchesForCandidate(candidate, jobs);
      expect(count).toBe(100);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      expect(createCall.data.length).toBe(100);
    });

    it('should fetch jobs from DB when not provided', async () => {
      mockPrisma.externalJob.findMany.mockResolvedValue([makeJob()]);
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate();
      await service.computeMatchesForCandidate(candidate);

      expect(mockPrisma.externalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });
  });

  // ── Scoring dimension tests ───────────────────────────────────────

  describe('scoring dimensions', () => {
    it('should give high skills score for matching skills', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate({
        skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      });
      const jobs = [
        makeJob({
          extractedSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
        }),
      ];

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.skillsScore).toBe(40); // 4/4 skills = 100% of 40
    });

    it('should give zero skills score for no matching skills', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate({
        skills: ['Ruby', 'Rails', 'PHP'],
      });
      const jobs = [
        makeJob({
          extractedSkills: ['Java', 'Spring', 'Kafka', 'AWS'],
        }),
      ];

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.skillsScore).toBe(0);
    });

    it('should give partial credit when no job skills listed', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate();
      const jobs = [makeJob({ extractedSkills: [] })];

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.skillsScore).toBe(20); // Partial credit
    });

    it('should give high experience score for matching level', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate({ experienceYears: 7 });
      const jobs = [makeJob({ experienceLevel: 'Senior' })]; // 5-15 range

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.experienceScore).toBe(25); // Exact fit
    });

    it('should give partial experience score for slight mismatch', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate({ experienceYears: 2 });
      const jobs = [makeJob({ experienceLevel: 'Mid' })]; // 3-7 range

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.experienceScore).toBe(18); // Within min-1 to max+2
    });

    it('should give default experience score when level not specified', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate();
      const jobs = [makeJob({ experienceLevel: null })];

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.experienceScore).toBe(20); // Default
    });

    it('should give role fit score when preferred role matches', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate({
        preferredRoles: ['Backend Engineer'],
        headline: 'Backend Engineer',
      });
      const jobs = [
        makeJob({ title: 'Senior Backend Engineer', department: 'Engineering' }),
      ];

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.roleFitScore).toBe(20); // Full match
    });

    it('should clamp total score between 0 and 100', async () => {
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const candidate = makeCandidate();
      const jobs = [makeJob()];

      await service.computeMatchesForCandidate(candidate, jobs);

      const createCall = mockPrisma.externalJobMatch.createMany.mock.calls[0][0];
      const match = createCall.data[0];
      expect(match.totalScore).toBeGreaterThanOrEqual(0);
      expect(match.totalScore).toBeLessThanOrEqual(100);
    });
  });

  // ── computeAllMatches() ───────────────────────────────────────────

  describe('computeAllMatches()', () => {
    it('should process all active candidates', async () => {
      mockPrisma.candidateProfile.findMany.mockResolvedValue([
        makeCandidate({ id: 'cand-1' }),
        makeCandidate({ id: 'cand-2' }),
      ]);
      mockPrisma.externalJob.findMany.mockResolvedValue([makeJob()]);
      mockPrisma.externalJobMatch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const result = await service.computeAllMatches();
      expect(result.candidatesProcessed).toBe(2);
      expect(result.matchesWritten).toBe(2);
    });

    it('should continue processing after individual candidate failure', async () => {
      const good = makeCandidate({ id: 'cand-1' });
      const bad = makeCandidate({ id: 'cand-2' });

      mockPrisma.candidateProfile.findMany.mockResolvedValue([bad, good]);
      mockPrisma.externalJob.findMany.mockResolvedValue([makeJob()]);

      // First deleteMany call throws, second succeeds
      mockPrisma.externalJobMatch.deleteMany
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ count: 0 });
      mockPrisma.externalJobMatch.createMany.mockResolvedValue({ count: 1 });

      const result = await service.computeAllMatches();
      expect(result.candidatesProcessed).toBe(2);
      // First candidate failed, second succeeded
      expect(result.matchesWritten).toBe(1);
    });

    it('should handle empty candidates list', async () => {
      mockPrisma.candidateProfile.findMany.mockResolvedValue([]);
      mockPrisma.externalJob.findMany.mockResolvedValue([makeJob()]);

      const result = await service.computeAllMatches();
      expect(result.candidatesProcessed).toBe(0);
      expect(result.matchesWritten).toBe(0);
    });
  });
});
