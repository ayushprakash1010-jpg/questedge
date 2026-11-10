import { Test, TestingModule } from '@nestjs/testing';
import { ExternalJobsController } from './external-jobs.controller';
import { ExternalJobsService } from './external-jobs.service';

describe('ExternalJobsController', () => {
  let controller: ExternalJobsController;
  let service: any;

  const mockUser = {
    userId: 'user-1',
    userType: 'CANDIDATE',
    candidateProfileId: 'cand-1',
  };

  beforeEach(async () => {
    service = {
      searchJobs: jest.fn().mockResolvedValue({
        jobs: [],
        pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
      }),
      getRecommendedJobs: jest.fn().mockResolvedValue([]),
      getSavedJobs: jest.fn().mockResolvedValue({ savedJobs: [] }),
      getClickHistory: jest.fn().mockResolvedValue({ history: [] }),
      getStats: jest.fn().mockResolvedValue({ totalJobs: 4284, activeJobs: 4284 }),
      triggerManualSync: jest.fn().mockResolvedValue({ status: 'Sync initiated' }),
      getJobById: jest.fn().mockResolvedValue({ id: 'job-1' }),
      toggleSave: jest.fn().mockResolvedValue({ saved: true }),
      recordClick: jest.fn().mockResolvedValue({ applyUrl: 'https://apply.com' }),
      reportApplied: jest.fn().mockResolvedValue({ reported: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalJobsController],
      providers: [{ provide: ExternalJobsService, useValue: service }],
    }).compile();

    controller = module.get<ExternalJobsController>(ExternalJobsController);
  });

  it('should search jobs with candidate context', async () => {
    await controller.searchJobs({ search: 'engineer' } as any, mockUser);
    expect(service.searchJobs).toHaveBeenCalledWith(
      { search: 'engineer' },
      'cand-1',
    );
  });

  it('should return recommended jobs when candidate has profile', async () => {
    const res = await controller.getRecommended(mockUser);
    expect(res.jobs).toEqual([]);
    expect(service.getRecommendedJobs).toHaveBeenCalledWith('cand-1');
  });

  it('should return empty recommendations prompt if no candidateProfileId', async () => {
    const res = await controller.getRecommended({});
    expect(res.jobs).toEqual([]);
    expect(res.message).toContain('Complete your profile');
  });

  it('should get saved jobs with parsed pagination', async () => {
    await controller.getSavedJobs(mockUser, '2', '10');
    expect(service.getSavedJobs).toHaveBeenCalledWith('cand-1', 2, 10);
  });

  it('should get click history with parsed pagination', async () => {
    await controller.getClickHistory(mockUser, '1', '20');
    expect(service.getClickHistory).toHaveBeenCalledWith('cand-1', 1, 20);
  });

  it('should return stats for admin', async () => {
    const res = await controller.getStats();
    expect(res.totalJobs).toBe(4284);
  });

  it('should trigger manual sync', async () => {
    const res = await controller.triggerSync();
    expect(res.status).toBe('Sync initiated');
    expect(service.triggerManualSync).toHaveBeenCalled();
  });

  it('should get job by id', async () => {
    const res = await controller.getJobById('e528b183-490b-426c-851f-63165da02ff9', mockUser);
    expect(res.id).toBe('job-1');
    expect(service.getJobById).toHaveBeenCalledWith(
      'e528b183-490b-426c-851f-63165da02ff9',
      'cand-1',
    );
  });

  it('should toggle save', async () => {
    const res = await controller.toggleSave('e528b183-490b-426c-851f-63165da02ff9', mockUser);
    expect(res.saved).toBe(true);
    expect(service.toggleSave).toHaveBeenCalledWith('cand-1', 'e528b183-490b-426c-851f-63165da02ff9');
  });

  it('should record click', async () => {
    const res = await controller.recordClick('e528b183-490b-426c-851f-63165da02ff9', mockUser);
    expect(res.applyUrl).toBe('https://apply.com');
    expect(service.recordClick).toHaveBeenCalledWith('cand-1', 'e528b183-490b-426c-851f-63165da02ff9');
  });

  it('should report applied', async () => {
    const res = await controller.reportApplied('e528b183-490b-426c-851f-63165da02ff9', mockUser);
    expect(res.reported).toBe(true);
    expect(service.reportApplied).toHaveBeenCalledWith('cand-1', 'e528b183-490b-426c-851f-63165da02ff9');
  });
});
