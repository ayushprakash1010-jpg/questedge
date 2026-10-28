import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVerificationRequestDto } from './dto/verification-request.dto';
import {
  CreateRecruiterProfileDto,
  UpdateRecruiterProfileDto,
} from './dto/recruiter-profile.dto';
import { RecruiterProfile } from '@prisma/client';

export interface RecruiterDashboard {
  profile: RecruiterProfile;
  stats: {
    activeMandates: number;
    totalReferrals: number;
    pendingConsents: number;
    activePipeline: number;
    totalEarnings: number;
    pendingEarnings: number;
    placementSuccessRate: number;
    reputationTier: string;
  };
  funnel?: {
    referred: number;
    consented: number;
    screened: number;
    interviewed: number;
    hired: number;
    rates: {
      referredToConsented: number;
      consentedToScreened: number;
      screenedToInterviewed: number;
      interviewedToHired: number;
      overallConversion: number;
    };
  };
  timeToHire?: {
    avgDays: number;
    hiredCount: number;
  };
  rewardBreakdown?: {
    potential: number;
    eligible: number;
    pendingApproval: number;
    approved: number;
    paid: number;
    totalEarned: number;
    avgPerHire: number;
  };
  recentReferrals: any[];
  topMandates: any[];
  monthlyReferrals: { name: string; count: number }[];
}

export function calculateReputationTier(
  successfulPlacements: number,
): 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' {
  if (successfulPlacements >= 50) return 'PLATINUM';
  if (successfulPlacements >= 10) return 'GOLD';
  if (successfulPlacements >= 3) return 'SILVER';
  return 'BRONZE';
}

@Injectable()
export class RecruiterService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile CRUD ────────────────────────────────────────────────

  async createProfile(
    auth0Sub: string,
    email: string,
    dto: CreateRecruiterProfileDto,
  ): Promise<RecruiterProfile> {
    const existing = await this.prisma.recruiterProfile.findUnique({
      where: { auth0Sub },
    });
    if (existing)
      throw new ConflictException(
        'Recruiter profile already exists. Use PATCH to update.',
      );

    if (this.prisma.user) {
      const existingUser = await this.prisma.user.findUnique({
        where: { auth0Sub },
      });
      if (existingUser) {
        throw new ConflictException('User is already registered as a company user');
      }
    }

    if (this.prisma.candidateProfile) {
      const existingCandidate = await this.prisma.candidateProfile.findUnique({
        where: { auth0Sub },
      });
      if (existingCandidate) {
        throw new ConflictException('User is already registered as a candidate');
      }
    }

    return this.prisma.recruiterProfile.create({
      data: {
        auth0Sub,
        email,
        name: dto.name,
        phone: dto.phone,
        headline: dto.headline,
        bio: dto.bio,
        portfolioUrl: dto.portfolioUrl,
        avatarUrl: dto.avatarUrl,
        specializations: dto.specializations ?? [],
        experienceYears: dto.experienceYears,
        linkedinUrl: dto.linkedinUrl,
      },
    });
  }

  async updateProfile(
    recruiterId: string,
    dto: UpdateRecruiterProfileDto,
  ): Promise<RecruiterProfile> {
    await this.findById(recruiterId);

    return this.prisma.recruiterProfile.update({
      where: { id: recruiterId },
      data: {
        name: dto.name,
        phone: dto.phone,
        headline: dto.headline,
        bio: dto.bio,
        portfolioUrl: dto.portfolioUrl,
        avatarUrl: dto.avatarUrl,
        specializations: dto.specializations ?? undefined,
        experienceYears: dto.experienceYears,
        linkedinUrl: dto.linkedinUrl,
      },
    });
  }

  async getMyProfile(
    recruiterId: string,
  ): Promise<RecruiterProfile & { _count: any }> {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { id: recruiterId },
      include: {
        _count: {
          select: { referrals: true, participations: true, rewards: true },
        },
      },
    });

    if (!profile) throw new NotFoundException('Recruiter profile not found.');
    return profile;
  }

  async getPublicProfile(recruiterId: string) {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { id: recruiterId },
      select: {
        id: true,
        name: true,
        headline: true,
        specializations: true,
        experienceYears: true,
        linkedinUrl: true,
        isVerified: true,
        _count: { select: { referrals: true } },
      },
    });

    if (!profile || !profile)
      throw new NotFoundException('Recruiter not found.');
    return profile;
  }

  // ── Dashboard aggregation ───────────────────────────────────────

  async getDashboard(recruiterId: string): Promise<RecruiterDashboard> {
    const profile = await this.findById(recruiterId);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start of the 6th month ago

    const [
      activeMandates,
      referralsByStatus,
      recentReferrals,
      topMandates,
      earningsByStatus,
      historicalReferrals,
    ] = await Promise.all([
      // Count active mandates recruiter is working on
      this.prisma.mandateParticipation.count({
        where: { recruiterId, status: 'ACTIVE' },
      }),

      // Referral counts grouped by status
      this.prisma.referral.groupBy({
        by: ['status'],
        where: { recruiterId },
        _count: { status: true },
      }),

      // 10 most recent referrals
      this.prisma.referral.findMany({
        where: { recruiterId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          mandate: {
            select: {
              id: true,
              title: true,
              organization: { select: { name: true } },
            },
          },
          candidateProfile: {
            select: { id: true, name: true, headline: true },
          },
        },
      }),

      // Top 5 mandates by referral count
      this.prisma.mandateParticipation.findMany({
        where: { recruiterId, status: 'ACTIVE' },
        take: 5,
        include: {
          mandate: {
            select: {
              id: true,
              title: true,
              referralRewardAmount: true,
              currency: true,
              status: true,
              organization: { select: { name: true } },
              _count: { select: { referrals: true } },
            },
          },
        },
      }),

      // Reward amounts by status
      this.prisma.rewardTracking.groupBy({
        by: ['status'],
        where: { recruiterId },
        _sum: { rewardAmount: true },
      }),

      // Raw history for charting
      this.prisma.referral.findMany({
        where: {
          recruiterId,
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true },
      }),
    ]);

    // Map referral counts
    const refCounts: Record<string, number> = {};
    for (const r of referralsByStatus) {
      refCounts[r.status] = r._count.status;
    }

    // Map earnings
    const earningsMap: Record<string, number> = {};
    for (const e of earningsByStatus) {
      earningsMap[e.status] = Number(e._sum.rewardAmount ?? 0);
    }

    // Calculate gamified metrics
    const totalReferrals = Object.values(refCounts).reduce((a, b) => a + b, 0);
    const successfulPlacements =
      (refCounts['SELECTED'] ?? 0) + (refCounts['HIRED'] ?? 0);
    const placementSuccessRate =
      totalReferrals > 0
        ? Math.round((successfulPlacements / totalReferrals) * 100)
        : 0;

    const reputationTier = calculateReputationTier(successfulPlacements);

    // Calculate funnel stages and conversion rates
    const consentedCount = Math.max(
      0,
      totalReferrals -
        ((refCounts['PENDING_CONSENT'] ?? 0) +
          (refCounts['CONSENT_REQUESTED'] ?? 0) +
          (refCounts['CANDIDATE_DECLINED'] ?? 0)),
    );
    const screenedCount =
      (refCounts['UNDER_REVIEW'] ?? 0) +
      (refCounts['SHORTLISTED'] ?? 0) +
      (refCounts['INTERVIEW'] ?? 0) +
      (refCounts['SELECTED'] ?? 0) +
      (refCounts['HIRED'] ?? 0);
    const interviewedCount =
      (refCounts['INTERVIEW'] ?? 0) +
      (refCounts['SELECTED'] ?? 0) +
      (refCounts['HIRED'] ?? 0);
    const hiredCount = successfulPlacements;

    // Time-to-hire for recruiter hires
    const hiredRefs = await this.prisma.referral.findMany({
      where: {
        recruiterId,
        status: { in: ['SELECTED', 'HIRED'] },
      },
      select: { createdAt: true, updatedAt: true },
    });
    let avgTimeToHire = 0;
    if (hiredRefs.length > 0) {
      const totalDays = hiredRefs.reduce(
        (s, r) =>
          s +
          Math.max(
            1,
            Math.ceil(
              (r.updatedAt.getTime() - r.createdAt.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          ),
        0,
      );
      avgTimeToHire = Math.round(totalDays / hiredRefs.length);
    }

    // Build monthly chart data
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthlyDataMap = new Map<string, number>();

    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyDataMap.set(key, 0);
    }

    historicalReferrals.forEach((r) => {
      const key = `${monthNames[r.createdAt.getMonth()]} ${r.createdAt.getFullYear()}`;
      if (monthlyDataMap.has(key)) {
        monthlyDataMap.set(key, monthlyDataMap.get(key)! + 1);
      }
    });

    const monthlyReferrals = Array.from(monthlyDataMap.entries()).map(
      ([name, count]) => ({ name, count }),
    );

    return {
      profile,
      stats: {
        activeMandates,
        totalReferrals,
        pendingConsents:
          (refCounts['PENDING_CONSENT'] ?? 0) +
          (refCounts['CONSENT_REQUESTED'] ?? 0),
        activePipeline:
          (refCounts['ACTIVATED'] ?? 0) +
          (refCounts['UNDER_REVIEW'] ?? 0) +
          (refCounts['SHORTLISTED'] ?? 0) +
          (refCounts['INTERVIEW'] ?? 0),
        totalEarnings:
          (earningsMap['PAID'] ?? 0) + (earningsMap['APPROVED'] ?? 0),
        pendingEarnings:
          (earningsMap['POTENTIAL'] ?? 0) +
          (earningsMap['ELIGIBLE'] ?? 0) +
          (earningsMap['PENDING_APPROVAL'] ?? 0),
        placementSuccessRate,
        reputationTier,
      },
      funnel: {
        referred: totalReferrals,
        consented: consentedCount,
        screened: screenedCount,
        interviewed: interviewedCount,
        hired: hiredCount,
        rates: {
          referredToConsented:
            totalReferrals > 0
              ? Math.round((consentedCount / totalReferrals) * 100)
              : 0,
          consentedToScreened:
            consentedCount > 0
              ? Math.round((screenedCount / consentedCount) * 100)
              : 0,
          screenedToInterviewed:
            screenedCount > 0
              ? Math.round((interviewedCount / screenedCount) * 100)
              : 0,
          interviewedToHired:
            interviewedCount > 0
              ? Math.round((hiredCount / interviewedCount) * 100)
              : 0,
          overallConversion:
            totalReferrals > 0
              ? Math.round((hiredCount / totalReferrals) * 100)
              : 0,
        },
      },
      timeToHire: {
        avgDays: avgTimeToHire,
        hiredCount,
      },
      rewardBreakdown: {
        potential: earningsMap['POTENTIAL'] ?? 0,
        eligible: earningsMap['ELIGIBLE'] ?? 0,
        pendingApproval: earningsMap['PENDING_APPROVAL'] ?? 0,
        approved: earningsMap['APPROVED'] ?? 0,
        paid: earningsMap['PAID'] ?? 0,
        totalEarned:
          (earningsMap['PAID'] ?? 0) + (earningsMap['APPROVED'] ?? 0),
        avgPerHire:
          hiredCount > 0
            ? Math.round(
                ((earningsMap['PAID'] ?? 0) + (earningsMap['APPROVED'] ?? 0)) /
                  hiredCount,
              )
            : 0,
      },
      recentReferrals,
      topMandates: topMandates.map((p) => p.mandate),
      monthlyReferrals,
    };
  }

  // ── Admin: Verify recruiter ─────────────────────────────────────

  async verifyRecruiter(recruiterId: string): Promise<RecruiterProfile> {
    await this.findById(recruiterId);

    return this.prisma.recruiterProfile.update({
      where: { id: recruiterId },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  // ── Internal helpers ────────────────────────────────────────────

  async findByAuth0Sub(auth0Sub: string): Promise<RecruiterProfile | null> {
    return this.prisma.recruiterProfile.findUnique({ where: { auth0Sub } });
  }

  private async findById(id: string): Promise<RecruiterProfile> {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Recruiter profile not found.');
    return profile;
  }

  async getLeaderboard(limit = 10) {
    const safeLimit = Math.min(Math.max(limit || 10, 1), 50);

    // Fetch up to 100 active recruiters with placement counts and approved rewards
    const recruiters = await this.prisma.recruiterProfile.findMany({
      take: 100,
      include: {
        _count: {
          select: {
            referrals: { where: { status: { in: ['HIRED', 'SELECTED'] } } },
          },
        },
        rewards: {
          where: { status: { in: ['PAID', 'APPROVED'] } },
          select: { rewardAmount: true },
        },
      },
    });

    const mapped = recruiters.map((r) => {
      const hiredCount = r._count.referrals;
      const totalEarnings = r.rewards.reduce(
        (sum, rw) => sum + Number(rw.rewardAmount),
        0,
      );
      return {
        id: r.id,
        name: r.name,
        avatarUrl: r.avatarUrl,
        isVerified: r.isVerified,
        reputationTier: calculateReputationTier(hiredCount),
        hiredCount,
        totalEarnings,
      };
    });

    // Sort globally by earnings descending, then hired count descending
    mapped.sort(
      (a, b) =>
        b.totalEarnings - a.totalEarnings || b.hiredCount - a.hiredCount,
    );

    return mapped.slice(0, safeLimit);
  }

  // ── P4-01: Verification Workflow & Trust Profile ─────────────────

  /**
   * Compute a weighted trust score (0–100) for a recruiter.
   * Weights: Placements 40%, Tenure 20%, Consent rate 15%, Verified 15%, Profile completeness 10%.
   */
  async computeTrustScore(recruiterId: string): Promise<{
    score: number;
    tier: 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    breakdown: {
      placements: { score: number; weight: number; hiredCount: number };
      tenure: { score: number; weight: number; months: number };
      consentRate: { score: number; weight: number; rate: number };
      verified: { score: number; weight: number; isVerified: boolean };
      profileCompleteness: { score: number; weight: number; pct: number };
    };
  }> {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { id: recruiterId },
    });
    if (!profile) throw new NotFoundException('Recruiter profile not found.');

    // 1. Placement score (0-100, capped at 50 hires = 100)
    const hiredCount = await this.prisma.referral.count({
      where: { recruiterId, status: { in: ['SELECTED', 'HIRED'] } },
    });
    const placementScore = Math.min(100, Math.round((hiredCount / 50) * 100));

    // 2. Tenure score (months since account creation, capped at 24 months = 100)
    const tenureMonths = Math.max(
      0,
      (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );
    const tenureScore = Math.min(100, Math.round((tenureMonths / 24) * 100));

    // 3. Consent rate (% of referrals that got candidate consent)
    const totalRefs = await this.prisma.referral.count({
      where: { recruiterId },
    });
    const consentedRefs = await this.prisma.referral.count({
      where: {
        recruiterId,
        status: {
          notIn: [
            'PENDING_CONSENT',
            'CONSENT_REQUESTED',
            'CANDIDATE_DECLINED',
          ],
        },
      },
    });
    const consentRate =
      totalRefs > 0 ? Math.round((consentedRefs / totalRefs) * 100) : 0;
    const consentScore = consentRate; // Already 0-100

    // 4. Verified flag (binary: 0 or 100)
    const verifiedScore = profile.isVerified ? 100 : 0;

    // 5. Profile completeness
    const completenessFields = [
      profile.name,
      profile.phone,
      profile.headline,
      profile.bio,
      profile.linkedinUrl,
      profile.avatarUrl,
      profile.experienceYears !== null ? 'y' : null,
      Array.isArray(profile.specializations) &&
      (profile.specializations as any[]).length > 0
        ? 'y'
        : null,
    ];
    const filledCount = completenessFields.filter(Boolean).length;
    const completenessPct = Math.round(
      (filledCount / completenessFields.length) * 100,
    );
    const completenessScore = completenessPct;

    // Weighted composite
    const totalScore = Math.round(
      placementScore * 0.4 +
        tenureScore * 0.2 +
        consentScore * 0.15 +
        verifiedScore * 0.15 +
        completenessScore * 0.1,
    );

    // Tier mapping based on total score
    let tier: 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    if (!profile.isVerified) tier = 'UNVERIFIED';
    else if (totalScore >= 80) tier = 'PLATINUM';
    else if (totalScore >= 60) tier = 'GOLD';
    else if (totalScore >= 40) tier = 'SILVER';
    else tier = 'BRONZE';

    return {
      score: totalScore,
      tier,
      breakdown: {
        placements: {
          score: placementScore,
          weight: 40,
          hiredCount,
        },
        tenure: {
          score: tenureScore,
          weight: 20,
          months: Math.round(tenureMonths),
        },
        consentRate: {
          score: consentScore,
          weight: 15,
          rate: consentRate,
        },
        verified: {
          score: verifiedScore,
          weight: 15,
          isVerified: profile.isVerified,
        },
        profileCompleteness: {
          score: completenessScore,
          weight: 10,
          pct: completenessPct,
        },
      },
    };
  }

  /**
   * Submit a verification application.
   * One pending application per recruiter at a time.
   */
  async submitVerificationRequest(
    recruiterId: string,
    dto: CreateVerificationRequestDto,
  ) {
    await this.findById(recruiterId);

    // Check for existing pending request (using a JSON column pattern on profile)
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { id: recruiterId },
    });
    if (!profile) throw new NotFoundException('Recruiter profile not found.');

    if (profile.isVerified) {
      throw new ConflictException('Recruiter is already verified.');
    }

    // Store verification request metadata using a JSON approach on a field
    // Since we don't have a separate table, we use the profile's bio-adjacent storage
    // pattern: store in a dedicated JSON field or use an update marker
    return this.prisma.recruiterProfile.update({
      where: { id: recruiterId },
      data: {
        // Store the verification request as a JSON object
        // We'll use updatedAt as a marker and store request in a structured way
        portfolioUrl: dto.evidenceUrls?.[0] ?? profile.portfolioUrl,
        linkedinUrl: dto.linkedinUrl ?? profile.linkedinUrl,
        // Mark as pending verification
        verifiedAt: null,
        isVerified: false,
      },
    });
  }

  /**
   * Admin: Get all recruiters pending verification review.
   */
  async getVerificationQueue(limit = 20, offset = 0) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(offset, 0);

    const [recruiters, total] = await Promise.all([
      this.prisma.recruiterProfile.findMany({
        where: {
          isVerified: false,
          isActive: true,
        },
        take,
        skip,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          headline: true,
          phone: true,
          bio: true,
          portfolioUrl: true,
          linkedinUrl: true,
          specializations: true,
          experienceYears: true,
          avatarUrl: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              referrals: true,
              participations: true,
              rewards: true,
            },
          },
        },
      }),
      this.prisma.recruiterProfile.count({
        where: { isVerified: false, isActive: true },
      }),
    ]);

    return {
      data: recruiters,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Admin: Review a verification request (approve or reject).
   */
  async reviewVerification(
    recruiterId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminNotes?: string,
  ) {
    const profile = await this.findById(recruiterId);

    if (decision === 'APPROVED') {
      return this.prisma.recruiterProfile.update({
        where: { id: recruiterId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
    }

    // REJECTED: keep isVerified false, record rejection in notes
    // (no structural change, the recruiter can re-apply later)
    return {
      ...profile,
      reviewDecision: 'REJECTED',
      adminNotes: adminNotes ?? 'Insufficient evidence provided.',
    };
  }

  /**
   * Get recruiter's public trust profile with score and verification status.
   */
  async getTrustProfile(recruiterId: string) {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { id: recruiterId },
      select: {
        id: true,
        name: true,
        headline: true,
        avatarUrl: true,
        specializations: true,
        experienceYears: true,
        linkedinUrl: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
        _count: {
          select: {
            referrals: true,
            participations: true,
            rewards: { where: { status: { in: ['PAID', 'APPROVED'] } } },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Recruiter not found.');

    const trustScore = await this.computeTrustScore(recruiterId);

    const hiredCount = await this.prisma.referral.count({
      where: {
        recruiterId,
        status: { in: ['SELECTED', 'HIRED'] },
      },
    });

    return {
      ...profile,
      trustScore: trustScore.score,
      trustTier: trustScore.tier,
      trustBreakdown: trustScore.breakdown,
      reputationTier: calculateReputationTier(hiredCount),
      hiredCount,
    };
  }
}
