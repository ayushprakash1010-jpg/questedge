import { Test, TestingModule } from '@nestjs/testing';
import { MandatesService } from './mandates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../comms/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import { HireDetectionService } from '../hire-detection/hire-detection.service';

describe('MandatesService', () => {
  let service: MandatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MandatesService,
        {
          provide: PrismaService,
          useValue: {
            mandate: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendConsentRequest: jest.fn(),
            sendReferralStatusUpdate: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: WhatsappService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
        {
          provide: HireDetectionService,
          useValue: {
            onMandateStatusChange: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<MandatesService>(MandatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse date-only application deadline to IST end of day', () => {
    const parsed = (service as any).parseApplicationDeadline('2026-10-30');
    expect(parsed).toBeDefined();
    expect(parsed.toISOString()).toBe('2026-10-30T18:29:59.999Z');
  });

  it('should parse UTC midnight date string to IST end of day', () => {
    const parsed = (service as any).parseApplicationDeadline('2026-10-30T00:00:00.000Z');
    expect(parsed).toBeDefined();
    expect(parsed.toISOString()).toBe('2026-10-30T18:29:59.999Z');
  });

  it('should reconcile participations count in findByOrg using distinct referral recruiters', async () => {
    const prisma = (service as any).prisma;
    prisma.mandate.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    prisma.mandate.count = jest.fn().mockResolvedValue(1);
    prisma.mandate.findMany = jest.fn().mockResolvedValue([
      {
        id: 'mandate-1',
        title: 'Senior Full Stack Developer',
        organization: { id: 'org-1', name: 'roboto' },
        _count: { referrals: 1, applications: 1, participations: 0 },
      },
    ]);
    prisma.mandateParticipation = {
      groupBy: jest.fn().mockResolvedValue([]),
    };
    prisma.referral = {
      findMany: jest.fn().mockResolvedValue([
        { mandateId: 'mandate-1', recruiterId: 'rec-1' },
      ]),
    };

    const result = await service.findByOrg('org-1', {} as any);
    expect(result.data).toHaveLength(1);
    expect((result.data[0] as any)._count.participations).toBe(1);
  });

  it('should provision 5 default PipelineStages for a mandate when none exist yet', async () => {
    const prisma = (service as any).prisma;
    prisma.mandate.findFirst = jest.fn().mockResolvedValue({
      id: 'mandate-1',
      orgId: 'org-1',
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      numberOfOpenings: 1,
      currency: 'INR',
      organization: { id: 'org-1', name: 'roboto' },
    });
    const createdStages = [
      { id: 's1', name: 'Sourced', stageType: 'SCREENING', stageOrder: 1, hiringPlanId: 'hp-1' },
      { id: 's2', name: 'Screening', stageType: 'SCREENING', stageOrder: 2, hiringPlanId: 'hp-1' },
      { id: 's3', name: 'Shortlisted', stageType: 'TECHNICAL', stageOrder: 3, hiringPlanId: 'hp-1' },
      { id: 's4', name: 'Interview', stageType: 'HR', stageOrder: 4, hiringPlanId: 'hp-1' },
      { id: 's5', name: 'Offer / Hired', stageType: 'OFFER', stageOrder: 5, hiringPlanId: 'hp-1' },
    ];
    prisma.pipelineStage = {
      findMany: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createdStages),
      createMany: jest.fn().mockResolvedValue({ count: 5 }),
    };
    prisma.hiringPlan = {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'hp-1' }),
    };
    prisma.user = {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };

    const { backingPlanId, stages } = await service.ensureMandatePipelineSetup(
      'org-1',
      'mandate-1',
    );

    expect(backingPlanId).toBe('hp-1');
    expect(prisma.pipelineStage.createMany).toHaveBeenCalledTimes(1);
    expect(stages).toHaveLength(5);
    expect(stages.map((s: any) => s.name)).toEqual([
      'Sourced',
      'Screening',
      'Shortlisted',
      'Interview',
      'Offer / Hired',
    ]);
  });

  it('should deduplicate concurrent pipeline stages and reassign applications/history to canonical stage', async () => {
    const prisma = (service as any).prisma;
    prisma.mandate.findFirst = jest.fn().mockResolvedValue({
      id: 'mandate-dup',
      orgId: 'org-1',
      title: 'Senior Full Stack Developer',
      organization: { id: 'org-1', name: 'roboto' },
    });

    const dupStages = [
      { id: 's1-keep', name: 'Sourced', stageType: 'SCREENING', stageOrder: 1, hiringPlanId: 'hp-1' },
      { id: 's1-dup', name: 'Sourced', stageType: 'SCREENING', stageOrder: 1, hiringPlanId: 'hp-1' },
      { id: 's2-keep', name: 'Screening', stageType: 'SCREENING', stageOrder: 2, hiringPlanId: 'hp-1' },
    ];
    const cleanedStages = [
      { id: 's1-keep', name: 'Sourced', stageType: 'SCREENING', stageOrder: 1, hiringPlanId: 'hp-1' },
      { id: 's2-keep', name: 'Screening', stageType: 'SCREENING', stageOrder: 2, hiringPlanId: 'hp-1' },
    ];

    prisma.pipelineStage = {
      findMany: jest.fn()
        .mockResolvedValueOnce(dupStages)
        .mockResolvedValueOnce(cleanedStages),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    prisma.candidateApplication = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    prisma.candidateStageHistory = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    prisma.interviewFeedback = { updateMany: jest.fn().mockResolvedValue({ count: 0 }) };
    prisma.hiringAssessment = { updateMany: jest.fn().mockResolvedValue({ count: 0 }) };
    prisma.videoInterview = { updateMany: jest.fn().mockResolvedValue({ count: 0 }) };

    const { stages } = await service.ensureMandatePipelineSetup('org-1', 'mandate-dup');

    expect(prisma.candidateApplication.updateMany).toHaveBeenCalledWith({
      where: { currentStageId: { in: ['s1-dup'] } },
      data: { currentStageId: 's1-keep' },
    });
    expect(prisma.pipelineStage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1-dup'] } },
    });
    expect(stages).toHaveLength(2);
  });

  it('should coalesce concurrent ensureMandatePipelineSetup calls for the same mandate', async () => {
    const prisma = (service as any).prisma;
    prisma.mandate.findFirst = jest.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return {
        id: 'mandate-race',
        orgId: 'org-1',
        title: 'Race Test',
        organization: { id: 'org-1', name: 'roboto' },
      };
    });
    const stagesOut = [
      { id: 'r1', name: 'Sourced', stageType: 'SCREENING', stageOrder: 1, hiringPlanId: 'hp-r' },
    ];
    prisma.pipelineStage = {
      findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(stagesOut),
      createMany: jest.fn().mockResolvedValue({ count: 5 }),
    };
    prisma.hiringPlan = {
      findFirst: jest.fn().mockResolvedValue({ id: 'hp-r' }),
    };

    const [a, b] = await Promise.all([
      service.ensureMandatePipelineSetup('org-1', 'mandate-race'),
      service.ensureMandatePipelineSetup('org-1', 'mandate-race'),
    ]);

    expect(prisma.pipelineStage.createMany).toHaveBeenCalledTimes(1);
    expect(a.stages).toEqual(b.stages);
  });
});
