import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  GoneException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AiScreeningService } from '../ai-screening/ai-screening.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CandidateProfile, ConsentStatus, Role } from '@prisma/client';
import {
  UpsertCandidateProfileDto,
  DirectApplyDto,
} from './dto/candidate-portal.dto';
import { FilterMandateDto } from '../mandates/dto/filter-mandate.dto';
import { PaginatedResult } from '../mandates/mandates.service';
import { calculateReferralReward } from '../rewards/rewards.service';

@Injectable()
export class CandidatePortalService {
  private readonly logger = new Logger(CandidatePortalService.name);

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
    emailVerified: boolean = false,
  ): Promise<CandidateProfile> {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    if (!cleanEmail)
      throw new BadRequestException('Email is required to create a profile.');

    const emailHash = crypto
      .createHash('sha256')
      .update(cleanEmail)
      .digest('hex');
    const cleanPhone = dto.phone ? dto.phone.trim() : null;
    const phoneHash = cleanPhone
      ? crypto.createHash('sha256').update(cleanPhone).digest('hex')
      : null;

    // 1. Resolve existing profile across auth0Sub, emailHash, or cleanEmail
    const existingBySub = auth0Sub
      ? await this.prisma.candidateProfile.findUnique({ where: { auth0Sub } })
      : null;

    if (auth0Sub && !existingBySub) {
      if (this.prisma.user) {
        const existingUser = await this.prisma.user.findUnique({
          where: { auth0Sub },
        });
        if (existingUser) {
          throw new ConflictException(
            'User is already registered as a company user',
          );
        }
      }
      if (this.prisma.recruiterProfile) {
        const existingRecruiter = await this.prisma.recruiterProfile.findUnique({
          where: { auth0Sub },
        });
        if (existingRecruiter) {
          throw new ConflictException(
            'User is already registered as a recruiter',
          );
        }
      }
    }

    let existingByHash = await this.prisma.candidateProfile.findUnique({
      where: { emailHash },
    });

    if (!existingByHash) {
      existingByHash = await this.prisma.candidateProfile.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      });
    }

    const data = {
      name: dto.name,
      phone: cleanPhone,
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

    // 2. Resolve target canonical profile and handle merging if needed
    let canonical = existingByHash || existingBySub;

    if (
      existingBySub &&
      existingByHash &&
      existingBySub.id !== existingByHash.id
    ) {
      // Reassign foreign key dependencies from existingBySub to existingByHash
      const tempId = existingBySub.id;
      const targetId = existingByHash.id;

      await Promise.allSettled([
        this.prisma.candidateApplication.updateMany({
          where: { candidateProfileId: tempId },
          data: { candidateProfileId: targetId },
        }),
        this.prisma.candidateConsent.updateMany({
          where: { candidateProfileId: tempId },
          data: { candidateProfileId: targetId },
        }),
        this.prisma.savedJob.updateMany({
          where: { candidateProfileId: tempId },
          data: { candidateProfileId: targetId },
        }),
        this.prisma.referral.updateMany({
          where: { candidateProfileId: tempId },
          data: { candidateProfileId: targetId },
        }),
        this.prisma.claimScope.updateMany({
          where: { candidateProfileId: tempId },
          data: { candidateProfileId: targetId },
        }),
      ]);

      // Safely delete temporary profile
      await this.prisma.candidateProfile
        .delete({ where: { id: tempId } })
        .catch(() => {});
      canonical = existingByHash;
    }

    // 3. Prevent phoneHash unique constraint collisions across candidate profiles
    let safePhoneHash = phoneHash;
    if (phoneHash) {
      const phoneConflict = await this.prisma.candidateProfile.findUnique({
        where: { phoneHash },
      });
      if (phoneConflict && phoneConflict.id !== canonical?.id) {
        safePhoneHash = canonical?.phoneHash ?? null;
      }
    }

    // 4. Update existing profile
    if (canonical) {
      // ── P0-06: Never overwrite a non-null auth0Sub with a different value ──
      // If the profile already has an auth0Sub that differs from the caller,
      // the caller does NOT own this profile. Refuse the takeover.
      if (
        canonical.auth0Sub &&
        canonical.auth0Sub !== auth0Sub
      ) {
        throw new ConflictException(
          'This email is associated with a different account. ' +
          'Please log in with the original account or contact support.',
        );
      }

      return this.prisma.candidateProfile.update({
        where: { id: canonical.id },
        data: {
          auth0Sub,
          email: cleanEmail,
          emailHash,
          phoneHash: safePhoneHash ?? canonical.phoneHash,
          ...data,
          isProfileComplete: this.isProfileComplete(dto),
        },
      });
    }

    // 5. Create new profile with P2002 conflict fallback
    try {
      return await this.prisma.candidateProfile.create({
        data: {
          auth0Sub,
          email: cleanEmail,
          emailHash,
          phoneHash: safePhoneHash,
          ...data,
          isProfileComplete: this.isProfileComplete(dto),
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const fallback = await this.prisma.candidateProfile.findFirst({
          where: {
            OR: [
              { emailHash },
              { email: { equals: cleanEmail, mode: 'insensitive' } },
              ...(auth0Sub ? [{ auth0Sub }] : []),
            ],
          },
        });
        if (fallback) {
          return this.prisma.candidateProfile.update({
            where: { id: fallback.id },
            data: {
              auth0Sub,
              email: cleanEmail,
              emailHash,
              ...data,
              isProfileComplete: this.isProfileComplete(dto),
            },
          });
        }
      }
      throw err;
    }
  }

  async getMyProfile(
    auth0Sub: string,
    email?: string,
    emailVerified: boolean = false,
  ): Promise<CandidateProfile> {
    let profile = await this.prisma.candidateProfile.findUnique({
      where: { auth0Sub },
      include: {
        _count: {
          select: {
            referrals: true,
            applications: true,
            savedJobs: true,
            consents: true,
          },
        },
      },
    });

    if (!profile && email && !email.includes('@placeholder.com')) {
      const cleanEmail = email.toLowerCase().trim();
      const emailHash = crypto
        .createHash('sha256')
        .update(cleanEmail)
        .digest('hex');

      profile = await this.prisma.candidateProfile.findFirst({
        where: {
          OR: [
            { emailHash },
            { email: { equals: cleanEmail, mode: 'insensitive' } },
          ],
        },
        include: {
          _count: {
            select: {
              referrals: true,
              applications: true,
              savedJobs: true,
              consents: true,
            },
          },
        },
      });

      if (profile && !profile.auth0Sub && emailVerified) {
        // P0-06: Only auto-link auth0Sub if:
        // 1. The profile has no existing auth0Sub (unclaimed)
        // 2. The caller's email is verified (from JWT claim)
        profile = await this.prisma.candidateProfile.update({
          where: { id: profile.id },
          data: { auth0Sub },
          include: {
            _count: {
              select: {
                referrals: true,
                applications: true,
                savedJobs: true,
                consents: true,
              },
            },
          },
        });
      }
    }

    if (!profile)
      throw new NotFoundException(
        'Candidate profile not found. Please create one first.',
      );
    return profile;
  }

  async parseResumeText(text: string): Promise<any> {
    return this.aiScreening.parseResumeToProfile(text);
  }

  async updateResume(
    candidateId: string,
    resumeUrl: string,
  ): Promise<CandidateProfile> {
    return this.prisma.candidateProfile.update({
      where: { id: candidateId },
      data: { resumeUrl },
    });
  }

  /**
   * Retrieves candidate resume key after verifying that the caller is authorized to view it (P2-06).
   * - Candidate can view their own resume.
   * - Company users can view resumes of candidates who applied or were referred to their company.
   * - Recruiters can view resumes of candidates they referred.
   */
  async getCandidateResumeKeyWithAuth(
    user: any,
    candidateId: string,
  ): Promise<string> {
    const candidate = await this.prisma.candidateProfile.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate profile not found.');
    }
    if (!candidate.resumeUrl) {
      throw new NotFoundException('No resume uploaded for this candidate.');
    }

    // 1. Candidate themselves
    if (user.auth0Sub && candidate.auth0Sub === user.auth0Sub) {
      return candidate.resumeUrl;
    }

    // 2. Company user: Candidate has an application or referral with their organization
    if (user.orgId) {
      const hasApplication = await this.prisma.candidateApplication.findFirst({
        where: {
          candidateId,
          hiringPlan: { orgId: user.orgId },
        },
      });
      if (hasApplication) return candidate.resumeUrl;

      const hasReferral = await this.prisma.referral.findFirst({
        where: {
          candidateProfileId: candidateId,
          mandate: { orgId: user.orgId },
        },
      });
      if (hasReferral) return candidate.resumeUrl;
    }

    // 3. Recruiter: Recruiter referred this candidate
    if (user.auth0Sub) {
      const recruiterProfile = await this.prisma.recruiterProfile.findUnique({
        where: { auth0Sub: user.auth0Sub },
      });
      if (recruiterProfile) {
        const hasReferral = await this.prisma.referral.findFirst({
          where: {
            candidateProfileId: candidateId,
            recruiterId: recruiterProfile.id,
          },
        });
        if (hasReferral) return candidate.resumeUrl;
      }
    }

    // 4. Platform / Support Admin
    if (user.role === Role.SUPPORT_ADMIN || user.role === Role.SUPPORT_REP) {
      return candidate.resumeUrl;
    }

    throw new ForbiddenException(
      'You do not have permission to access this candidate resume.',
    );
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
    if (filter.location)
      where.location = { contains: filter.location, mode: 'insensitive' };
    if (filter.workModel) where.workModel = filter.workModel;
    if (filter.minReward)
      where.referralRewardAmount = { gte: filter.minReward };

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
    const mandate = await this.prisma.mandate.findUnique({
      where: { id: mandateId },
    });
    if (!mandate) throw new NotFoundException('Mandate not found.');

    const existing = await this.prisma.savedJob.findUnique({
      where: {
        candidateProfileId_mandateId: {
          candidateProfileId: candidateId,
          mandateId,
        },
      },
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

  async applyDirectly(
    candidateProfileId: string,
    mandateId: string,
    dto: DirectApplyDto,
  ) {
    const [mandate, candidateProfile, existingApp] = await Promise.all([
      this.prisma.mandate.findUnique({
        where: { id: mandateId },
        include: { organization: true },
      }),
      this.prisma.candidateProfile.findUnique({
        where: { id: candidateProfileId },
      }),
      this.prisma.candidateApplication.findFirst({
        where: { candidateProfileId, mandateId },
      }),
    ]);

    if (!mandate) throw new NotFoundException('Mandate not found.');
    if (mandate.status !== 'ACTIVE')
      throw new BadRequestException(
        'This mandate is no longer accepting applications.',
      );
    if (!mandate.acceptsDirectApply)
      throw new BadRequestException(
        'This mandate only accepts recruiter referrals.',
      );
    if (!candidateProfile)
      throw new NotFoundException('Candidate profile not found.');
    if (existingApp)
      throw new ConflictException('You have already applied to this mandate.');

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
              select: {
                id: true,
                name: true,
                headline: true,
                isVerified: true,
              },
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
    if (consent.expiresAt < new Date())
      throw new GoneException('Consent request has expired.');

    return consent;
  }

  async respondToConsent(
    consentToken: string,
    accepted: boolean,
    ipAddress: string,
  ) {
    const consent = await this.prisma.candidateConsent.findUnique({
      where: { consentToken },
      include: {
        referral: {
          include: { mandate: true, recruiter: true, candidateProfile: true },
        },
      },
    });

    if (!consent)
      throw new NotFoundException(
        'Consent request not found. The link may be invalid.',
      );
    if (consent.status !== 'PENDING') {
      throw new BadRequestException(
        `This consent request has already been ${consent.status.toLowerCase()}.`,
      );
    }
    if (consent.expiresAt < new Date()) {
      await this.prisma.candidateConsent.update({
        where: { id: consent.id },
        data: { status: 'EXPIRED' },
      });
      throw new GoneException(
        'This consent request has expired. Ask the recruiter to re-send.',
      );
    }

    const newConsentStatus: ConsentStatus = accepted ? 'ACCEPTED' : 'DECLINED';
    const newReferralStatus = accepted
      ? 'CANDIDATE_ACCEPTED'
      : 'CANDIDATE_DECLINED';

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
      const calculatedReward = calculateReferralReward(
        consent.referral.mandate,
      );
      txOps.push(
        this.prisma.rewardTracking.create({
          data: {
            referralId: consent.referralId,
            mandateId: consent.referral.mandate.id,
            orgId: consent.referral.mandate.orgId,
            recruiterId: consent.referral.recruiterId,
            rewardAmount: calculatedReward,
            currency: consent.referral.mandate.currency,
            status: 'POTENTIAL',
          },
        }),
      );
    }

    // Update both consent, referral, and reward atomically
    const [updatedConsent] = await this.prisma.$transaction(txOps);

    // Notify Recruiter (via Email only, since Notification table is for Company Users)
    if (accepted && consent.referral.recruiter?.auth0Sub) {
      // Just trigger the AI screening, email can be added later
      this.aiScreening.evaluateReferralFit(consent.referralId).catch((err) => {
        // Just log, we don't want to fail the consent API call
        console.error('Failed to trigger AI scoring for referral:', err);
      });
    }

    // Also Notify Company (Company Admin)
    if (accepted) {
      // Find company admins (P2-05 / F-12: Match by role: Role.ADMIN or userType: COMPANY_ADMIN)
      const admins = await this.prisma.user.findMany({
        where: {
          orgId: consent.referral.mandate.orgId,
          OR: [{ role: Role.ADMIN }, { userType: 'COMPANY_ADMIN' }],
        },
      });
      for (const admin of admins) {
        await this.notifications
          .create({
            userId: admin.id,
            orgId: admin.orgId,
            type: 'NEW_REFERRAL',
            title: 'New Candidate Referral!',
            body: `${consent.referral.candidateProfile?.name} was just referred for ${consent.referral.mandate?.title}. AI Scoring is in progress.`,
            entityType: 'REFERRAL',
            entityId: consent.referral.id,
            actionUrl: `/company/mandates/${consent.referral.mandate.id}`,
          })
          .catch((err) =>
            console.error('Failed to create admin notification:', err),
          );
      }
    }

    if (accepted) {
      // Trigger AI Screening async (don't block the response)
      this.aiScreening.evaluateReferralFit(consent.referralId).catch((err) => {
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

  // ── P2-12: Privacy & Data-Subject Rights (GDPR / DPDP) ───────────

  /**
   * Export all personal data belonging to candidate
   * Complies with GDPR Art. 20 (Data Portability) and DPDP Act 2023 Sec. 11.
   */
  async exportCandidateData(profileId: string) {
    const profile: any = await this.prisma.candidateProfile.findUnique({
      where: { id: profileId },
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            hiringPlan: {
              select: {
                id: true,
                title: true,
                designation: true,
                department: true,
                organization: { select: { id: true, name: true } },
              },
            },
          },
        },
        referrals: {
          select: {
            id: true,
            status: true,
            recruiterNote: true,
            createdAt: true,
            mandate: {
              select: {
                id: true,
                title: true,
                organization: { select: { id: true, name: true } },
              },
            },
            recruiter: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        consents: {
          select: {
            id: true,
            status: true,
            respondedAt: true,
            expiresAt: true,
            requestedAt: true,
          },
        },
        savedJobs: {
          select: {
            id: true,
            savedAt: true,
            mandate: {
              select: {
                id: true,
                title: true,
                organization: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    return {
      exportDate: new Date().toISOString(),
      formatVersion: '1.0',
      compliance: 'GDPR_ARTICLE_20_AND_DPDP_SECTION_11',
      dataSubject: {
        id: profile.id,
        auth0Sub: profile.auth0Sub,
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
        headline: profile.headline,
        currentCompany: profile.currentCompany,
        currentDesignation: profile.currentDesignation,
        experienceYears: profile.experienceYears,
        skills: profile.skills,
        education: profile.education,
        certifications: profile.certifications,
        currentLocation: profile.currentLocation,
        preferredLocations: profile.preferredLocations,
        currentCtc: profile.currentCtc,
        expectedCtc: profile.expectedCtc,
        noticePeriodDays: profile.noticePeriodDays,
        preferredRoles: profile.preferredRoles,
        preferredIndustries: profile.preferredIndustries,
        workModel: profile.workModel,
        profileLinks: profile.profileLinks,
        resumeUrl: profile.resumeUrl,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      applications: profile.applications,
      referrals: profile.referrals,
      consents: profile.consents,
      savedJobs: profile.savedJobs,
    };
  }

  /**
   * Right to erasure / Anonymization
   * Cryptographically anonymizes and scrubs candidate PII while maintaining auditability.
   * Complies with GDPR Art. 17 (Right to Erasure) and DPDP Act 2023 Sec. 12.
   */
  async eraseCandidateData(profileId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    const anonymizedEmail = `erased-${profile.id.slice(0, 8)}@deleted.questedge.local`;
    const anonymizedEmailHash = crypto
      .createHash('sha256')
      .update(anonymizedEmail)
      .digest('hex');

    // Perform erasure inside a transaction
    await this.prisma.$transaction([
      // 1. Remove saved jobs
      this.prisma.savedJob.deleteMany({
        where: { candidateProfileId: profileId },
      }),

      // 2. Expire any pending consents
      this.prisma.candidateConsent.updateMany({
        where: { candidateProfileId: profileId, status: ConsentStatus.PENDING },
        data: { status: ConsentStatus.EXPIRED },
      }),

      // 3. Anonymize the candidate profile PII
      this.prisma.candidateProfile.update({
        where: { id: profileId },
        data: {
          name: 'Deleted Candidate',
          email: anonymizedEmail,
          emailHash: anonymizedEmailHash,
          phone: null,
          phoneHash: null,
          auth0Sub: null,
          headline: null,
          currentCompany: null,
          currentDesignation: null,
          currentLocation: null,
          resumeUrl: null,
          skills: [],
          education: [],
          certifications: [],
          preferredLocations: [],
          preferredRoles: [],
          preferredIndustries: [],
          profileLinks: {},
          isProfileComplete: false,
          isActive: false,
        },
      }),
    ]);

    this.logger.log(
      `Candidate profile ${profileId} personal data successfully scrubbed and anonymized.`,
    );

    return {
      success: true,
      message:
        'Candidate personal data has been securely scrubbed and anonymized in compliance with GDPR and DPDP standards.',
      erasedAt: new Date().toISOString(),
    };
  }
}
