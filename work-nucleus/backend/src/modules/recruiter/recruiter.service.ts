import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecruiterProfileDto, UpdateRecruiterProfileDto } from './dto/recruiter-profile.dto';
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
  recentReferrals: any[];
  topMandates: any[];
  monthlyReferrals: { name: string; count: number }[];
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
    const existing = await this.prisma.recruiterProfile.findUnique({ where: { auth0Sub } });
    if (existing) throw new ConflictException('Recruiter profile already exists. Use PATCH to update.');

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

  async getMyProfile(recruiterId: string): Promise<RecruiterProfile & { _count: any }> {
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

    if (!profile || !profile) throw new NotFoundException('Recruiter not found.');
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
          mandate: { select: { id: true, title: true, organization: { select: { name: true } } } },
          candidateProfile: { select: { id: true, name: true, headline: true } },
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
    const successfulPlacements = (refCounts['SELECTED'] ?? 0) + (refCounts['HIRED'] ?? 0);
    const placementSuccessRate = totalReferrals > 0 ? Math.round((successfulPlacements / totalReferrals) * 100) : 0;
    
    let reputationTier = 'BRONZE';
    if (successfulPlacements >= 50) reputationTier = 'PLATINUM';
    else if (successfulPlacements >= 10) reputationTier = 'GOLD';
    else if (successfulPlacements >= 3) reputationTier = 'SILVER';

    // Build monthly chart data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyDataMap = new Map<string, number>();
    
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyDataMap.set(key, 0);
    }

    historicalReferrals.forEach(r => {
      const key = `${monthNames[r.createdAt.getMonth()]} ${r.createdAt.getFullYear()}`;
      if (monthlyDataMap.has(key)) {
        monthlyDataMap.set(key, monthlyDataMap.get(key)! + 1);
      }
    });

    const monthlyReferrals = Array.from(monthlyDataMap.entries()).map(([name, count]) => ({ name, count }));

    return {
      profile,
      stats: {
        activeMandates,
        totalReferrals,
        pendingConsents:
          (refCounts['PENDING_CONSENT'] ?? 0) + (refCounts['CONSENT_REQUESTED'] ?? 0),
        activePipeline: refCounts['ACTIVATED'] ?? 0,
        totalEarnings: (earningsMap['PAID'] ?? 0) + (earningsMap['APPROVED'] ?? 0),
        pendingEarnings:
          (earningsMap['POTENTIAL'] ?? 0) +
          (earningsMap['ELIGIBLE'] ?? 0) +
          (earningsMap['PENDING_APPROVAL'] ?? 0),
        placementSuccessRate,
        reputationTier,
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
    const profile = await this.prisma.recruiterProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Recruiter profile not found.');
    return profile;
  }

  async getLeaderboard() {
    // Top 10 by number of hired referrals or total earnings.
    const recruiters = await this.prisma.recruiterProfile.findMany({
      take: 10,
      include: {
        _count: {
          select: { referrals: { where: { status: 'HIRED' } } }
        },
        rewards: {
          where: { status: { in: ['PAID', 'APPROVED'] } },
          select: { rewardAmount: true }
        }
      }
    });

    const mapped = recruiters.map(r => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatarUrl,
      isVerified: r.isVerified,
      reputationTier: r.reputationTier,
      hiredCount: r._count.referrals,
      totalEarnings: r.rewards.reduce((sum, rw) => sum + rw.rewardAmount, 0)
    }));

    // Sort by earnings descending, then hired count
    mapped.sort((a, b) => b.totalEarnings - a.totalEarnings || b.hiredCount - a.hiredCount);
    return mapped;
  }
}
