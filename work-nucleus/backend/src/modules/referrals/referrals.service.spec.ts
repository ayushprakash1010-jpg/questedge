import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../comms/email.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ReferralsService', () => {
  let service: ReferralsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        {
          provide: PrismaService,
          useValue: {
            recruiterProfile: { findUnique: jest.fn() },
            mandate: { findUnique: jest.fn() },
            candidateProfile: { findFirst: jest.fn(), create: jest.fn() },
            referral: { create: jest.fn(), findMany: jest.fn() },
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendConsentRequest: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
