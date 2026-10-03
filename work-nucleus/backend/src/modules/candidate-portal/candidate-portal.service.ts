import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  GoneException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AiScreeningService } from '../ai-screening/ai-screening.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CandidateProfile, ConsentStatus } from '@prisma/client';
import {
  UpsertCandidateProfileDto,
  DirectApplyDto,
} from './dto/candidate-portal.dto';
import { FilterMandateDto } from '../mandates/dto/filter-mandate.dto';
import { PaginatedResult } from '../mandates/mandates.service';

@Injectable()
export class CandidatePortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiScreening: AiScreeningService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Profile ─────────────────────────────────────────────────────

  async upsertProfile(
    auth0Sub: string,
    email: string,
    dto: UpsertCandidateProfileDto,
  ): Promise<CandidateProfile> {
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
    const phoneHash = dto.phone
      ? crypto.createHash('sha256').update(dto.phone).digest('hex')
      : undefined;

    const existing = await this.prisma.candidateProfile.findUnique({ where: { auth0Sub } });

    const data = {
      name: dto.name,
      phone: dto.phone,
      headline: dto.headline,
      currentCompany: dto.currentCompany,
      currentDesignation: dto.currentDesignation,
      experienceYears: dto.experienceYears ?? undefined,
      skills: dto.skills ?? [],
      education: dto.education ?? [],
      certifications: dto.certifications ?? [],
      currentLocation: dto.currentLocation,
      preferredLocations: dto.preferredLocations ?? [],
      currentCtc: dto.currentCtc ?? undefined,
      expectedCtc: dto.expectedCtc ?? undefined,
      noticePeriodDays: dto.noticePeriodDays,
      preferredRoles: dto.preferredRoles ?? [],
      preferredIndustries: dto.preferredIndustries ?? [],
      workModel: dto.workModel,
      profileLinks: dto.profileLinks ?? {},
    };

    if (existing) {
      // Update existing
      return this.prisma.candidateProfile.update({
        where: { id: existing.id },
        data: {
          ...data,
          phoneHash: phoneHash ?? existing.phoneHash,
          isProfileComplete: this.isProfileComplete(dto),
        },
      });
    }

    // Create new profile
    return this.prisma.candidateProfile.create({
      data: {
        auth0Sub,
        email,
        emailHash,
        phoneHash,
        ...data,
        isProfileComplete: this.isProfileComplete(dto),
      },
    });
  }

  async getMyProfile(auth0Sub: string): Promise<CandidateProfile> {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { auth0Sub },
      include: {
        _count: {
          select: { referrals: true, applications: true, savedJobs: true, consents: true },
        },
      },
    });

    if (!profile) throw new NotFoundException('Candidate profile not found. Please create one first.');
    return profile;
  }

  async parseResumeText(text: string): Promise<any> {
    return this.aiScreening.parseResumeToProfile(text);
  }

  async updateResume(candidateId: string, resumeUrl: string): Promise<CandidateProfile> {
    return this.prisma.candidateProfile.update({
      where: { id: candidateId },
      data: { resumeUrl },
    });
  }

  // ── Job Discovery ────────────────────────────────────────────────

  async discoverJobs(
    candidateId: string,
    filter: FilterMandateDto,
  ): Promise<PaginatedResult<any>> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };

    if (filter.q) {
      where.OR = [
        { title: { contains: filter.q, mode: 'insensitive' } },
        { description: { contains: filter.q, mode: 'insensitive' } },
      ];
    }
    if (filter.location) where.location = { contains: filter.location, mode: 'insensitive' };
    if (filter.workModel) where.workModel = filter.workModel;
    if (filter.minReward) where.referralRewardAmount = { gte: filter.minReward };

    const [mandates, total, savedJobIds] = await Promise.all([
      this.prisma.mandate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { participations: true } },
        },
      }),
      this.prisma.mandate.count({ where }),
      this.prisma.savedJob.findMany({
        where: { candidateProfileId: candidateId },
        select: { mandateId: true },
      }),
    ]);

    const savedSet = new Set(savedJobIds.map((s) => s.mandateId));

    return {
      data: mandates.map((m) => ({ ...m, isSaved: savedSet.has(m.id) })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ── Saved Jobs ───────────────────────────────────────────────────

  async toggleSaveJob(
    candidateId: string,
    mandateId: string,
  ): Promise<{ saved: boolean }> {
    const mandate = await this.prisma.mandate.findUnique({ where: { id: mandateId } });
    if (!mandate) throw new NotFoundException('Mandate not found.');

    const existing = await this.prisma.savedJob.findUnique({
      where: { candidateProfileId_mandateId: { candidateProfileId: candidateId, mandateId } },
    });

    if (existing) {
      await this.prisma.savedJob.delete({ where: { id: existing.id } });
      return { saved: false };
    }

    await this.prisma.savedJob.create({
      data: { candidateProfileId: candidateId, mandateId },
    });
    return { saved: true };
  }

  async getSavedJobs(candidateId: string) {
    return this.prisma.savedJob.findMany({
      where: { candidateProfileId: candidateId },
      orderBy: { savedAt: 'desc' },
      include: {
        mandate: {
          include: { organization: { select: { id: true, name: true } } },
        },
      },
    });
  }


  async applyDirectly(candidateProfileId: string, mandateId: string, dto: DirectApplyDto) {
    const [mandate, candidateProfile, existingApp] = await Promise.all([
      this.prisma.mandate.findUnique({
        where: { id: mandateId },
        include: { organization: true },
      }),
      this.prisma.candidateProfile.findUnique({ where: { id: candidateProfileId } }),
      this.prisma.candidateApplication.findFirst({
        where: { candidateProfileId, mandateId },
      }),
    ]);

    if (!mandate) throw new NotFoundException('Mandate not found.');
    if (mandate.status !== 'ACTIVE') throw new BadRequestException('This mandate is no longer accepting applications.');
    if (!mandate.acceptsDirectApply) throw new BadRequestException('This mandate only accepts recruiter referrals.');
    if (!candidateProfile) throw new NotFoundException('Candidate profile not found.');
    if (existingApp) throw new ConflictException('You have already applied to this mandate.');

    // Find or create a legacy Candidate record in the mandate org.
    // CandidateApplication.candidateId requires a Candidate (org-scoped ATS model).
    // Match by email within the org; create a lightweight record if absent.
    let legacyCandidate = await this.prisma.candidate.findFirst({
      where: { orgId: mandate.orgId, email: candidateProfile.email },
    });

    if (!legacyCandidate) {
      legacyCandidate = await this.prisma.candidate.create({
        data: {
          orgId: mandate.orgId,
          name: candidateProfile.name,
          email: candidateProfile.email,
          phone: candidateProfile.phone ?? undefined,
          source: 'DIRECT',
          currentRole: candidateProfile.currentDesignation ?? undefined,
          currentCompany: candidateProfile.currentCompany ?? undefined,
          experienceYears: candidateProfile.experienceYears ?? undefined,
          expectedCtc: candidateProfile.expectedCtc ?? undefined,
        },
      });
    }

    // hiringPlanId is required by the legacy CandidateApplication schema.
    // Use the most recent active HiringPlan for this org as a placeholder.
    const hiringPlan = await this.prisma.hiringPlan.findFirst({
      where: { orgId: mandate.orgId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!hiringPlan) {
      throw new BadRequestException(
        'This company has not set up a hiring plan yet. Direct applications are unavailable.',
      );
    }

    return this.prisma.candidateApplication.create({
      data: {
        candidateId: legacyCandidate.id,
        hiringPlanId: hiringPlan.id,
        mandateId,
        candidateProfileId,
        sourceType: 'DIRECT_APPLICATION',
        coverLetter: dto.coverLetter,
        status: 'ACTIVE',
      },
    });
  }

  async getMyApplications(candidateId: string) {
    const [applications, referrals] = await Promise.all([
      this.prisma.candidateApplication.findMany({
        where: { candidateProfileId: candidateId },
        include: {
          mandate: {
            select: {
              id: true,
              title: true,
              organization: { select: { name: true } },
              location: true,
              workModel: true,
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      }),
      this.prisma.referral.findMany({
        where: { candidateProfileId: candidateId },
        include: {
          mandate: {
            select: {
              id: true,
              title: true,
              organization: { select: { name: true } },
              location: true,
              workModel: true,
            },
          },
          recruiter: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { applications, referrals };
  }

  // ── Consent ──────────────────────────────────────────────────────

  async getPendingConsents(candidateId: string) {
    return this.prisma.candidateConsent.findMany({
      where: {
        candidateProfileId: candidateId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        referral: {
          include: {
            mandate: {
              select: {
                id: true,
                title: true,
                department: true,
                location: true,
                workModel: true,
                referralRewardAmount: true,
                organization: { select: { id: true, name: true } },
              },
            },
            recruiter: {
              select: { id: true, name: true, headline: true, isVerified: true },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async previewConsent(consentToken: string) {
    const consent = await this.prisma.candidateConsent.findUnique({
      where: { consentToken },
      include: {
        referral: {
          include: {
            mandate: {
              select: {
                title: true,
                department: true,
                location: true,
                workModel: true,
                referralRewardAmount: true,
                organization: { select: { name: true } },
              },
            },
            recruiter: {
              select: { name: true, headline: true, isVerified: true },
            },
          },
        },
      },
    });

    if (!consent) throw new NotFoundException('Consent request not found.');
    if (consent.expiresAt < new Date()) throw new GoneException('Consent request has expired.');
    
    return consent;
  }

  async respondToConsent(
    consentToken: string,
    accepted: boolean,
    ipAddress: string,
  ) {
    const consent = await this.prisma.candidateConsent.findUnique({
      where: { consentToken },
      include: { referral: { include: { mandate: true, recruiter: true, candidateProfile: true } } },
    });

    if (!consent) throw new NotFoundException('Consent request not found. The link may be invalid.');
    if (consent.status !== 'PENDING') {
      throw new BadRequestException(`This consent request has already been ${consent.status.toLowerCase()}.`);
    }
    if (consent.expiresAt < new Date()) {
      await this.prisma.candidateConsent.update({
        where: { id: consent.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneException('This consent request has expired. Ask the recruiter to re-send.');
    }

    const newConsentStatus: ConsentStatus = accepted ? 'ACCEPTED' : 'DECLINED';
    const newReferralStatus = accepted ? 'CANDIDATE_ACCEPTED' : 'CANDIDATE_DECLINED';

    // Build transaction operations
    const txOps: any[] = [
      this.prisma.candidateConsent.update({
        where: { id: consent.id },
        data: {
          status: newConsentStatus,
          respondedAt: new Date(),
          ipAddress,
        },
      }),
      this.prisma.referral.update({
        where: { id: consent.referralId },
        data: {
          status: newReferralStatus,
          ...(accepted ? { activatedAt: new Date() } : {}),
        },
      }),
    ];

    // If accepted and the mandate has a reward, create a RewardTracking record
    if (accepted && consent.referral.mandate.referralRewardAmount) {
      txOps.push(
        this.prisma.rewardTracking.create({
          data: {
            referralId: consent.referralId,
            mandateId: consent.referral.mandate.id,
            orgId: consent.referral.mandate.orgId,
            recruiterId: consent.referral.recruiterId,
            rewardAmount: consent.referral.mandate.referralRewardAmount,
            currency: consent.referral.mandate.currency,
            status: 'POTENTIAL',
          },
        })
      );
    }

    // Update both consent, referral, and reward atomically
    const [updatedConsent] = await this.prisma.$transaction(txOps);

    // Notify Recruiter
    if (accepted && consent.referral.recruiter?.auth0Sub) {
      await this.notifications.create({
        userId: consent.referral.recruiter.auth0Sub,
        orgId: consent.referral.mandate.orgId,
        type: 'CONSENT_ACCEPTED',
        title: 'Candidate Accepted Referral',
        body: `${consent.referral.candidateProfile?.name} has accepted your referral for ${consent.referral.mandate?.title}.`,
        entityType: 'REFERRAL',
        entityId: consent.referral.id,
        actionUrl: `/recruiter/dashboard`, // They will see it in pipeline
      });
      
      // Background Task: Evaluate the Candidate Fit using Gemini AI
      this.aiScreening.evaluateReferralFit(consent.referralId).catch(err => {
        // Just log, we don't want to fail the consent API call
        console.error('Failed to trigger AI scoring for referral:', err);
      });
    }

    // Also Notify Company (Company Admin)
    if (accepted) {
      // Find company admins
      const admins = await this.prisma.user.findMany({
        where: { orgId: consent.referral.mandate.orgId, userType: 'COMPANY_ADMIN' }
      });
      for (const admin of admins) {
        await this.notifications.create({
          userId: admin.auth0Sub,
          orgId: admin.orgId,
          type: 'NEW_REFERRAL',
          title: 'New Candidate Referral!',
          body: `${consent.referral.candidateProfile?.name} was just referred for ${consent.referral.mandate?.title}. AI Scoring is in progress.`,
          entityType: 'REFERRAL',
          entityId: consent.referral.id,
          actionUrl: `/company/mandates/${consent.referral.mandate.id}`,
        });
      }
    }

    if (accepted) {
      // Trigger AI Screening async (don't block the response)
      this.aiScreening.evaluateReferralFit(consent.referralId).catch(err => {
        console.error('Failed to trigger AI Screening', err);
      });
    }

    return {
      accepted,
      message: accepted
        ? 'You have accepted the referral. The company has been notified and your profile is now active in their pipeline.'
        : 'You have declined the referral. No further action is needed.',
      consent: updatedConsent,
    };
  }

  // ── Helper ───────────────────────────────────────────────────────

  private isProfileComplete(dto: UpsertCandidateProfileDto): boolean {
    return !!(
      dto.name &&
      dto.currentDesignation &&
      dto.experienceYears !== undefined &&
      dto.skills &&
      dto.skills.length > 0 &&
      dto.currentLocation
    );
  }
}
