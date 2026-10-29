import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RewardStatus, SecurityEventType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { SecurityService } from '../security/security.service';
import {
  RaiseRewardDisputeDto,
  ResolveRewardDisputeDto,
  DisputeDecision,
} from './dto/reward-dispute.dto';

/**
 * P2-03: Calculates referral reward amount based on mandate reward type (FIXED or PERCENTAGE).
 * If PERCENTAGE, computes (percentage / 100) * baseSalary.
 * Priority for baseSalary:
 * 1. Actual offered/hired CTC (if provided)
 * 2. Mandate compensation midpoint (if both min & max exist)
 * 3. Mandate compensation max or min
 * 4. Raw reward amount (fallback)
 */
export function calculateReferralReward(
  mandate: {
    referralRewardAmount?: any;
    referralRewardType?: string | null;
    compensationMin?: any;
    compensationMax?: any;
  },
  actualSalary?: number | null,
): number {
  const rawAmount = Number(mandate.referralRewardAmount) || 0;
  if (rawAmount <= 0) return 0;

  if (mandate.referralRewardType === 'PERCENTAGE') {
    const percentage = Math.min(100, Math.max(0, rawAmount));

    if (actualSalary && actualSalary > 0) {
      return Math.round((percentage / 100) * actualSalary);
    }

    const min = Number(mandate.compensationMin) || 0;
    const max = Number(mandate.compensationMax) || 0;
    let base = 0;
    if (min > 0 && max > 0) base = (min + max) / 2;
    else if (max > 0) base = max;
    else if (min > 0) base = min;

    if (base > 0) {
      return Math.round((percentage / 100) * base);
    }
  }

  return Math.round(rawAmount);
}

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private auditService?: AuditService,
    @Optional() private securityService?: SecurityService,
  ) {}


  /**
   * Called when an application is moved to SELECTED / Hired.
   * If there is a referral, it triggers reward eligibility.
   */
  async triggerRewardEligibility(referralId: string) {
    const referral: any = await this.prisma.referral.findUnique({
      where: { id: referralId },
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

    if (!referral) return null;

    // Check if an actual hired compensation exists on an associated offer
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

    const existing = await this.prisma.rewardTracking.findUnique({
      where: { referralId },
    });

    if (existing) {
      if (existing.status === 'POTENTIAL') {
        return this.prisma.rewardTracking.update({
          where: { id: existing.id },
          data: {
            status: RewardStatus.PENDING_APPROVAL,
            rewardAmount: calculatedReward,
            eligibleAt: new Date(),
            hiredAt: new Date(),
          },
        });
      }
      return existing; // Already triggered
    }

    // Create the reward tracking record as PENDING_APPROVAL
    return this.prisma.rewardTracking.create({
      data: {
        referralId: referral.id,
        mandateId: referral.mandateId,
        recruiterId: referral.recruiterId,
        orgId: referral.mandate.orgId,
        status: RewardStatus.PENDING_APPROVAL,
        rewardAmount: calculatedReward,
        currency: referral.mandate.currency || 'INR',
        eligibleAt: new Date(),
        hiredAt: new Date(),
      },
    });
  }

  /**
   * Company Dashboard: Get all rewards for their mandates
   */
  async getCompanyRewards(orgId: string, limit = 50, offset = 0) {
    const take = Math.min(Math.max(limit || 50, 1), 100);
    const skip = Math.max(offset || 0, 0);
    return this.prisma.rewardTracking.findMany({
      where: { orgId },
      take,
      skip,
      include: {
        recruiter: { select: { name: true, email: true } },
        referral: {
          select: {
            candidateProfile: { select: { name: true, email: true } },
            mandate: { select: { title: true } },
          },
        },
      },
      orderBy: { eligibleAt: 'desc' },
    });
  }

  /**
   * Recruiter Dashboard: Get earnings and potentials
   */
  async getRecruiterRewards(auth0Sub: string, limit = 50, offset = 0) {
    const take = Math.min(Math.max(limit || 50, 1), 100);
    const skip = Math.max(offset || 0, 0);
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { auth0Sub },
    });
    if (!recruiter) throw new NotFoundException('Recruiter not found');

    const rewards = await this.prisma.rewardTracking.findMany({
      where: { recruiterId: recruiter.id },
      take,
      skip,
      include: {
        referral: {
          select: {
            candidateProfile: { select: { name: true } },
            mandate: {
              select: { title: true, organization: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { eligibleAt: 'desc' },
    });

    // We can also fetch the "Pipeline Potential" (active referrals not yet hired, capped to 100)
    const pipeline = await this.prisma.referral.findMany({
      where: {
        recruiterId: recruiter.id,
        status: { notIn: ['ACTIVATED', 'WITHDRAWN', 'CANDIDATE_DECLINED'] },
        reward: null, // No reward generated yet
      },
      take: 100,
      include: {
        mandate: { select: { referralRewardAmount: true, currency: true } },
      },
    });

    return {
      rewards,
      pipelinePotential: pipeline.reduce(
        (sum, ref) => sum + Number(ref.mandate.referralRewardAmount || 0),
        0,
      ),
    };
  }

  /**
   * Company action to approve the payout
   */
  async approveReward(orgId: string, rewardId: string) {
    const reward = await this.prisma.rewardTracking.findUnique({
      where: { id: rewardId },
    });

    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.orgId !== orgId) throw new BadRequestException('Unauthorized');
    if (
      reward.status !== RewardStatus.PENDING_APPROVAL &&
      reward.status !== RewardStatus.ELIGIBLE
    ) {
      throw new BadRequestException('Reward is not pending approval');
    }

    return this.prisma.rewardTracking.update({
      where: { id: rewardId },
      data: {
        status: RewardStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  async fixMissingRewards() {
    const hiredReferrals = await this.prisma.referral.findMany({
      where: { status: 'HIRED' },
      include: { mandate: true },
    });

    let fixedCount = 0;
    for (const ref of hiredReferrals) {
      const existing = await this.prisma.rewardTracking.findUnique({
        where: { referralId: ref.id },
      });

      if (!existing) {
        await this.prisma.rewardTracking.create({
          data: {
            referralId: ref.id,
            recruiterId: ref.recruiterId,
            mandateId: ref.mandateId,
            orgId: ref.mandate.orgId,
            rewardAmount: ref.mandate.referralRewardAmount || 20000,
            currency: ref.mandate.currency || 'INR',
            status: 'PENDING_APPROVAL',
            hiredAt: ref.updatedAt,
            eligibleAt: ref.updatedAt,
          },
        });
        fixedCount++;
      }
    }
    return { success: true, fixedCount };
  }

  async withdrawReward(auth0Sub: string, rewardId: string) {
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: { auth0Sub },
    });
    if (!recruiter) throw new NotFoundException('Recruiter not found');

    const reward = await this.prisma.rewardTracking.findUnique({
      where: { id: rewardId },
    });

    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.recruiterId !== recruiter.id)
      throw new BadRequestException('Unauthorized');
    // Idempotent: if already paid, return existing record without error
    if (reward.status === RewardStatus.PAID) {
      return reward;
    }
    if (reward.status !== RewardStatus.APPROVED) {
      throw new BadRequestException(
        `Reward is not available for withdrawal (current status: )`,
      );
    }

    return this.prisma.rewardTracking.update({
      where: { id: rewardId },
      data: {
        status: RewardStatus.PAID,
        paidAt: new Date(),
        paymentRef: `PAY-${Date.now().toString().slice(-6)}`,
      },
    });
  }

  // ── P4-05: Reward Disputes & Immutable Audit Trail ──────────────

  /**
   * Raise a dispute on a reward (by Company or Recruiter).
   * Transitions status to DISPUTED and appends cryptographic SHA-256 block to audit log.
   */
  async raiseDispute(
    rewardId: string,
    actor: {
      userId?: string;
      orgId?: string;
      auth0Sub?: string;
      userType?: string;
    },
    dto: RaiseRewardDisputeDto,
  ) {
    const reward = await this.prisma.rewardTracking.findUnique({
      where: { id: rewardId },
      include: {
        recruiter: {
          select: { id: true, name: true, email: true, auth0Sub: true },
        },
        referral: {
          select: {
            mandate: { select: { title: true } },
          },
        },
      },
    });

    if (!reward) throw new NotFoundException('Reward not found');

    if (reward.status === RewardStatus.DISPUTED) {
      throw new ConflictException('This reward is already under dispute.');
    }

    if (reward.status === RewardStatus.CANCELLED) {
      throw new BadRequestException('Cannot dispute an already cancelled reward.');
    }

    // Ownership check
    if (actor.orgId && reward.orgId !== actor.orgId) {
      throw new BadRequestException(
        'Unauthorized: Reward belongs to a different organisation.',
      );
    }
    if (actor.auth0Sub && reward.recruiter.auth0Sub !== actor.auth0Sub) {
      throw new BadRequestException(
        'Unauthorized: Reward belongs to a different recruiter.',
      );
    }

    // Parse previous notes to append dispute metadata
    let existingMeta: any = {};
    try {
      if (reward.notes && reward.notes.startsWith('{')) {
        existingMeta = JSON.parse(reward.notes);
      } else if (reward.notes) {
        existingMeta = { legacyNotes: reward.notes };
      }
    } catch {
      existingMeta = { rawNotes: reward.notes };
    }

    const disputeRecord = {
      id: randomUUID(),
      reason: dto.reason,
      details: dto.details,
      evidenceUrls: dto.evidenceUrls ?? [],
      raisedBy: actor.userType || 'UNKNOWN',
      raisedById: actor.userId || actor.auth0Sub || 'UNKNOWN',
      raisedAt: new Date().toISOString(),
      priorStatus: reward.status,
      status: 'OPEN',
    };

    existingMeta.dispute = disputeRecord;
    existingMeta.history = existingMeta.history || [];
    existingMeta.history.push({
      action: 'DISPUTE_RAISED',
      timestamp: new Date().toISOString(),
      actorId: actor.userId || actor.auth0Sub,
      reason: dto.reason,
    });

    const updated = await this.prisma.rewardTracking.update({
      where: { id: rewardId },
      data: {
        status: RewardStatus.DISPUTED,
        notes: JSON.stringify(existingMeta),
      },
      include: {
        recruiter: { select: { name: true, email: true } },
        referral: {
          select: {
            candidateProfile: { select: { name: true, email: true } },
            mandate: { select: { title: true } },
          },
        },
      },
    });

    // 1. Audit log
    if (this.auditService && (actor.userId || actor.auth0Sub)) {
      try {
        await this.auditService.log({
          orgId: reward.orgId,
          userId: actor.userId || 'system',
          action: 'REWARD_DISPUTED',
          entityType: 'REWARD_TRACKING',
          entityId: reward.id,
          changes: {
            before: { status: reward.status },
            after: { status: RewardStatus.DISPUTED },
            reason: dto.reason,
            details: dto.details,
          },
        });
      } catch (e) {
        // Continue if audit logging fails
      }
    }

    // 2. Cryptographic Immutable Log (SOC 2 SC-12 SHA-256 hash chaining)
    if (this.securityService) {
      try {
        await this.securityService.append({
          orgId: reward.orgId,
          eventType: SecurityEventType.CONFIG_CHANGED,
          userId: actor.userId,
          payload: {
            action: 'REWARD_DISPUTE_RAISED',
            rewardId: reward.id,
            mandateTitle: reward.referral?.mandate?.title,
            recruiterId: reward.recruiterId,
            reason: dto.reason,
            amount: Number(reward.rewardAmount),
            currency: reward.currency,
            disputeId: disputeRecord.id,
          },
        });
      } catch (e) {
        // Continue if security logging fails
      }
    }

    return {
      ...updated,
      dispute: disputeRecord,
    };
  }

  /**
   * Resolve a disputed reward (Admin/Mediator decision).
   * Decisions:
   * - UPHELD: Reward cancelled / clawed back.
   * - REJECTED: Dispute dismissed, reward restored to APPROVED for payout.
   * - SETTLED: Revised mutual agreed reward amount, set to APPROVED.
   */
  async resolveDispute(
    rewardId: string,
    actor: { userId: string; orgId?: string; role?: string },
    dto: ResolveRewardDisputeDto,
  ) {
    const reward = await this.prisma.rewardTracking.findUnique({
      where: { id: rewardId },
      include: {
        recruiter: { select: { id: true, name: true, email: true } },
        referral: {
          select: {
            mandate: { select: { title: true } },
          },
        },
      },
    });


    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.status !== RewardStatus.DISPUTED) {
      throw new BadRequestException(
        'Reward is not currently in dispute status.',
      );
    }

    let existingMeta: any = {};
    try {
      if (reward.notes && reward.notes.startsWith('{')) {
        existingMeta = JSON.parse(reward.notes);
      }
    } catch {
      existingMeta = {};
    }

    let newStatus: RewardStatus;
    let newAmount: any = reward.rewardAmount;

    if (dto.decision === DisputeDecision.UPHELD) {
      newStatus = RewardStatus.CANCELLED;
    } else if (dto.decision === DisputeDecision.REJECTED) {
      newStatus = RewardStatus.APPROVED;
    } else {
      newStatus = RewardStatus.APPROVED;
      if (dto.settlementAmount !== undefined && dto.settlementAmount >= 0) {
        newAmount = dto.settlementAmount;
      }
    }

    const resolutionRecord = {
      decision: dto.decision,
      resolutionNotes: dto.resolutionNotes,
      settlementAmount: dto.settlementAmount,
      resolvedBy: actor.userId,
      resolvedAt: new Date().toISOString(),
    };

    if (existingMeta.dispute) {
      existingMeta.dispute.status = 'RESOLVED';
      existingMeta.dispute.resolution = resolutionRecord;
    }
    existingMeta.history = existingMeta.history || [];
    existingMeta.history.push({
      action: 'DISPUTE_RESOLVED',
      decision: dto.decision,
      actorId: actor.userId,
      timestamp: new Date().toISOString(),
    });

    const updated = await this.prisma.rewardTracking.update({
      where: { id: rewardId },
      data: {
        status: newStatus,
        rewardAmount: newAmount,
        notes: JSON.stringify(existingMeta),
        approvedAt:
          newStatus === RewardStatus.APPROVED ? new Date() : reward.approvedAt,
      },
      include: {
        recruiter: { select: { name: true, email: true } },
        referral: {
          select: {
            candidateProfile: { select: { name: true, email: true } },
            mandate: { select: { title: true } },
          },
        },
      },
    });

    // 1. Audit log
    if (this.auditService) {
      try {
        await this.auditService.log({
          orgId: reward.orgId,
          userId: actor.userId,
          action: 'REWARD_DISPUTE_RESOLVED',
          entityType: 'REWARD_TRACKING',
          entityId: reward.id,
          changes: {
            before: {
              status: reward.status,
              amount: Number(reward.rewardAmount),
            },
            after: { status: newStatus, amount: Number(newAmount) },
            decision: dto.decision,
            notes: dto.resolutionNotes,
          },
        });
      } catch (e) {}
    }

    // 2. Cryptographic immutable log
    if (this.securityService) {
      try {
        await this.securityService.append({
          orgId: reward.orgId,
          eventType: SecurityEventType.CONFIG_CHANGED,
          userId: actor.userId,
          payload: {
            action: 'REWARD_DISPUTE_RESOLVED',
            rewardId: reward.id,
            decision: dto.decision,
            settlementAmount: dto.settlementAmount,
            finalStatus: newStatus,
            resolverId: actor.userId,
          },
        });
      } catch (e) {}
    }

    return {
      ...updated,
      disputeResolution: resolutionRecord,
    };
  }

  /**
   * Get complete cryptographic and transactional audit trail for a reward.
   * Verifies tamper-evidence SHA-256 hash integrity.
   */
  async getRewardAuditTrail(rewardId: string) {
    const reward = await this.prisma.rewardTracking.findUnique({
      where: { id: rewardId },
      include: {
        recruiter: { select: { id: true, name: true, email: true } },
        referral: {
          select: {
            candidateProfile: { select: { name: true, email: true } },
            mandate: {
              select: {
                title: true,
                organization: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!reward) throw new NotFoundException('Reward not found');

    const [auditLogs, securityLogs] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityId: rewardId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.securityLog.findMany({
        where: { orgId: reward.orgId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const relevantSecurity = securityLogs.filter((log) => {
      const p = log.payload as any;
      return p?.rewardId === rewardId || p?.entityId === rewardId;
    });

    let chainStatus = { ok: true, brokenAtIndex: -1, total: 0 };
    if (this.securityService) {
      chainStatus = await this.securityService.verifyChain(reward.orgId);
    }

    let parsedNotes: any = null;
    try {
      if (reward.notes && reward.notes.startsWith('{')) {
        parsedNotes = JSON.parse(reward.notes);
      }
    } catch {}

    return {
      rewardId: reward.id,
      rewardAmount: reward.rewardAmount,
      currency: reward.currency,
      status: reward.status,
      orgId: reward.orgId,
      orgName: reward.referral?.mandate?.organization?.name,
      recruiterName: reward.recruiter?.name,
      recruiterEmail: reward.recruiter?.email,
      candidateName: reward.referral?.candidateProfile?.name,
      candidateEmail: reward.referral?.candidateProfile?.email,
      dispute: parsedNotes?.dispute ?? null,
      history: parsedNotes?.history ?? [],

      auditLogs,
      securityChain: {
        isTamperEvident: true,
        chainIntact: chainStatus.ok,
        totalOrgBlocksVerified: chainStatus.total,
        entries: relevantSecurity.map((s) => ({
          id: s.id,
          eventType: s.eventType,
          hash: s.hash,
          prevHash: s.prevHash,
          createdAt: s.createdAt,
          payload: s.payload,
        })),
      },
    };
  }

  /**
   * List disputed rewards with full dispute metadata.
   */
  async getDisputes(opts: {
    orgId?: string;
    recruiterId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { orgId, recruiterId, limit = 20, offset = 0 } = opts;
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(offset, 0);

    const where: any = { status: RewardStatus.DISPUTED };
    if (orgId) where.orgId = orgId;
    if (recruiterId) where.recruiterId = recruiterId;

    const [rewards, total] = await Promise.all([
      this.prisma.rewardTracking.findMany({
        where,
        take,
        skip,
        orderBy: { updatedAt: 'desc' },
        include: {
          recruiter: { select: { id: true, name: true, email: true } },
          referral: {
            select: {
              candidateProfile: {
                select: { id: true, name: true, email: true },
              },
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
      }),
      this.prisma.rewardTracking.count({ where }),
    ]);

    const formatted = rewards.map((r) => {
      let disputeData: any = null;
      try {
        if (r.notes && r.notes.startsWith('{')) {
          const parsed = JSON.parse(r.notes);
          disputeData = parsed.dispute ?? null;
        }
      } catch {}

      return {
        id: r.id,
        rewardAmount: r.rewardAmount,
        currency: r.currency,
        status: r.status,
        hiredAt: r.hiredAt,
        eligibleAt: r.eligibleAt,
        approvedAt: r.approvedAt,
        updatedAt: r.updatedAt,
        recruiter: r.recruiter,
        candidate: r.referral?.candidateProfile,
        mandate: r.referral?.mandate,
        dispute: disputeData,
      };
    });

    return {
      data: formatted,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}

