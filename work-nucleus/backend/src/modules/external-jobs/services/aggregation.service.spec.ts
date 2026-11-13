import { AggregationService } from './aggregation.service';
import { NormalizerService } from './normalizer.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AggregationService', () => {
  let service: AggregationService;

  const mockPrisma = {
    jobSourceConfig: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    externalJob: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockGreenhouse = {
    sourceName: 'greenhouse',
    fetchJobs: jest.fn(),
  };
  const mockLever = {
    sourceName: 'lever',
    fetchJobs: jest.fn(),
  };
  const mockAshby = {
    sourceName: 'ashby',
    fetchJobs: jest.fn(),
  };
  const mockJobicy = { sourceName: 'jobicy', fetchJobs: jest.fn() };
  const mockRemotive = { sourceName: 'remotive', fetchJobs: jest.fn() };
  const mockRemoteok = { sourceName: 'remoteok', fetchJobs: jest.fn() };
  const mockCareerjet = { sourceName: 'careerjet', fetchJobs: jest.fn() };
  const mockJsearch = { sourceName: 'jsearch', fetchJobs: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AggregationService(
      mockPrisma as any,
      new NormalizerService(),
      mockGreenhouse as any,
      mockLever as any,
      mockAshby as any,
      mockJobicy as any,
      mockRemotive as any,
      mockRemoteok as any,
      mockCareerjet as any,
      mockJsearch as any,
    );
  });

  describe('syncAtsSources() with Delta Deactivation', () => {
    it('should deactivate missing jobs when employer returns active jobs', async () => {
      mockPrisma.jobSourceConfig.findMany.mockResolvedValue([
        { sourceName: 'greenhouse', companySlug: 'gitlab', isActive: true },
      ]);

      mockGreenhouse.fetchJobs.mockResolvedValue({
        jobs: [
          {
            sourceId: 'job-active-1',
            title: 'Staff Engineer',
            companyName: 'GitLab',
            companySlug: 'gitlab',
            applyUrl: 'https://example.com/job1',
          },
        ],
        totalFetched: 1,
        errors: [],
      });

      mockPrisma.externalJob.findUnique.mockResolvedValue(null);
      mockPrisma.externalJob.create.mockResolvedValue({ id: 'new-job-id' });
      mockPrisma.externalJob.updateMany.mockResolvedValue({ count: 2 });

      const results = await service.syncAtsSources();

      expect(results).toHaveLength(1);
      expect(results[0].created).toBe(1);
      expect(results[0].deactivated).toBe(2);

      // Verify delta deactivation query excludes current active jobs
      expect(mockPrisma.externalJob.updateMany).toHaveBeenCalledWith({
        where: {
          sourceName: 'greenhouse',
          sourceCompanySlug: 'gitlab',
          isActive: true,
          sourceId: { notIn: ['job-active-1'] },
        },
        data: { isActive: false },
      });
    });

    it('should NOT delta-deactivate if company fetch had errors (Fail-safe 1)', async () => {
      mockPrisma.jobSourceConfig.findMany.mockResolvedValue([
        { sourceName: 'greenhouse', companySlug: 'mongodb', isActive: true },
      ]);

      mockGreenhouse.fetchJobs.mockResolvedValue({
        jobs: [],
        totalFetched: 0,
        errors: ['Greenhouse [mongodb]: 500 Internal Server Error'],
      });

      const results = await service.syncAtsSources();

      expect(results).toHaveLength(1);
      expect(results[0].deactivated).toBe(0);
      // updateMany should only be called for jobSourceConfig status, NOT for deactivating externalJob
      expect(mockPrisma.externalJob.updateMany).not.toHaveBeenCalled();
    });

    it('should NOT delta-deactivate if company returned 0 jobs without error (Fail-safe 2)', async () => {
      mockPrisma.jobSourceConfig.findMany.mockResolvedValue([
        { sourceName: 'greenhouse', companySlug: 'smallcorp', isActive: true },
      ]);

      mockGreenhouse.fetchJobs.mockResolvedValue({
        jobs: [],
        totalFetched: 0,
        errors: [],
      });

      const results = await service.syncAtsSources();

      expect(results).toHaveLength(1);
      expect(results[0].deactivated).toBe(0);
      expect(mockPrisma.externalJob.updateMany).not.toHaveBeenCalled();
    });

    it('should reactivate a previously inactive job if re-opened by employer', async () => {
      mockPrisma.jobSourceConfig.findMany.mockResolvedValue([
        { sourceName: 'greenhouse', companySlug: 'gitlab', isActive: true },
      ]);

      mockGreenhouse.fetchJobs.mockResolvedValue({
        jobs: [
          {
            sourceId: 'job-1',
            title: 'Staff Engineer',
            companyName: 'GitLab',
            companySlug: 'gitlab',
            applyUrl: 'https://example.com/job1',
          },
        ],
        totalFetched: 1,
        errors: [],
      });

      // Existing job was previously inactive
      mockPrisma.externalJob.findUnique.mockResolvedValue({
        id: 'job-1-uuid',
        contentHash: 'some-hash',
        isActive: false,
      });
      mockPrisma.externalJob.update.mockResolvedValue({ id: 'job-1-uuid' });
      mockPrisma.externalJob.updateMany.mockResolvedValue({ count: 0 });

      await service.syncAtsSources();

      expect(mockPrisma.externalJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1-uuid' },
          data: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('verifyJobUrls()', () => {
    it('should deactivate job if HTTP 404 is returned', async () => {
      mockPrisma.externalJob.findMany.mockResolvedValue([
        {
          id: 'job-dead-uuid',
          applyUrl: 'https://careers.example.com/dead-job',
          sourceName: 'greenhouse',
          companyName: 'Acme',
        },
      ]);

      mockedAxios.get.mockResolvedValue({
        status: 404,
        statusText: 'Not Found',
      } as any);

      const result = await service.verifyJobUrls(10);

      expect(result.checked).toBe(1);
      expect(result.deactivated).toBe(1);
      expect(result.verified).toBe(0);

      expect(mockPrisma.externalJob.update).toHaveBeenCalledWith({
        where: { id: 'job-dead-uuid' },
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should keep job active if HTTP 200 is returned', async () => {
      mockPrisma.externalJob.findMany.mockResolvedValue([
        {
          id: 'job-live-uuid',
          applyUrl: 'https://careers.example.com/live-job',
          sourceName: 'greenhouse',
          companyName: 'Acme',
        },
      ]);

      mockedAxios.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
      } as any);

      const result = await service.verifyJobUrls(10);

      expect(result.checked).toBe(1);
      expect(result.deactivated).toBe(0);
      expect(result.verified).toBe(1);

      expect(mockPrisma.externalJob.update).toHaveBeenCalledWith({
        where: { id: 'job-live-uuid' },
        data: expect.objectContaining({
          lastVerifiedAt: expect.any(Date),
        }),
      });
      // Should NOT set isActive: false
      expect(mockPrisma.externalJob.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should NOT deactivate job if network timeout or 500 error occurs', async () => {
      mockPrisma.externalJob.findMany.mockResolvedValue([
        {
          id: 'job-timeout-uuid',
          applyUrl: 'https://careers.example.com/slow-job',
          sourceName: 'greenhouse',
          companyName: 'Acme',
        },
      ]);

      mockedAxios.get.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await service.verifyJobUrls(10);

      expect(result.checked).toBe(1);
      expect(result.deactivated).toBe(0);
      expect(result.verified).toBe(1);

      // Should only update lastVerifiedAt, never set isActive: false
      expect(mockPrisma.externalJob.update).toHaveBeenCalledWith({
        where: { id: 'job-timeout-uuid' },
        data: expect.objectContaining({
          lastVerifiedAt: expect.any(Date),
        }),
      });
    });
  });
});
