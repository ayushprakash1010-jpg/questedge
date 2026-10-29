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
});
