import { Test, TestingModule } from '@nestjs/testing';
import { MandatesService } from './mandates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../comms/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../notifications/whatsapp.service';

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
      ],
    }).compile();

    service = module.get<MandatesService>(MandatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
