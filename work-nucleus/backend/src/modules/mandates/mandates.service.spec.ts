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
});
