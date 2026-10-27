import { Test, TestingModule } from '@nestjs/testing';
import { CandidatePortalService } from './candidate-portal.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiScreeningService } from '../ai-screening/ai-screening.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';
import { ConsentStatus } from '@prisma/client';

describe('CandidatePortalService', () => {
  let service: CandidatePortalService;
  let prisma: any;

  const mockProfile = {
    id: 'profile-uuid-1',
    auth0Sub: 'auth0|12345',
    email: 'candidate@example.com',
    emailHash: 'hash123',
    name: 'Jane Doe',
    phone: '+919876543210',
    headline: 'Senior Fullstack Engineer',
    currentCompany: 'Tech Corp',
    currentDesignation: 'Lead Dev',
    experienceYears: 7.5,
    skills: ['Node.js', 'React', 'PostgreSQL'],
    education: [{ degree: 'B.Tech' }],
    certifications: [{ name: 'AWS Certified' }],
    currentLocation: 'Bengaluru',
    preferredLocations: ['Bengaluru', 'Remote'],
    currentCtc: 2500000,
    expectedCtc: 3200000,
    noticePeriodDays: 30,
    preferredRoles: ['Staff Engineer'],
    preferredIndustries: ['Fintech'],
    workModel: 'HYBRID',
    profileLinks: { linkedin: 'https://linkedin.com/in/janedoe' },
    resumeUrl: 'resumes/jane.pdf',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    applications: [
      {
        id: 'app-1',
        status: 'ACTIVE',
        appliedAt: new Date('2025-01-05'),
        hiringPlan: {
          id: 'plan-1',
          title: 'Fullstack Mandate',
          designation: 'Senior Dev',
          department: 'Engineering',
          organization: { id: 'org-1', name: 'Acme Corp' },
        },
      },
    ],
    referrals: [
      {
        id: 'ref-1',
        status: 'ACTIVATED',
        recruiterNote: 'Top candidate',
        createdAt: new Date('2025-01-02'),
        mandate: {
          id: 'mandate-1',
          title: 'Fullstack Dev',
          organization: { id: 'org-1', name: 'Acme Corp' },
        },
        recruiter: {
          id: 'recruiter-1',
          name: 'Bob Recruiter',
        },
      },
    ],
    consents: [
      {
        id: 'consent-1',
        status: ConsentStatus.ACCEPTED,
        respondedAt: new Date('2025-01-03'),
        expiresAt: new Date('2025-01-10'),
        requestedAt: new Date('2025-01-02'),
      },
    ],
    savedJobs: [
      {
        id: 'saved-1',
        savedAt: new Date('2025-01-04'),
        mandate: {
          id: 'mandate-2',
          title: 'Backend Dev',
          organization: { id: 'org-2', name: 'Beta Ltd' },
        },
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      candidateProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      savedJob: {
        deleteMany: jest.fn(),
      },
      candidateConsent: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (actions: any[]) => Promise.all(actions)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatePortalService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AiScreeningService,
          useValue: {
            evaluateReferralFit: jest.fn(),
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

    service = module.get<CandidatePortalService>(CandidatePortalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportCandidateData (P2-12)', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(null);
      await expect(service.exportCandidateData('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return a structured GDPR/DPDP export package', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.exportCandidateData('profile-uuid-1');
      expect(result).toBeDefined();
      expect(result.compliance).toBe('GDPR_ARTICLE_20_AND_DPDP_SECTION_11');
      expect(result.dataSubject.email).toBe('candidate@example.com');
      expect(result.dataSubject.name).toBe('Jane Doe');
      expect(result.applications).toHaveLength(1);
      expect(result.referrals).toHaveLength(1);
      expect(result.consents).toHaveLength(1);
      expect(result.savedJobs).toHaveLength(1);
    });
  });

  describe('eraseCandidateData (P2-12)', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(null);
      await expect(service.eraseCandidateData('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should scrub PII and anonymize the candidate profile in a transaction', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(mockProfile);
      prisma.savedJob.deleteMany.mockResolvedValue({ count: 1 });
      prisma.candidateConsent.updateMany.mockResolvedValue({ count: 1 });
      prisma.candidateProfile.update.mockResolvedValue({ id: 'profile-uuid-1' });

      const result = await service.eraseCandidateData('profile-uuid-1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('anonymized');

      expect(prisma.savedJob.deleteMany).toHaveBeenCalledWith({
        where: { candidateProfileId: 'profile-uuid-1' },
      });
      expect(prisma.candidateConsent.updateMany).toHaveBeenCalledWith({
        where: {
          candidateProfileId: 'profile-uuid-1',
          status: ConsentStatus.PENDING,
        },
        data: { status: ConsentStatus.EXPIRED },
      });
      expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'profile-uuid-1' },
          data: expect.objectContaining({
            name: 'Deleted Candidate',
            phone: null,
            auth0Sub: null,
            resumeUrl: null,
            isActive: false,
          }),
        }),
      );
    });
  });
});
