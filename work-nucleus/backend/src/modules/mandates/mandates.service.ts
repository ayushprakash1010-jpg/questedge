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
  private readonly pipelineSetupLocks = new Map<
    string,
    Promise<{ mandate: Mandate; backingPlanId: string; stages: any[] }>
  >();
  private readonly pipelineSyncLocks = new Map<string, Promise<any[]>>();

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
    // Set deadline to 11:59:59 PM in Indian Standard Time (IST, UTC+5:30)
    if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z?)?$/.test(val)) {
      const datePart = val.slice(0, 10);
      return new Date(`${datePart}T23:59:59.999+05:30`);
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
        educationRequirement: dto.educationRequirement,
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

    // Align recruiter count with getMandateStats(): max(active participations, distinct referral recruiters)
    const mandateIds = data.map((m) => m.id);
    const activeParticipationMap = new Map<string, number>();
    const referralRecruiterMap = new Map<string, number>();

    if (
      mandateIds.length > 0 &&
      (this.prisma as any).mandateParticipation?.groupBy &&
      (this.prisma as any).referral?.findMany
    ) {
      const [activeParticipations, distinctReferralRecruiters] = await Promise.all([
        this.prisma.mandateParticipation.groupBy({
          by: ['mandateId'],
          where: { mandateId: { in: mandateIds }, status: 'ACTIVE' },
          _count: { recruiterId: true },
        }),
        this.prisma.referral.findMany({
          where: { mandateId: { in: mandateIds } },
          select: { mandateId: true, recruiterId: true },
          distinct: ['mandateId', 'recruiterId'],
        }),
      ]);

      for (const row of activeParticipations) {
        activeParticipationMap.set(row.mandateId, row._count.recruiterId);
      }
      for (const row of distinctReferralRecruiters) {
        referralRecruiterMap.set(
          row.mandateId,
          (referralRecruiterMap.get(row.mandateId) ?? 0) + 1,
        );
      }
    }

    const enrichedData = data.map((m: any) => {
      if (!m._count) return m;
      const activeCount = Math.max(
        activeParticipationMap.get(m.id) ?? m._count.participations ?? 0,
        referralRecruiterMap.get(m.id) ?? 0,
      );
      return {
        ...m,
        _count: {
          ...m._count,
          participations: activeCount,
        },
      };
    });

    return {
      data: enrichedData,
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
      const baseUrl = (process.env.FRONTEND_URL || 'https://questedge.in').replace(/\/+$/, '');
      const appLink = `${baseUrl}/mandates/${updated.id}`;
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
    where.organization = {
      ...(where.organization as object),
      users: { none: { isDemoAccount: true } },
    };
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

  private static readonly MANDATE_PIPELINE_NOTE_PREFIX = '[MANDATE_PIPELINE:';

  private buildMandatePipelineNote(mandateId: string): string {
    return `${MandatesService.MANDATE_PIPELINE_NOTE_PREFIX}${mandateId}]`;
  }

  private resolveStageForReferralStatus(
    stages: Array<{ id: string; name: string; stageOrder: number; stageType: string }>,
    referralStatus: string,
  ) {
    if (!stages.length) return null;
    const ordered = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
    const byOrder = (idx: number) => ordered[Math.min(idx, ordered.length - 1)];

    switch (referralStatus) {
      case 'ACTIVATED':
      case 'UNDER_REVIEW':
        return byOrder(1);
      case 'SHORTLISTED':
        return byOrder(2);
      case 'INTERVIEW':
        return byOrder(3);
      case 'SELECTED':
      case 'HIRED':
        return ordered.find((s) => s.stageType === 'OFFER') || byOrder(4);
      case 'CANDIDATE_ACCEPTED':
      default:
        return byOrder(0);
    }
  }

  async ensureMandatePipelineSetup(orgId: string, mandateId: string) {
    const existingLock = this.pipelineSetupLocks.get(mandateId);
    if (existingLock) {
      return existingLock;
    }

    const promise = this.runMandatePipelineSetup(orgId, mandateId).finally(
      () => {
        if (this.pipelineSetupLocks.get(mandateId) === promise) {
          this.pipelineSetupLocks.delete(mandateId);
        }
      },
    );
    this.pipelineSetupLocks.set(mandateId, promise);
    return promise;
  }

  private async runMandatePipelineSetup(orgId: string, mandateId: string) {
    const mandate = await this.findOwnMandate(orgId, mandateId);

    let stages = await this.prisma.pipelineStage.findMany({
      where: { mandateId },
      orderBy: [{ stageOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (stages.length > 0) {
      stages = await this.dedupeMandateStages(mandateId, stages);
    }

    let backingPlanId = stages[0]?.hiringPlanId;

    if (!backingPlanId) {
      const noteMarker = this.buildMandatePipelineNote(mandate.id);
      let backingPlan = await this.prisma.hiringPlan.findFirst({
        where: { orgId, notes: noteMarker },
        select: { id: true },
      });

      if (!backingPlan) {
        let orgUser = await this.prisma.user.findFirst({
          where: { orgId },
          select: { id: true },
        });
        if (!orgUser) {
          orgUser = await this.prisma.user.create({
            data: {
              orgId,
              email: `hiring-${orgId.slice(0, 8)}@questedge.internal`,
              auth0Sub: `internal|system-${orgId.slice(0, 8)}`,
              name: `${(mandate as any).organization?.name || 'Company'} Hiring Lead`,
              role: 'ADMIN',
              userType: 'COMPANY_USER',
            },
            select: { id: true },
          });
        }

        backingPlan = await this.prisma.hiringPlan.create({
          data: {
            orgId,
            title: mandate.title,
            industry: 'Technology',
            department: mandate.department || 'Engineering',
            quarter: Math.floor(new Date().getMonth() / 3) + 1,
            year: new Date().getFullYear(),
            totalRoles: mandate.numberOfOpenings || 1,
            status: 'ACTIVE',
            budgetMin: mandate.compensationMin || 0,
            budgetMax: mandate.compensationMax || 0,
            currency: mandate.currency || 'INR',
            hiringManagerId: orgUser.id,
            reportingManagerName: mandate.hiringManagerName || 'Hiring Manager',
            hodName: mandate.department || 'Department Lead',
            designation: mandate.title,
            notes: noteMarker,
            createdById: orgUser.id,
          },
          select: { id: true },
        });
      }

      backingPlanId = backingPlan.id;
    }

    if (stages.length === 0) {
      const defaults: Array<{ name: string; stageType: any; stageOrder: number; maxDurationDays: number }> = [
        { name: 'Sourced', stageType: 'SCREENING', stageOrder: 1, maxDurationDays: 3 },
        { name: 'Screening', stageType: 'SCREENING', stageOrder: 2, maxDurationDays: 3 },
        { name: 'Shortlisted', stageType: 'TECHNICAL', stageOrder: 3, maxDurationDays: 5 },
        { name: 'Interview', stageType: 'HR', stageOrder: 4, maxDurationDays: 5 },
        { name: 'Offer / Hired', stageType: 'OFFER', stageOrder: 5, maxDurationDays: 7 },
      ];

      await this.prisma.pipelineStage.createMany({
        data: defaults.map((s) => ({
          hiringPlanId: backingPlanId,
          mandateId: mandate.id,
          name: s.name,
          stageType: s.stageType,
          stageOrder: s.stageOrder,
          maxDurationDays: s.maxDurationDays,
          skillsToEvaluate: [],
        })),
      });

      stages = await this.prisma.pipelineStage.findMany({
        where: { mandateId },
        orderBy: [{ stageOrder: 'asc' }, { createdAt: 'asc' }],
      });
      stages = await this.dedupeMandateStages(mandateId, stages);
    }

    return { mandate, backingPlanId, stages };
  }

  private async dedupeMandateStages(mandateId: string, stages: any[]) {
    const groups = new Map<string, any[]>();
    for (const s of stages) {
      const key = `${s.stageOrder}:${(s.name || '').trim().toLowerCase()}`;
      const list = groups.get(key) || [];
      list.push(s);
      groups.set(key, list);
    }

    const dupIdsToDelete: string[] = [];
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      const canonical = group[0];
      const dupIds = group.slice(1).map((d) => d.id);
      dupIdsToDelete.push(...dupIds);

      await Promise.all([
        this.prisma.candidateApplication?.updateMany?.({
          where: { currentStageId: { in: dupIds } },
          data: { currentStageId: canonical.id },
        }),
        this.prisma.candidateStageHistory?.updateMany?.({
          where: { stageId: { in: dupIds } },
          data: { stageId: canonical.id },
        }),
        this.prisma.interviewFeedback?.updateMany?.({
          where: { stageId: { in: dupIds } },
          data: { stageId: canonical.id },
        }),
        (this.prisma as any).hiringAssessment?.updateMany?.({
          where: { pipelineStageId: { in: dupIds } },
          data: { pipelineStageId: canonical.id },
        }),
        (this.prisma as any).videoInterview?.updateMany?.({
          where: { pipelineStageId: { in: dupIds } },
          data: { pipelineStageId: canonical.id },
        }),
      ]);
    }

    if (dupIdsToDelete.length === 0) {
      return stages;
    }

    await this.prisma.pipelineStage?.deleteMany?.({
      where: { id: { in: dupIdsToDelete } },
    });

    return this.prisma.pipelineStage.findMany({
      where: { mandateId },
      orderBy: [{ stageOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getStages(orgId: string, mandateId: string) {
    const { stages } = await this.ensureMandatePipelineSetup(orgId, mandateId);
    return stages;
  }

  async getPipeline(orgId: string, mandateId: string) {
    const existingSync = this.pipelineSyncLocks.get(mandateId);
    if (existingSync) {
      return existingSync;
    }

    const promise = this.runGetPipeline(orgId, mandateId).finally(() => {
      if (this.pipelineSyncLocks.get(mandateId) === promise) {
        this.pipelineSyncLocks.delete(mandateId);
      }
    });
    this.pipelineSyncLocks.set(mandateId, promise);
    return promise;
  }

  private async runGetPipeline(orgId: string, mandateId: string) {
    const { backingPlanId, stages } = await this.ensureMandatePipelineSetup(
      orgId,
      mandateId,
    );
    const sourcedStage = stages[0];
    const validStageIds = new Set(stages.map((s) => s.id));

    // 1. Reconcile existing applications on this mandate so every application sits on a real Mandate stage
    const existingApps = await this.prisma.candidateApplication.findMany({
      where: { mandateId },
      select: {
        id: true,
        candidateId: true,
        hiringPlanId: true,
        currentStageId: true,
        referralId: true,
        _count: { select: { stageHistory: true } },
      },
    });

    for (const app of existingApps) {
      const updates: any = {};
      if (app.hiringPlanId !== backingPlanId) {
        const collision = await this.prisma.candidateApplication.findUnique({
          where: {
            candidateId_hiringPlanId: {
              candidateId: app.candidateId,
              hiringPlanId: backingPlanId,
            },
          },
          select: { id: true },
        });
        if (!collision) {
          updates.hiringPlanId = backingPlanId;
        }
      }

      if (
        sourcedStage &&
        (!app.currentStageId || !validStageIds.has(app.currentStageId))
      ) {
        updates.currentStageId = sourcedStage.id;
      }

      if (Object.keys(updates).length > 0) {
        await this.prisma.candidateApplication.update({
          where: { id: app.id },
          data: updates,
        });
      }

      const targetHistoryStageId = updates.currentStageId || app.currentStageId;
      if (targetHistoryStageId && app._count.stageHistory === 0) {
        await this.prisma.candidateStageHistory.create({
          data: {
            applicationId: app.id,
            stageId: targetHistoryStageId,
          },
        });
      }
    }

    // 2. Ensure every accepted/progressed referral on this mandate has a linked CandidateApplication
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
            'REJECTED',
          ],
        },
      },
      include: {
        candidateProfile: true,
        recruiter: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const linkedReferralIds = new Set(
      existingApps.map((a) => a.referralId).filter(Boolean) as string[],
    );

    for (const ref of activeReferrals) {
      if (linkedReferralIds.has(ref.id) || !ref.candidateProfile?.email) {
        continue;
      }

      const cp = ref.candidateProfile;
      let legacyCandidate = await this.prisma.candidate.findFirst({
        where: { orgId, email: { equals: cp.email, mode: 'insensitive' } },
      });

      if (!legacyCandidate) {
        legacyCandidate = await this.prisma.candidate.create({
          data: {
            orgId,
            name: cp.name || 'Candidate',
            email: cp.email,
            phone: cp.phone ?? undefined,
            resumeUrl: cp.resumeUrl ?? undefined,
            source: 'REFERRAL',
            currentRole: cp.currentDesignation ?? undefined,
            currentCompany: cp.currentCompany ?? undefined,
            experienceYears: cp.experienceYears ?? undefined,
            expectedCtc: cp.expectedCtc ?? undefined,
          },
        });
      } else if (cp.resumeUrl && !legacyCandidate.resumeUrl) {
        legacyCandidate = await this.prisma.candidate.update({
          where: { id: legacyCandidate.id },
          data: { resumeUrl: cp.resumeUrl },
        });
      }

      const stageForRef =
        this.resolveStageForReferralStatus(stages, ref.status) || sourcedStage;
      const mappedAppStatus =
        ref.status === 'SELECTED' || ref.status === 'HIRED'
          ? 'SELECTED'
          : ref.status === 'REJECTED'
            ? 'REJECTED'
            : 'ACTIVE';

      const existingPlanApp = await this.prisma.candidateApplication.findUnique({
        where: {
          candidateId_hiringPlanId: {
            candidateId: legacyCandidate.id,
            hiringPlanId: backingPlanId,
          },
        },
      });

      if (existingPlanApp) {
        await this.prisma.candidateApplication.update({
          where: { id: existingPlanApp.id },
          data: {
            referralId: existingPlanApp.referralId || ref.id,
            candidateProfileId: existingPlanApp.candidateProfileId || cp.id,
            currentStageId: existingPlanApp.currentStageId || stageForRef?.id,
          },
        });
      } else {
        const createdApp = await this.prisma.candidateApplication.create({
          data: {
            candidateId: legacyCandidate.id,
            hiringPlanId: backingPlanId,
            mandateId,
            candidateProfileId: cp.id,
            referralId: ref.id,
            sourceType: 'RECRUITER_REFERRAL',
            aiMatchScore: (ref as any).aiMatchScore ?? undefined,
            aiMatchSummary: (ref as any).aiMatchSummary ?? undefined,
            currentStageId: stageForRef?.id,
            status: mappedAppStatus as any,
          },
        });

        if (stageForRef) {
          await this.prisma.candidateStageHistory.create({
            data: {
              applicationId: createdApp.id,
              stageId: stageForRef.id,
            },
          });
        }
      }
    }

    // 3. Return unified Mandate applications enriched with referral & evaluation metadata
    const applications = await this.prisma.candidateApplication.findMany({
      where: { mandateId },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            resumeUrl: true,
            currentRole: true,
            currentCompany: true,
            experienceYears: true,
          },
        },
        candidateProfile: {
          select: {
            id: true,
            name: true,
            email: true,
            headline: true,
            currentDesignation: true,
            currentCompany: true,
            experienceYears: true,
            resumeUrl: true,
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
        offer: { select: { id: true, status: true } },
        decision: { select: { id: true, decision: true } },
        _count: { select: { feedbacks: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const referralMap = new Map<string, any>();
    for (const r of activeReferrals) {
      referralMap.set(r.id, r);
    }

    return applications.map((app) => {
      const linkedRef = app.referralId ? referralMap.get(app.referralId) : null;
      const resumeUrl =
        app.candidateProfile?.resumeUrl || app.candidate?.resumeUrl || null;
      return {
        ...app,
        candidateId: app.candidateProfileId || app.candidateId,
        legacyCandidateId: app.candidateId,
        resumeUrl,
        isReferral: Boolean(app.referralId),
        referral: linkedRef
          ? {
              id: linkedRef.id,
              recruiter: linkedRef.recruiter,
              status: linkedRef.status,
            }
          : null,
        candidateProfile: app.candidateProfile || {
          id: app.candidateId,
          name: app.candidate.name,
          email: app.candidate.email,
          headline:
            [app.candidate.currentRole, app.candidate.currentCompany]
              .filter(Boolean)
              .join(' @ ') || '',
          experienceYears: app.candidate.experienceYears,
          resumeUrl,
        },
        currentStage: app.currentStage || sourcedStage,
      };
    });
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

      await this.syncReferralApplication(orgId, mandateId, referralId, newStatus);

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

    await this.syncReferralApplication(orgId, mandateId, referralId, newStatus);

    return updated;
  }

  private async syncReferralApplication(
    orgId: string,
    mandateId: string,
    referralId: string,
    newStatus: string,
  ) {
    try {
      const linkedApp = await this.prisma.candidateApplication.findFirst({
        where: { referralId, mandateId },
      });
      if (!linkedApp) return;

      const { stages } = await this.ensureMandatePipelineSetup(orgId, mandateId);
      const targetStage = this.resolveStageForReferralStatus(stages, newStatus);
      const nextAppStatus =
        newStatus === 'SELECTED' || newStatus === 'HIRED'
          ? 'SELECTED'
          : newStatus === 'REJECTED'
            ? 'REJECTED'
            : 'ACTIVE';

      await this.prisma.$transaction(async (tx) => {
        if (
          targetStage &&
          linkedApp.currentStageId &&
          linkedApp.currentStageId !== targetStage.id
        ) {
          await tx.candidateStageHistory.updateMany({
            where: {
              applicationId: linkedApp.id,
              stageId: linkedApp.currentStageId,
              exitedAt: null,
            },
            data: {
              exitedAt: new Date(),
              outcome: nextAppStatus === 'REJECTED' ? 'REJECTED' : 'PASSED',
            },
          });

          await tx.candidateStageHistory.create({
            data: {
              applicationId: linkedApp.id,
              stageId: targetStage.id,
            },
          });
        }

        await tx.candidateApplication.update({
          where: { id: linkedApp.id },
          data: {
            status: nextAppStatus as any,
            ...(targetStage && linkedApp.currentStageId !== targetStage.id
              ? { currentStageId: targetStage.id, stageEnteredAt: new Date() }
              : {}),
            ...(nextAppStatus === 'SELECTED' || nextAppStatus === 'REJECTED'
              ? { completedAt: new Date() }
              : {}),
          },
        });
      });
    } catch (err) {
      this.logger.warn(`Failed to sync application for referral ${referralId}: ${err}`);
    }
  }

  async assertReferralInMandateOrg(
    orgId: string,
    mandateId: string,
    referralId: string,
  ) {
    const referral = await this.prisma.referral.findFirst({
      where: {
        id: referralId,
        mandateId,
        mandate: { orgId },
      },
      select: { id: true },
    });
    if (!referral) {
      throw new NotFoundException('Referral not found in this mandate');
    }
    return referral;
  }
}
