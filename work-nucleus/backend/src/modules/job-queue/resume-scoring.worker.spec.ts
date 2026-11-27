import { ResumeScoringWorker } from './resume-scoring.worker';

describe('ResumeScoringWorker org scoping & no-mock guarantee', () => {
  it('filters nightly run by job orgId when supplied', async () => {
    const workers = new Map<string, (jobs: any[]) => Promise<void>>();
    const queue: any = {
      ensureQueue: jest.fn().mockResolvedValue(undefined),
      scheduleCron: jest.fn().mockResolvedValue(undefined),
      registerWorker: jest.fn().mockImplementation((name, fn) => {
        workers.set(name, fn);
        return Promise.resolve();
      }),
      enqueue: jest.fn().mockResolvedValue(undefined),
    };
    const prisma: any = {
      candidateApplication: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const config: any = { get: jest.fn((_: string, d?: string) => d) };

    const worker = new ResumeScoringWorker(queue, prisma, {} as any, config);
    await worker.onModuleInit();

    const nightlyHandler = workers.get('resume-scoring-nightly');
    expect(nightlyHandler).toBeDefined();

    await nightlyHandler!([{ data: { orgId: 'org-123' } }]);

    expect(prisma.candidateApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          aiMatchScore: null,
          candidate: { resumeUrl: { not: null }, orgId: 'org-123' },
        },
      }),
    );
  });

  it('skips writing score 80 when GEMINI_API_KEY is missing', async () => {
    const prisma: any = {
      candidateApplication: {
        findUnique: jest.fn().mockResolvedValue({ aiMatchScore: null }),
        update: jest.fn(),
      },
      hiringPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'plan-1',
          orgId: 'org-1',
          skills: [],
          jobDescriptions: [{ content: { summary: 'Backend role' } }],
        }),
      },
    };
    const fileUpload: any = {
      getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('resume')),
    };
    const config: any = {
      get: jest.fn((key: string, def?: string) =>
        key === 'GEMINI_API_KEY' ? '' : def,
      ),
    };

    const worker = new ResumeScoringWorker(
      {} as any,
      prisma,
      fileUpload,
      config,
    );

    await (worker as any).handleScoreOne({
      applicationId: 'app-1',
      candidateId: 'cand-1',
      hiringPlanId: 'plan-1',
      candidateName: 'Test Candidate',
      resumeKey: 'resumes/test.pdf',
    });

    expect(prisma.candidateApplication.update).not.toHaveBeenCalled();
  });
});
