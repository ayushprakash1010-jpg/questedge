import { Test, TestingModule } from '@nestjs/testing';
import { ExternalJobsService } from './external-jobs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HotCacheService } from '../cache/cache.service';
import { AggregationService } from './services/aggregation.service';
import { MatchPrecomputeService } from './services/match-precompute.service';
import { NotFoundException } from '@nestjs/common';

describe('ExternalJobsService', () => {
  let service: ExternalJobsService;
  let prisma: any;
  let aggregation: any;
  let matchPrecompute: any;

  const mockJob = {
    id: 'job-1',
    sourceName: 'greenhouse',
    sourceId: 'gh-123',
    title: 'Senior Full Stack Engineer',
    companyName: 'Stripe',
    companyLogoUrl: 'https://logo.com/stripe.png',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    isRemote: false,
    workplaceType: 'OnSite',
    salaryMin: 3500000,
    salaryMax: 5000000,
    salaryCurrency: 'INR',
    salaryPeriod: 'Annual',
    salaryRaw: '₹35L - ₹50L',
    descriptionSnippet: 'We are looking for a Senior Full Stack Engineer...',
    descriptionHtml: '<p>Full JD</p>',
    descriptionPlain: 'Full JD plain',
    employmentType: 'FullTime',
    department: 'Engineering',
    extractedSkills: ['react', 'node.js', 'typescript', 'postgres'],
    tags: ['engineering', 'backend'],
    experienceLevel: 'Senior',
    applyUrl: 'https://boards.greenhouse.io/stripe/jobs/123',
    isActive: true,
    postedAt: new Date('2026-11-01T00:00:00Z'),
    createdAt: new Date('2026-11-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      externalJob: {
        findMany: jest.fn().mockResolvedValue([mockJob]),
        findUnique: jest.fn().mockResolvedValue(mockJob),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([
          { sourceName: 'greenhouse', _count: { id: 1 } },
        ]),
      },
      externalJobMatch: {
        findMany: jest.fn().mockResolvedValue([
          {
            externalJobId: 'job-1',
            totalScore: 92,
            skillsScore: 38,
            experienceScore: 25,
            roleFitScore: 18,
            preferencesScore: 11,
            matchedSkills: ['react', 'typescript'],
            missingSkills: ['postgres'],
            externalJob: mockJob,
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          totalScore: 92,
          skillsScore: 38,
          matchedSkills: ['react', 'typescript'],
        }),
      },
      externalSavedJob: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'save-1', savedAt: new Date(), externalJob: mockJob },
        ]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'save-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'save-1' }),
        count: jest.fn().mockResolvedValue(1),
      },
      externalJobClick: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'click-1', clickedAt: new Date(), externalJob: mockJob },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'click-1' }),
        update: jest.fn().mockResolvedValue({ id: 'click-1' }),
        count: jest.fn().mockResolvedValue(1),
      },
      candidateProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cand-1' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'cand-1' }),
      },
    };

    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    aggregation = {
      seedDefaultSources: jest.fn().mockResolvedValue(190),
      syncAtsSources: jest.fn().mockResolvedValue([]),
      syncRemoteSources: jest.fn().mockResolvedValue([]),
      syncAggregatorSources: jest.fn().mockResolvedValue([]),
    };

    matchPrecompute = {
      computeAllMatches: jest.fn().mockResolvedValue({
        candidatesProcessed: 5,
        matchesWritten: 50,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalJobsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HotCacheService, useValue: cache },
        { provide: AggregationService, useValue: aggregation },
        { provide: MatchPrecomputeService, useValue: matchPrecompute },
      ],
    }).compile();

    service = module.get<ExternalJobsService>(ExternalJobsService);
  });

  describe('searchJobs()', () => {
    it('should return paginated jobs with defaults', async () => {
      const result = await service.searchJobs({});
      expect(result.jobs).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(prisma.externalJob.findMany).toHaveBeenCalled();
    });

    it('should apply search keyword to title, company, description', async () => {
      await service.searchJobs({ search: 'engineer' });
      expect(prisma.externalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'engineer', mode: 'insensitive' } },
              { companyName: { contains: 'engineer', mode: 'insensitive' } },
              { descriptionSnippet: { contains: 'engineer', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should apply location filter', async () => {
      await service.searchJobs({ location: 'Bengaluru' });
      expect(prisma.externalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { city: { contains: 'Bengaluru', mode: 'insensitive' } },
              { state: { contains: 'Bengaluru', mode: 'insensitive' } },
              { location: { contains: 'Bengaluru', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should apply combined search and location filters via AND clause', async () => {
      await service.searchJobs({ search: 'React', location: 'Bengaluru' });
      expect(prisma.externalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.any(Array),
          }),
        }),
      );
    });

    it('should filter by workplaceType and experienceLevel', async () => {
      await service.searchJobs({
        workplaceType: 'Remote' as any,
        experienceLevel: 'Senior',
        sourceName: 'greenhouse',
      });
      expect(prisma.externalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workplaceType: 'Remote',
            experienceLevel: 'Senior',
            sourceName: 'greenhouse',
          }),
        }),
      );
    });

    it('should filter by salary bounds', async () => {
      await service.searchJobs({ salaryMin: 3000000, salaryMax: 6000000 });
      expect(prisma.externalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            salaryMax: { gte: 3000000 },
            salaryMin: { lte: 6000000 },
          }),
        }),
      );
    });

    it('should filter by postedWithin cutoff', async () => {
      await service.searchJobs({ postedWithin: '24h' });
      expect(prisma.externalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            postedAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should attach matchScore and matchedSkills when candidateProfileId is provided', async () => {
      const result = await service.searchJobs({}, 'candidate-123');
      expect(result.jobs[0].matchScore).toBe(92);
      expect(result.jobs[0].matchedSkills).toEqual(['react', 'typescript']);
    });
  });

  describe('getJobById()', () => {
    it('should return job with matchData and isSaved', async () => {
      const result = await service.getJobById('job-1', 'candidate-123');
      expect(result.id).toBe('job-1');
      expect(result.matchData).toBeDefined();
      expect(result.isSaved).toBe(false);
    });

    it('should throw NotFoundException if job does not exist', async () => {
      prisma.externalJob.findUnique.mockResolvedValueOnce(null);
      await expect(service.getJobById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if job is inactive', async () => {
      prisma.externalJob.findUnique.mockResolvedValueOnce({
        ...mockJob,
        isActive: false,
      });
      await expect(service.getJobById('job-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleSave()', () => {
    it('should create save record if not saved yet', async () => {
      prisma.externalSavedJob.findUnique.mockResolvedValueOnce(null);
      const result = await service.toggleSave('cand-1', 'job-1');
      expect(result.saved).toBe(true);
      expect(prisma.externalSavedJob.create).toHaveBeenCalledWith({
        data: { candidateProfileId: 'cand-1', externalJobId: 'job-1' },
      });
    });

    it('should delete save record if already saved (toggle off)', async () => {
      prisma.externalSavedJob.findUnique.mockResolvedValueOnce({
        id: 'save-123',
      });
      const result = await service.toggleSave('cand-1', 'job-1');
      expect(result.saved).toBe(false);
      expect(prisma.externalSavedJob.delete).toHaveBeenCalledWith({
        where: { id: 'save-123' },
      });
    });
  });

  describe('recordClick()', () => {
    it('should record click event and return external applyUrl', async () => {
      const result = await service.recordClick('cand-1', 'job-1');
      expect(result.applyUrl).toBe(mockJob.applyUrl);
      expect(prisma.externalJobClick.create).toHaveBeenCalledWith({
        data: { candidateProfileId: 'cand-1', externalJobId: 'job-1' },
      });
    });

    it('should throw NotFoundException if job is not found', async () => {
      prisma.externalJob.findUnique.mockResolvedValueOnce(null);
      await expect(service.recordClick('cand-1', 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reportApplied()', () => {
    it('should update existing click record with appliedAt', async () => {
      prisma.externalJobClick.findFirst.mockResolvedValueOnce({
        id: 'click-123',
      });
      const result = await service.reportApplied('cand-1', 'job-1');
      expect(result.reported).toBe(true);
      expect(prisma.externalJobClick.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'click-123' },
          data: expect.objectContaining({ selfReportedApplied: true }),
        }),
      );
    });

    it('should create new click record if none existed', async () => {
      prisma.externalJobClick.findFirst.mockResolvedValueOnce(null);
      const result = await service.reportApplied('cand-1', 'job-1');
      expect(result.reported).toBe(true);
      expect(prisma.externalJobClick.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            candidateProfileId: 'cand-1',
            externalJobId: 'job-1',
            selfReportedApplied: true,
          }),
        }),
      );
    });
  });

  describe('getSavedJobs()', () => {
    it('should return saved jobs with pagination', async () => {
      const result = await service.getSavedJobs('cand-1', 1, 10);
      expect(result.savedJobs).toHaveLength(1);
      expect(result.savedJobs[0].id).toBe('job-1');
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getClickHistory()', () => {
    it('should return click history with pagination', async () => {
      const result = await service.getClickHistory('cand-1', 1, 10);
      expect(result.history).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getRecommendedJobs()', () => {
    it('should return recommended jobs sorted by match score with scoring breakdown', async () => {
      const result = await service.getRecommendedJobs('cand-1', 10);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('job-1');
      expect(result[0].matchScore).toBe(92);
      expect(result[0].skillsScore).toBe(38);
      expect(result[0].matchedSkills).toEqual(['react', 'typescript']);
    });
  });

  describe('getStats()', () => {
    it('should return aggregation statistics', async () => {
      const stats = await service.getStats();
      expect(stats.totalJobs).toBe(1);
      expect(stats.activeJobs).toBe(1);
      expect(stats.sourceBreakdown).toEqual([{ source: 'greenhouse', count: 1 }]);
      expect(stats.totalClicks).toBe(1);
      expect(stats.totalSaves).toBe(1);
    });
  });

  describe('triggerManualSync()', () => {
    it('should initiate background sync and return status message', async () => {
      const res = await service.triggerManualSync();
      expect(res.status).toBe('Sync initiated in background');
      expect(res.message).toBeDefined();
    });
  });
});
