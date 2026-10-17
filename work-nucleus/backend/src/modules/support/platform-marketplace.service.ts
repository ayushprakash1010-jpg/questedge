import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MandateStatus } from '@prisma/client';

@Injectable()
export class PlatformMarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Mandates ────────────────────────────────────────────────────

  async listMandates(opts: {
    page?: number;
    limit?: number;
    status?: MandateStatus;
    orgId?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, orgId, search } = opts;
    const where: any = {};
    if (status) where.status = status;
    if (orgId) where.orgId = orgId;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [mandates, total] = await this.prisma.$transaction([
      this.prisma.mandate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          _count: {
            select: {
              participations: true,
              referrals: true,
              applications: true,
            },
          },
        },
      }),
      this.prisma.mandate.count({ where }),
    ]);

    return {
      data: mandates.map((m) => ({
        id: m.id,
        title: m.title,
        orgId: m.orgId,
        orgName: m.organization.name,
        status: m.status,
        participationType: m.participationType,
        referralRewardAmount: m.referralRewardAmount,
        numberOfOpenings: m.numberOfOpenings,
        location: m.location,
        workModel: m.workModel,
        participationCount: m._count.participations,
        referralCount: m._count.referrals,
        applicationCount: m._count.applications,
        publishedAt: m.publishedAt,
        createdAt: m.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMandateDetail(mandateId: string) {
    return this.prisma.mandate.findUniqueOrThrow({
      where: { id: mandateId },
      include: {
        organization: { select: { id: true, name: true, industry: true } },
        participations: {
          include: {
            recruiter: {
              select: { id: true, name: true, email: true, isVerified: true },
            },
          },
        },
        _count: { select: { referrals: true, applications: true } },
      },
    });
  }

  // ── Recruiters ──────────────────────────────────────────────────

  async listRecruiters(opts: {
    page?: number;
    limit?: number;
    isVerified?: boolean;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 20, isVerified, isActive, search } = opts;
    const where: any = {};
    if (isVerified !== undefined) where.isVerified = isVerified;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [recruiters, total] = await this.prisma.$transaction([
      this.prisma.recruiterProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { referrals: true, rewards: true, participations: true },
          },
        },
      }),
      this.prisma.recruiterProfile.count({ where }),
    ]);

    return {
      data: recruiters.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        headline: r.headline,
        specializations: r.specializations,
        experienceYears: r.experienceYears,
        linkedinUrl: r.linkedinUrl,
        portfolioUrl: r.portfolioUrl,
        isVerified: r.isVerified,
        verifiedAt: r.verifiedAt,
        isActive: r.isActive,
        referralCount: r._count.referrals,
        rewardCount: r._count.rewards,
        participationCount: r._count.participations,
        createdAt: r.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRecruiterDetail(recruiterId: string) {
    const recruiter = await this.prisma.recruiterProfile.findUniqueOrThrow({
      where: { id: recruiterId },
      include: {
        rewards: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            rewardAmount: true,
            currency: true,
            status: true,
            hiredAt: true,
            paidAt: true,
            createdAt: true,
          },
        },
        referrals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            mandate: {
              select: {
                id: true,
                title: true,
                organization: { select: { name: true } },
              },
            },
            candidateProfile: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { referrals: true, rewards: true, participations: true },
        },
      },
    });

    // Never return auth0Sub — strip it before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { auth0Sub: _auth0Sub, ...safe } = recruiter as any;
    return safe;
  }

  async verifyRecruiter(recruiterId: string, actorId: string) {
    const recruiter = await this.prisma.recruiterProfile.findUniqueOrThrow({
      where: { id: recruiterId },
      select: { id: true, email: true, name: true, isVerified: true },
    });

    await this.prisma.recruiterProfile.update({
      where: { id: recruiterId },
      data: { isVerified: true, verifiedAt: new Date() },
    });

    await this.auditService.log({
      orgId: 'platform',
      userId: actorId,
      action: 'RECRUITER_VERIFIED',
      entityType: 'RECRUITER_PROFILE',
      entityId: recruiterId,
      changes: {
        before: { isVerified: recruiter.isVerified },
        after: { isVerified: true },
        targetEmail: recruiter.email,
        targetName: recruiter.name,
      },
    });

    return { success: true, message: `Recruiter ${recruiter.name} verified` };
  }

  async deactivateRecruiter(
    recruiterId: string,
    actorId: string,
    reason: string,
  ) {
    const recruiter = await this.prisma.recruiterProfile.findUniqueOrThrow({
      where: { id: recruiterId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    await this.prisma.recruiterProfile.update({
      where: { id: recruiterId },
      data: { isActive: false },
    });

    await this.auditService.log({
      orgId: 'platform',
      userId: actorId,
      action: 'RECRUITER_DEACTIVATED',
      entityType: 'RECRUITER_PROFILE',
      entityId: recruiterId,
      changes: {
        before: { isActive: true },
        after: { isActive: false },
        reason,
        targetEmail: recruiter.email,
        targetName: recruiter.name,
      },
    });

    return {
      success: true,
      message: `Recruiter ${recruiter.name} deactivated`,
    };
  }

  // ── Rewards ─────────────────────────────────────────────────────

  async listRewards(opts: {
    page?: number;
    limit?: number;
    status?: string;
    orgId?: string;
    recruiterId?: string;
    isAdmin?: boolean;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      orgId,
      recruiterId,
      isAdmin = false,
    } = opts;
    const where: any = {};
    if (status) where.status = status;
    if (orgId) where.orgId = orgId;
    if (recruiterId) where.recruiterId = recruiterId;

    const [rewards, total] = await this.prisma.$transaction([
      this.prisma.rewardTracking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          recruiter: { select: { id: true, name: true, email: true } },
          referral: {
            include: {
              mandate: {
                select: {
                  id: true,
                  title: true,
                  organization: { select: { id: true, name: true } },
                },
              },
              candidateProfile: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      }),
      this.prisma.rewardTracking.count({ where }),
    ]);

    return {
      data: rewards.map((r) => ({
        id: r.id,
        status: r.status,
        currency: r.currency,
        // Only expose amounts to SUPPORT_ADMIN — caller passes isAdmin flag
        rewardAmount: isAdmin ? r.rewardAmount : null,
        hiredAt: r.hiredAt,
        joinedAt: r.joinedAt,
        eligibleAt: r.eligibleAt,
        approvedAt: r.approvedAt,
        paidAt: r.paidAt,
        recruiterName: r.recruiter.name,
        recruiterEmail: r.recruiter.email,
        mandateTitle: r.referral.mandate.title,
        orgId: r.referral.mandate.organization.id,
        orgName: r.referral.mandate.organization.name,
        candidateName: r.referral.candidateProfile.name,
        candidateEmail: r.referral.candidateProfile.email,
        createdAt: r.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Claim Scopes ────────────────────────────────────────────────

  async listClaimScopes(opts: {
    page?: number;
    limit?: number;
    orgId?: string;
    status?: string;
  }) {
    const { page = 1, limit = 20, orgId, status } = opts;
    const where: any = {};
    if (orgId) where.orgId = orgId;
    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.claimScope.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.claimScope.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
