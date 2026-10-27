import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;
  let emailService: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'notif-1', ...data })),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'notif-1',
            userId: 'user-uuid-1',
            orgId: 'org-uuid-1',
            type: 'REFERRAL_SUBMITTED',
            title: 'New Referral',
            body: 'John was referred',
            read: false,
            createdAt: new Date(),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-uuid-1', email: 'user@example.com' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'user-uuid-1', email: 'admin@example.com' }]),
      },
      referral: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      claimScope: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      candidateConsent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      rewardTracking: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    emailService = {
      sendNotificationEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create notification row and send email for valid company user', async () => {
      const result = await service.create({
        userId: 'user-uuid-1',
        orgId: 'org-uuid-1',
        type: 'REFERRAL_SUBMITTED',
        title: 'New Candidate',
        body: 'Candidate referred',
      });

      expect(prisma.notification.create).toHaveBeenCalled();
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'user@example.com',
        'New Candidate',
        'Candidate referred',
        undefined,
      );
      expect(result.title).toBe('New Candidate');
    });

    it('should not fail if user is not in users table (principal-agnostic safety)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.create({
        userId: 'candidate-profile-uuid',
        orgId: 'org-uuid-1',
        type: 'CONSENT_REQUESTED',
        title: 'Consent Needed',
        body: 'Please review',
        toEmail: 'candidate@example.com',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'candidate@example.com',
        'Consent Needed',
        'Please review',
        undefined,
      );
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should query notification table for company users with category filtering', async () => {
      const user = { id: 'user-uuid-1', orgId: 'org-uuid-1', userType: 'COMPANY_USER' };
      const res = await service.findAll(user, { page: 1, limit: 10, type: 'REFERRAL' });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-uuid-1', orgId: 'org-uuid-1' }),
        }),
      );
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it('should query live marketplace events for recruiters', async () => {
      prisma.referral.findMany.mockResolvedValue([
        {
          id: 'ref-1',
          status: 'ACTIVATED',
          mandate: { id: 'm-1', title: 'Tech Lead', organization: { name: 'Acme' } },
          candidateProfile: { name: 'Rohan' },
          updatedAt: new Date(),
        },
      ]);

      const recruiter = { id: 'recruiter-uuid-1', userType: 'RECRUITER' };
      const res = await service.findAll(recruiter, { page: 1, limit: 10 });

      expect(prisma.referral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { recruiterId: 'recruiter-uuid-1' } }),
      );
      expect(res.data).toHaveLength(1);
      expect(res.data[0].title).toContain('Candidate Consented: Rohan');
    });
  });

  describe('markAsRead & markAllRead', () => {
    it('should update read flag in database for company users', async () => {
      const user = { id: 'user-uuid-1', orgId: 'org-uuid-1', userType: 'COMPANY_USER' };
      const res = await service.markAsRead(user, ['notif-1']);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['notif-1'] }, userId: 'user-uuid-1' },
        data: { read: true },
      });
      expect(res.success).toBe(true);
    });

    it('should mark all read in database for company users', async () => {
      const user = { id: 'user-uuid-1', orgId: 'org-uuid-1', userType: 'COMPANY_USER' };
      const res = await service.markAllRead(user);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', read: false },
        data: { read: true },
      });
      expect(res.success).toBe(true);
    });
  });
});
