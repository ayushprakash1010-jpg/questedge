import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Mandate, MandateStatus, Prisma } from '@prisma/client';
import { CreateMandateDto } from './dto/create-mandate.dto';
import { UpdateMandateDto } from './dto/update-mandate.dto';
import { FilterMandateDto } from './dto/filter-mandate.dto';
import { calculateReferralReward } from '../rewards/rewards.service';

// ── Shared response shapes ───────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface MandateStats {
  totalApplications: number;
  totalReferrals: number;
  referralsPendingConsent: number;
  referralsActivated: number;
  candidatesInPipeline: number;
  activeRecruiters: number;
}

export interface MandateWithStats extends Mandate {
  organization: { id: string; name: string };
  stats: MandateStats;
}

// ── Service ──────────────────────────────────────────────────────

import { EmailService } from '../comms/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import { HireDetectionService } from '../hire-detection/hire-detection.service';

@Injectable()
export class MandatesService {
  private readonly logger = new Logger(MandatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
    private readonly whatsappService: WhatsappService,
    private readonly hireDetection: HireDetectionService,
  ) {}

  /**
   * Auto-close mandates whose application deadline has passed.
   */
  async autoCloseExpiredMandates(orgId?: string): Promise<void> {
    try {
      await this.prisma.mandate.updateMany({
        where: {
          status: MandateStatus.ACTIVE,
          applicationDeadline: {
            lt: new Date(),
          },
          ...(orgId ? { orgId } : {}),
        },
        data: {
          status: MandateStatus.CLOSED,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to auto-close expired mandates: ${err}`);
    }
  }

  private parseApplicationDeadline(val?: string): Date | undefined {
    if (!val) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return new Date(`${val}T23:59:59.999Z`);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // ── Helpers ────────────────────────────────────────────────────

  private buildWhereClause(
    filter: FilterMandateDto,
    extraWhere: Prisma.MandateWhereInput = {},
  ): Prisma.MandateWhereInput {
    const where: Prisma.MandateWhereInput = { ...extraWhere };

    if (filter.q) {
      where.OR = [
        { title: { contains: filter.q, mode: 'insensitive' } },
        { description: { contains: filter.q, mode: 'insensitive' } },
        { department: { contains: filter.q, mode: 'insensitive' } },
      ];
    }

    if (filter.location) {
      where.location = { contains: filter.location, mode: 'insensitive' };
    }

    if (filter.workModel) {
      where.workModel = { equals: filter.workModel, mode: 'insensitive' };
    }

    if (filter.department) {
      where.department = { equals: filter.department, mode: 'insensitive' };
    }

    if (filter.industry) {
      where.organization = {
        industry: { equals: filter.industry, mode: 'insensitive' },
      };
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.employmentType) {
      where.employmentType = {
        contains: filter.employmentType,
        mode: 'insensitive',
      };
    }

    if (filter.minReward !== undefined) {
      where.referralRewardAmount = {
        ...(where.referralRewardAmount as object),
        gte: filter.minReward,
      };
    }

    if (filter.maxReward !== undefined) {
      where.referralRewardAmount = {
        ...(where.referralRewardAmount as object),
        lte: filter.maxReward,
      };
    }

    // Skills filter — mandate must contain ALL specified skills
    if (filter.skills) {
      const skillsList = filter.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillsList.length > 0) {
        // JSON contains check — check if any mandatory skill matches
        where.AND = skillsList.map((skill) => ({
          mandatorySkills: { array_contains: skill },
        }));
      }
    }

    return where;
  }

  private async getMandateStats(mandateId: string): Promise<MandateStats> {
    const [
      totalApplications,
      referrals,
      activeParticipations,
      distinctReferralRecruiters,
    ] = await Promise.all([
      this.prisma.candidateApplication.count({ where: { mandateId } }),
      this.prisma.referral.groupBy({
        by: ['status'],
        where: { mandateId },
        _count: { status: true },
      }),
      this.prisma.mandateParticipation.count({
        where: { mandateId, status: 'ACTIVE' },
      }),
      this.prisma.referral.findMany({
        where: { mandateId },
        select: { recruiterId: true },
        distinct: ['recruiterId'],
      }),
    ]);

    const activeRecruiters = Math.max(
      activeParticipations,
      distinctReferralRecruiters.length,
    );

    const referralsByStatus: Record<string, number> = {};
    for (const r of referrals) {
      referralsByStatus[r.status] = r._count.status;
    }

    const candidatesInPipeline =
      totalApplications +
      (referralsByStatus['CANDIDATE_ACCEPTED'] ?? 0) +
      (referralsByStatus['ACTIVATED'] ?? 0) +
      (referralsByStatus['UNDER_REVIEW'] ?? 0) +
      (referralsByStatus['SHORTLISTED'] ?? 0) +
      (referralsByStatus['INTERVIEW'] ?? 0) +
      (referralsByStatus['SELECTED'] ?? 0) +
      (referralsByStatus['HIRED'] ?? 0);

    return {
      totalApplications,
      totalReferrals: Object.values(referralsByStatus).reduce(
        (a, b) => a + b,
        0,
      ),
      referralsPendingConsent:
        (referralsByStatus['PENDING_CONSENT'] ?? 0) +
        (referralsByStatus['CONSENT_REQUESTED'] ?? 0),
      referralsActivated: referralsByStatus['ACTIVATED'] ?? 0,
      candidatesInPipeline,
      activeRecruiters,
    };
  }

  // ── Company: CRUD ──────────────────────────────────────────────

  async create(orgId: string, dto: CreateMandateDto): Promise<Mandate> {
    if (
      dto.compensationMin !== undefined &&
      dto.compensationMax !== undefined &&
      dto.compensationMin > dto.compensationMax
    ) {
      throw new BadRequestException(
        'Minimum compensation cannot exceed maximum compensation.',
      );
    }

    if (
      dto.referralRewardType === 'PERCENTAGE' &&
      dto.referralRewardAmount !== undefined &&
      (dto.referralRewardAmount < 0 || dto.referralRewardAmount > 100)
    ) {
      throw new BadRequestException(
        'Percentage referral reward must be between 0 and 100%.',
      );
    }

    return this.prisma.mandate.create({
      data: {
        orgId,
        title: dto.title,
        department: dto.department,
        description: dto.description,
        requiredExperience: dto.requiredExperience,
        mandatorySkills: dto.mandatorySkills ?? [],
        preferredSkills: dto.preferredSkills ?? [],
        numberOfOpenings: dto.numberOfOpenings ?? 1,
        location: dto.location,
        workModel: dto.workModel,
        employmentType: dto.employmentType,
        compensationMin: dto.compensationMin ? dto.compensationMin : undefined,
        compensationMax: dto.compensationMax ? dto.compensationMax : undefined,
        currency: dto.currency ?? 'INR',
        applicationDeadline: this.parseApplicationDeadline(dto.applicationDeadline),
        acceptsDirectApply: dto.acceptsDirectApply ?? true,
        acceptsReferrals: dto.acceptsReferrals ?? true,
        participationType: dto.participationType ?? 'OPEN',
        referralRewardAmount: dto.referralRewardAmount
          ? dto.referralRewardAmount
          : undefined,
        referralRewardType: dto.referralRewardType,
        ownershipPeriodDays: dto.ownershipPeriodDays ?? 180,
        expectedTimeline: dto.expectedTimeline,
        noticePeriodPref: dto.noticePeriodPref,
        interviewProcess: dto.interviewProcess ?? [],
        hiringManagerName: dto.hiringManagerName,
        hiringManagerTitle: dto.hiringManagerTitle,
        hiringManagerPhone: dto.hiringManagerPhone,
        teamDescription: dto.teamDescription,
        status: 'DRAFT',
      },
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async update(
    orgId: string,
    id: string,
    dto: UpdateMandateDto,
  ): Promise<Mandate> {
    const mandate = await this.findOwnMandate(orgId, id);

    if (mandate.status === 'CLOSED' || mandate.status === 'FILLED') {
      throw new ForbiddenException('Cannot edit a closed or filled mandate.');
    }

    const effectiveMin =
      dto.compensationMin !== undefined
        ? dto.compensationMin
        : Number(mandate.compensationMin) || undefined;
    const effectiveMax =
      dto.compensationMax !== undefined
        ? dto.compensationMax
        : Number(mandate.compensationMax) || undefined;

    if (
      effectiveMin !== undefined &&
      effectiveMax !== undefined &&
      effectiveMin > effectiveMax
    ) {
      throw new BadRequestException(
        'Minimum compensation cannot exceed maximum compensation.',
      );
    }

    const effectiveType = dto.referralRewardType ?? mandate.referralRewardType;
    const effectiveAmount =
      dto.referralRewardAmount !== undefined
        ? dto.referralRewardAmount
        : Number(mandate.referralRewardAmount) || undefined;

    if (
      effectiveType === 'PERCENTAGE' &&
      effectiveAmount !== undefined &&
      (effectiveAmount < 0 || effectiveAmount > 100)
    ) {
      throw new BadRequestException(
        'Percentage referral reward must be between 0 and 100%.',
      );
    }

    return this.prisma.mandate.update({
      where: { id },
      data: {
        ...dto,
        compensationMin: dto.compensationMin ?? undefined,
        compensationMax: dto.compensationMax ?? undefined,
        referralRewardAmount: dto.referralRewardAmount ?? undefined,
        applicationDeadline: this.parseApplicationDeadline(dto.applicationDeadline),
        interviewProcess: dto.interviewProcess ?? undefined,
      },
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async findByOrg(
    orgId: string,
    filter: FilterMandateDto,
  ): Promise<PaginatedResult<Mandate>> {
    await this.autoCloseExpiredMandates(orgId);
    const where = this.buildWhereClause(filter, { orgId });
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.mandate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [filter.sortBy ?? 'createdAt']: filter.sortOrder ?? 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          _count: {
            select: {
              referrals: true,
              applications: true,
              participations: true,
            },
          },
        },
      }),
      this.prisma.mandate.count({ where }),
    ]);

    return {
      data,
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

  async findOne(orgId: string, id: string): Promise<MandateWithStats> {
    await this.autoCloseExpiredMandates(orgId);
    const mandate = await this.findOwnMandate(orgId, id);
    const stats = await this.getMandateStats(id);

    return {
      ...mandate,
      stats,
      _count: {
        referrals: stats.totalReferrals,
        applications: stats.totalApplications,
        participations: stats.activeRecruiters,
      },
    } as any;
  }

  async findForMarketplace(id: string, recruiterId?: string) {
    const mandate = await this.prisma.mandate.findUnique({
      where: { id, status: 'ACTIVE' },
      include: {
        organization: { select: { id: true, name: true, industry: true } },
        _count: { select: { participations: true } },
      },
    });

    if (!mandate) {
      throw new NotFoundException('Mandate not found or not active');
    }

    let isJoined = false;
    if (recruiterId) {
      const participation = await this.prisma.mandateParticipation.findUnique({
        where: { mandateId_recruiterId: { recruiterId, mandateId: id } },
      });
      if (participation && participation.status === 'ACTIVE') {
        isJoined = true;
      }
    }

    return { ...mandate, isJoined };
  }

  async publish(orgId: string, id: string): Promise<Mandate> {
    const mandate = await this.findOwnMandate(orgId, id);

    if (mandate.status !== 'DRAFT' && mandate.status !== 'PAUSED') {
      throw new BadRequestException(
        `Cannot publish a mandate with status '${mandate.status}'. Only DRAFT or PAUSED mandates can be published.`,
      );
    }

    if (
      !mandate.title ||
      !mandate.description ||
      (mandate.mandatorySkills as string[]).length === 0
    ) {
      throw new BadRequestException(
        'Mandate must have a title, description, and at least one required skill before publishing.',
      );
    }

    const updated = await this.prisma.mandate.update({
      where: { id },
      data: { status: 'ACTIVE', publishedAt: new Date() },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (updated.hiringManagerName) {
      // Send WhatsApp notification to the manager
      const appLink = `https://questedge.com/mandates/${updated.id}`;
      if (updated.hiringManagerPhone) {
        this.whatsappService
          .sendWhatsAppNotification(
            updated.hiringManagerPhone,
            updated.hiringManagerName,
            updated.title,
            'ACTIVE',
            appLink,
          )
          .catch((e) => console.error(e));
      }
    }

    return updated;
  }

  async pause(orgId: string, id: string): Promise<Mandate> {
    const mandate = await this.findOwnMandate(orgId, id);

    if (mandate.status !== 'ACTIVE') {
      throw new BadRequestException('Only ACTIVE mandates can be paused.');
    }

    return this.prisma.mandate.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async close(orgId: string, id: string): Promise<Mandate> {
    await this.findOwnMandate(orgId, id);

    const updated = await this.prisma.mandate.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: { organization: { select: { id: true, name: true } } },
    });

    // Hire bypass detection: auto-trigger candidate check-ins
    this.hireDetection
      .onMandateStatusChange(id, 'CLOSED')
      .catch((e) => console.error('Hire detection hook failed:', e));

    return updated;
  }

  async fill(orgId: string, id: string): Promise<Mandate> {
    const mandate = await this.findOwnMandate(orgId, id);

    if (mandate.status !== 'ACTIVE' && mandate.status !== 'PAUSED') {
      throw new BadRequestException(
        `Cannot mark a ${mandate.status} mandate as filled. Only ACTIVE or PAUSED mandates can be filled.`,
      );
    }

    const updated = await this.prisma.mandate.update({
      where: { id },
      data: { status: 'FILLED', filledAt: new Date() },
      include: { organization: { select: { id: true, name: true } } },
    });

    // Hire bypass detection: auto-trigger candidate check-ins for all active referrals
    this.hireDetection
      .onMandateStatusChange(id, 'FILLED')
      .catch((e) => console.error('Hire detection hook failed:', e));

    return updated;
  }

  async remove(orgId: string, id: string): Promise<void> {
    const mandate = await this.findOwnMandate(orgId, id);

    if (mandate.status !== 'DRAFT') {
      throw new ForbiddenException(
        'Only DRAFT mandates can be deleted. Pause or Close active mandates instead.',
      );
    }

    await this.prisma.mandate.delete({ where: { id } });
  }

  // ── Public: Discovery (no auth) ─────────────────────────────────

  async publicDiscover(
    filter: FilterMandateDto,
  ): Promise<PaginatedResult<Mandate>> {
    const where = this.buildWhereClause(filter);
    where.status = 'ACTIVE';
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [mandates, total] = await Promise.all([
      this.prisma.mandate.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [filter.sortBy ?? 'publishedAt']: filter.sortOrder ?? 'desc',
        },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { referrals: true, participations: true } },
        },
      }),
      this.prisma.mandate.count({ where }),
    ]);

    return {
      data: mandates,
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

  // ── Recruiter: Discovery ────────────────────────────────────────

  async discover(
    recruiterId: string,
    filter: FilterMandateDto,
  ): Promise<PaginatedResult<Mandate & { isJoined: boolean }>> {
    await this.autoCloseExpiredMandates();
    const where = this.buildWhereClause(filter);
    where.status = 'ACTIVE';
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [mandates, total, joinedMandateIds] = await Promise.all([
      this.prisma.mandate.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [filter.sortBy ?? 'publishedAt']: filter.sortOrder ?? 'desc',
        },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { referrals: true, participations: true } },
        },
      }),
      this.prisma.mandate.count({ where }),
      this.prisma.mandateParticipation.findMany({
        where: { recruiterId, status: 'ACTIVE' },
        select: { mandateId: true },
      }),
    ]);

    const joinedSet = new Set(joinedMandateIds.map((p) => p.mandateId));

    return {
      data: mandates.map((m) => ({ ...m, isJoined: joinedSet.has(m.id) })),
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

  async findByRecruiter(
    recruiterId: string,
    filter: FilterMandateDto,
  ): Promise<PaginatedResult<Mandate>> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const participationWhere: Prisma.MandateParticipationWhereInput = {
      recruiterId,
      status: 'ACTIVE',
    };

    const [participations, total] = await Promise.all([
      this.prisma.mandateParticipation.findMany({
        where: participationWhere,
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
        include: {
          mandate: {
            include: {
              organization: { select: { id: true, name: true } },
              _count: { select: { referrals: true } },
            },
          },
        },
      }),
      this.prisma.mandateParticipation.count({ where: participationWhere }),
    ]);

    return {
      data: participations.map((p) => p.mandate),
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

  // ── Recruiter: Participation ────────────────────────────────────

  async joinMandate(recruiterId: string, mandateId: string) {
    const mandate = await this.prisma.mandate.findUnique({
      where: { id: mandateId },
    });

    if (!mandate) throw new NotFoundException('Mandate not found.');
    if (mandate.status !== 'ACTIVE')
      throw new BadRequestException('Can only join ACTIVE mandates.');
    if (mandate.participationType === 'INVITE_ONLY') {
      throw new ForbiddenException(
        'This mandate is invite-only. Please contact the company to be invited.',
      );
    }

    const existing = await this.prisma.mandateParticipation.findUnique({
      where: { mandateId_recruiterId: { mandateId, recruiterId } },
    });

    if (existing) {
      if (existing.status === 'ACTIVE')
        throw new ConflictException('You are already working on this mandate.');
      // Re-activate if previously left
      return this.prisma.mandateParticipation.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', joinedAt: new Date() },
      });
    }

    return this.prisma.mandateParticipation.create({
      data: { mandateId, recruiterId, status: 'ACTIVE' },
    });
  }

  async leaveMandate(recruiterId: string, mandateId: string): Promise<void> {
    const participation = await this.prisma.mandateParticipation.findUnique({
      where: { mandateId_recruiterId: { mandateId, recruiterId } },
    });

    if (!participation)
      throw new NotFoundException('You are not participating in this mandate.');

    await this.prisma.mandateParticipation.update({
      where: { id: participation.id },
      data: { status: 'LEFT' },
    });
  }

  async getParticipants(orgId: string, mandateId: string) {
    await this.findOwnMandate(orgId, mandateId);

    return this.prisma.mandateParticipation.findMany({
      where: { mandateId, status: 'ACTIVE' },
      include: {
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            specializations: true,
            isVerified: true,
            _count: { select: { referrals: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // ── Internal helper ────────────────────────────────────────────

  private async findOwnMandate(orgId: string, id: string) {
    const mandate = await this.prisma.mandate.findFirst({
      where: { id, orgId },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (!mandate)
      throw new NotFoundException(
        'Mandate not found or you do not have access.',
      );
    return mandate;
  }

  // ── Company: Pipeline Kanban ────────────────────────────────────

  async getPipeline(orgId: string, mandateId: string) {
    await this.findOwnMandate(orgId, mandateId);

    // Fetch all pipeline stages for this mandate's hiring plan (or directly if linked)
    // Wait, let's just fetch all applications and let the frontend group them by currentStageId
    const applications = await this.prisma.candidateApplication.findMany({
      where: { mandateId },
      include: {
        candidateProfile: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            experienceYears: true,
          },
        },
        currentStage: {
          select: {
            id: true,
            name: true,
            stageType: true,
            stageOrder: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    // Manually join referrals to avoid prisma schema relation issues for now
    const referralIds = applications
      .map((a) => a.referralId)
      .filter(Boolean) as string[];
    const referralsMap: Record<string, any> = {};

    if (referralIds.length > 0) {
      const referrals = await this.prisma.referral.findMany({
        where: { id: { in: referralIds } },
        include: { recruiter: { select: { id: true, name: true } } },
      });
      referrals.forEach((r) => {
        referralsMap[r.id] = r;
      });
    }

    const appItems = applications.map((app) => ({
      ...app,
      isReferral: Boolean(app.referralId),
      referral:
        app.referralId && referralsMap[app.referralId]
          ? referralsMap[app.referralId]
          : null,
      currentStage: app.currentStage || {
        id: 'sourced',
        name: 'Sourced',
        stageOrder: 1,
      },
    }));

    // Fetch active/accepted referrals for this mandate to populate the Kanban board
    const activeReferrals = await this.prisma.referral.findMany({
      where: {
        mandateId,
        status: {
          in: [
            'CANDIDATE_ACCEPTED',
            'ACTIVATED',
            'UNDER_REVIEW',
            'SHORTLISTED',
            'INTERVIEW',
            'SELECTED',
            'HIRED',
          ],
        },
      },
      include: {
        candidateProfile: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            experienceYears: true,
          },
        },
        recruiter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const existingReferralIds = new Set(referralIds);
    const unlinkedReferrals = activeReferrals.filter(
      (r) => !existingReferralIds.has(r.id),
    );

    const stageMap: Record<
      string,
      { id: string; name: string; stageOrder: number }
    > = {
      CANDIDATE_ACCEPTED: { id: 'sourced', name: 'Sourced', stageOrder: 1 },
      ACTIVATED: { id: 'screening', name: 'Screening', stageOrder: 2 },
      UNDER_REVIEW: { id: 'screening', name: 'Screening', stageOrder: 2 },
      SHORTLISTED: { id: 'shortlisted', name: 'Shortlisted', stageOrder: 3 },
      INTERVIEW: { id: 'interview', name: 'Interview', stageOrder: 4 },
      SELECTED: { id: 'offer', name: 'Offer / Hired', stageOrder: 5 },
      HIRED: { id: 'offer', name: 'Offer / Hired', stageOrder: 5 },
    };

    const referralItems = unlinkedReferrals.map((r) => ({
      id: r.id,
      candidateProfileId: r.candidateProfileId,
      candidateProfile: r.candidateProfile,
      mandateId: r.mandateId,
      isReferral: true,
      referralId: r.id,
      referral: {
        id: r.id,
        recruiter: r.recruiter,
        status: r.status,
      },
      currentStage: stageMap[r.status] || {
        id: 'sourced',
        name: 'Sourced',
        stageOrder: 1,
      },
      status: r.status,
      aiMatchScore: (r as any).aiMatchScore,
      appliedAt: (r as any).createdAt,
    }));

    return [...appItems, ...referralItems];
  }

  // ── Company: Referral Inbox ─────────────────────────────────────

  async getMandateReferrals(orgId: string, mandateId: string) {
    await this.findOwnMandate(orgId, mandateId);

    return this.prisma.referral.findMany({
      where: { mandateId },
      include: {
        candidateProfile: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            currentDesignation: true,
            currentCompany: true,
            experienceYears: true,
            skills: true,
            resumeUrl: true,
            currentLocation: true,
            isProfileComplete: true,
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
        consent: {
          select: {
            id: true,
            status: true,
            requestedAt: true,
            respondedAt: true,
            expiresAt: true,
          },
        },
        claimScope: {
          select: {
            id: true,
            status: true,
            ownershipStartsAt: true,
            ownershipExpiresAt: true,
          },
        },
        reward: {
          select: {
            id: true,
            status: true,
            rewardAmount: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReferralStatus(
    orgId: string,
    mandateId: string,
    referralId: string,
    newStatus: string,
    notes?: string,
  ) {
    // Verify the mandate belongs to this org
    await this.findOwnMandate(orgId, mandateId);

    const referral: any = await this.prisma.referral.findFirst({
      where: { id: referralId, mandateId },
      include: {
        mandate: true,
        candidateProfile: {
          include: {
            applications: {
              where: { status: 'SELECTED' },
              include: { offer: { include: { compensation: true } } },
              take: 1,
            },
          },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found for this mandate.');
    }

    // Only allow progressing a referral that the candidate has already accepted
    const allowedStatuses = [
      'ACTIVATED',
      'UNDER_REVIEW',
      'SHORTLISTED',
      'INTERVIEW',
      'SELECTED',
      'REJECTED',
      'HIRED',
    ];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status '${newStatus}'. Allowed: ${allowedStatuses.join(', ')}`,
      );
    }

    // F-11: Enforce candidate consent before company can progress referral.
    // Progressing an unconsented, declined, or expired referral is strictly prohibited.
    const eligibleCurrentStatuses = [
      'CANDIDATE_ACCEPTED',
      'ACTIVATED',
      'UNDER_REVIEW',
      'SHORTLISTED',
      'INTERVIEW',
      'SELECTED',
    ];

    if (!eligibleCurrentStatuses.includes(referral.status)) {
      throw new BadRequestException(
        `Cannot update referral status from '${referral.status}'. Candidate must have accepted the referral first.`,
      );
    }

    const updateData: any = {
      status: newStatus as any,
      ...(notes ? { recruiterNote: notes } : {}),
      ...(newStatus === 'ACTIVATED' ? { activatedAt: new Date() } : {}),
    };

    if (newStatus === 'HIRED' || newStatus === 'SELECTED') {
      let actualSalary: number | null = null;
      const appWithOffer = referral.candidateProfile?.applications?.[0];
      if (appWithOffer?.offer?.compensation?.fixedAnnual) {
        actualSalary =
          Number(appWithOffer.offer.compensation.fixedAnnual) +
          Number(appWithOffer.offer.compensation.variableAnnual || 0);
      }

      const calculatedReward = calculateReferralReward(
        referral.mandate,
        actualSalary,
      );

      // Update both referral and reward tracking
      const [updatedReferral] = await this.prisma.$transaction([
        this.prisma.referral.update({
          where: { id: referralId },
          data: updateData,
          include: {
            recruiter: { select: { email: true, name: true, auth0Sub: true } },
            candidateProfile: { select: { name: true } },
            mandate: { select: { title: true } },
          },
        }),
        this.prisma.rewardTracking.updateMany({
          where: { referralId, status: 'POTENTIAL' },
          data: {
            status: 'PENDING_APPROVAL',
            rewardAmount: calculatedReward,
            eligibleAt: new Date(),
            ...(newStatus === 'HIRED' ? { hiredAt: new Date() } : {}),
          },
        }),
      ]);

      this.emailService
        .sendReferralStatusUpdate({
          toEmail: updatedReferral.recruiter.email,
          recruiterName: updatedReferral.recruiter.name,
          candidateName: updatedReferral.candidateProfile.name,
          mandateTitle: updatedReferral.mandate.title,
          newStatus,
        })
        .catch((err) =>
          console.error('Failed to send referral status email', err),
        );

      if (updatedReferral.recruiter?.auth0Sub) {
        await this.notifications.create({
          userId: updatedReferral.recruiter.auth0Sub,
          orgId,
          type: 'REFERRAL_STATUS_UPDATED',
          title: 'Referral Status Updated',
          body: `${updatedReferral.candidateProfile.name}'s referral for ${updatedReferral.mandate.title} has moved to ${newStatus}.`,
          entityType: 'REFERRAL',
          entityId: referralId,
          actionUrl: `/recruiter/dashboard`,
        });
      }

      return updatedReferral;
    }

    const updated = await this.prisma.referral.update({
      where: { id: referralId },
      data: updateData,
      include: {
        recruiter: { select: { email: true, name: true, auth0Sub: true } },
        candidateProfile: { select: { name: true } },
        mandate: { select: { title: true } },
      },
    });

    this.emailService
      .sendReferralStatusUpdate({
        toEmail: updated.recruiter.email,
        recruiterName: updated.recruiter.name,
        candidateName: updated.candidateProfile.name,
        mandateTitle: updated.mandate.title,
        newStatus,
      })
      .catch((err) =>
        console.error('Failed to send referral status email', err),
      );

    if (updated.recruiter?.auth0Sub) {
      await this.notifications.create({
        userId: updated.recruiter.auth0Sub,
        orgId,
        type: 'REFERRAL_STATUS_UPDATED',
        title: 'Referral Status Updated',
        body: `${updated.candidateProfile.name}'s referral for ${updated.mandate.title} has moved to ${newStatus}.`,
        entityType: 'REFERRAL',
        entityId: referralId,
        actionUrl: `/recruiter/dashboard`,
      });
    }

    return updated;
  }
}
