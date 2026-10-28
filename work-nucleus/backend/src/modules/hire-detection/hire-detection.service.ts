import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../comms/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { randomBytes } from 'crypto';
import { BypassRiskLevel, StatusCheckResponse } from '@prisma/client';

// ── Signal types for stale referral detection ────────────────────

interface BypassSignal {
  type: string;
  description: string;
  weight: number; // 1-10
  detectedAt: string;
}

// ── Risk scoring thresholds ──────────────────────────────────────

const RISK_THRESHOLDS = {
  LOW: 10,
  MEDIUM: 25,
  HIGH: 50,
  CRITICAL: 75,
};

const STALE_REFERRAL_DAYS = 30;
const CONFIRMATION_REMINDER_DAYS = 7;
const ESCALATION_DAYS = 14;
const PAUSE_THRESHOLD_DAYS = 21;

@Injectable()
export class HireDetectionService {
  private readonly logger = new Logger(HireDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Option 4: Stale Referral Detection ─────────────────────────

  /**
   * Scans all active mandates and referrals for suspicious patterns
   * indicating a company may have hired a candidate off-platform.
   * Called by the pg-boss cron worker daily.
   */
  async runStaleReferralScan(): Promise<{ flagsCreated: number; orgsScanned: number }> {
    this.logger.log('Starting stale referral detection scan...');
    let flagsCreated = 0;

    // 1. Detect mandates marked FILLED/CLOSED with no referral moved to HIRED
    const filledMandates = await this.prisma.mandate.findMany({
      where: {
        status: { in: ['FILLED', 'CLOSED'] },
        referrals: {
          some: {
            status: {
              in: [
                'ACTIVATED',
                'UNDER_REVIEW',
                'SHORTLISTED',
                'INTERVIEW',
                'SELECTED',
              ],
            },
          },
        },
      },
      include: {
        organization: { select: { id: true, name: true } },
        referrals: {
          where: {
            status: {
              in: [
                'ACTIVATED',
                'UNDER_REVIEW',
                'SHORTLISTED',
                'INTERVIEW',
                'SELECTED',
              ],
            },
          },
          include: {
            candidateProfile: { select: { name: true, email: true } },
            recruiter: { select: { name: true, email: true } },
          },
        },
      },
    });

    for (const mandate of filledMandates) {
      for (const referral of mandate.referrals) {
        const signals: BypassSignal[] = [
          {
            type: 'MANDATE_FILLED_NO_HIRE',
            description: `Mandate "${mandate.title}" was marked as ${mandate.status} but referral for ${referral.candidateProfile.name} was never moved to HIRED.`,
            weight: 9,
            detectedAt: new Date().toISOString(),
          },
        ];

        if (referral.status === 'SELECTED') {
          signals.push({
            type: 'SELECTED_BUT_NOT_HIRED',
            description: `Candidate was SELECTED but never progressed to HIRED status.`,
            weight: 8,
            detectedAt: new Date().toISOString(),
          });
        }

        const riskScore = signals.reduce((sum, s) => sum + s.weight * 10, 0);
        const existing = await this.prisma.hireBypassFlag.findFirst({
          where: {
            referralId: referral.id,
            mandateId: mandate.id,
            isResolved: false,
          },
        });

        if (!existing) {
          await this.prisma.hireBypassFlag.create({
            data: {
              referralId: referral.id,
              mandateId: mandate.id,
              orgId: mandate.orgId,
              riskLevel: this.calculateRiskLevel(riskScore),
              riskScore,
              signals: signals as any,
              description: `Potential hire bypass detected: ${mandate.title} was ${mandate.status} but candidate ${referral.candidateProfile.name} referral stuck in ${referral.status}.`,
            },
          });
          flagsCreated++;

          // Update referral risk score
          await this.prisma.referral.update({
            where: { id: referral.id },
            data: { bypassRiskScore: riskScore },
          });
        }
      }
    }

    // 2. Detect stale referrals (activated > 30 days with no progress)
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - STALE_REFERRAL_DAYS);

    const staleReferrals = await this.prisma.referral.findMany({
      where: {
        status: 'ACTIVATED',
        activatedAt: { lte: staleDate },
        bypassRiskScore: { lt: RISK_THRESHOLDS.MEDIUM },
        mandate: { status: 'ACTIVE' },
      },
      include: {
        mandate: {
          select: { id: true, title: true, orgId: true, status: true },
        },
        candidateProfile: { select: { name: true, email: true } },
        recruiter: { select: { name: true, email: true } },
      },
    });

    for (const referral of staleReferrals) {
      const daysSinceActivation = Math.floor(
        (Date.now() - new Date(referral.activatedAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const signals: BypassSignal[] = [
        {
          type: 'STALE_REFERRAL',
          description: `Referral has been in ACTIVATED state for ${daysSinceActivation} days without any progress.`,
          weight: Math.min(7, Math.floor(daysSinceActivation / 10)),
          detectedAt: new Date().toISOString(),
        },
      ];

      const riskScore = signals.reduce((sum, s) => sum + s.weight * 10, 0);

      const existing = await this.prisma.hireBypassFlag.findFirst({
        where: {
          referralId: referral.id,
          mandateId: referral.mandateId,
          isResolved: false,
          signals: { path: ['$[0].type'], equals: 'STALE_REFERRAL' },
        },
      });

      if (!existing && riskScore >= RISK_THRESHOLDS.LOW) {
        await this.prisma.hireBypassFlag.create({
          data: {
            referralId: referral.id,
            mandateId: referral.mandateId,
            orgId: referral.mandate.orgId,
            riskLevel: this.calculateRiskLevel(riskScore),
            riskScore,
            signals: signals as any,
            description: `Referral for ${referral.candidateProfile.name} stuck in ACTIVATED for ${daysSinceActivation} days with no progress from company.`,
          },
        });
        flagsCreated++;

        await this.prisma.referral.update({
          where: { id: referral.id },
          data: {
            bypassRiskScore: { increment: riskScore },
            lastCheckedAt: new Date(),
            statusCheckCount: { increment: 1 },
          },
        });
      }
    }

    // 3. Detect mandates paused shortly after receiving referrals
    const recentPauseDate = new Date();
    recentPauseDate.setDate(recentPauseDate.getDate() - 14);

    const pausedMandates = await this.prisma.mandate.findMany({
      where: {
        status: 'PAUSED',
        updatedAt: { gte: recentPauseDate },
        referrals: {
          some: {
            status: { in: ['ACTIVATED', 'UNDER_REVIEW', 'SHORTLISTED'] },
            activatedAt: { gte: recentPauseDate },
          },
        },
      },
      include: {
        organization: { select: { id: true, name: true } },
        referrals: {
          where: {
            status: { in: ['ACTIVATED', 'UNDER_REVIEW', 'SHORTLISTED'] },
          },
          include: {
            candidateProfile: { select: { name: true } },
          },
        },
      },
    });

    for (const mandate of pausedMandates) {
      const existing = await this.prisma.hireBypassFlag.findFirst({
        where: { mandateId: mandate.id, isResolved: false },
      });

      if (!existing && mandate.referrals.length > 0) {
        const signals: BypassSignal[] = [
          {
            type: 'MANDATE_PAUSED_AFTER_REFERRALS',
            description: `Mandate "${mandate.title}" was paused shortly after receiving ${mandate.referrals.length} active referral(s).`,
            weight: 5,
            detectedAt: new Date().toISOString(),
          },
        ];

        await this.prisma.hireBypassFlag.create({
          data: {
            mandateId: mandate.id,
            orgId: mandate.orgId,
            riskLevel: BypassRiskLevel.MEDIUM,
            riskScore: 50,
            signals: signals as any,
            description: `Mandate "${mandate.title}" paused after receiving active referrals — may indicate off-platform hiring.`,
          },
        });
        flagsCreated++;
      }
    }

    const distinctOrgs = new Set([
      ...filledMandates.map((m) => m.orgId),
      ...staleReferrals.map((r) => r.mandate.orgId),
      ...pausedMandates.map((m) => m.orgId),
    ]);

    this.logger.log(
      `Stale referral scan complete. Flags created: ${flagsCreated}, Orgs scanned: ${distinctOrgs.size}`,
    );

    return { flagsCreated, orgsScanned: distinctOrgs.size };
  }

  // ── Option 1: Mandatory Hire Confirmation ──────────────────────

  /**
   * Sends periodic "What happened to this candidate?" checks to companies.
   * Called by the pg-boss cron worker (runs weekly).
   */
  async runHireConfirmationChecks(): Promise<{
    notificationsSent: number;
    escalations: number;
    paused: number;
  }> {
    this.logger.log('Starting hire confirmation checks...');
    let notificationsSent = 0;
    let escalations = 0;
    let paused = 0;

    // Find all active referrals that haven't been checked recently
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - CONFIRMATION_REMINDER_DAYS);

    const referralsToCheck = await this.prisma.referral.findMany({
      where: {
        status: {
          in: ['ACTIVATED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'],
        },
        OR: [
          { lastCheckedAt: null },
          { lastCheckedAt: { lte: checkDate } },
        ],
        mandate: { status: { in: ['ACTIVE', 'PAUSED', 'FILLED'] } },
        claimScope: {
          status: 'ACTIVE',
          ownershipExpiresAt: { gt: new Date() },
        },
      },
      include: {
        mandate: {
          select: {
            id: true,
            title: true,
            orgId: true,
            status: true,
          },
        },
        candidateProfile: { select: { name: true, email: true } },
        recruiter: { select: { name: true, email: true, auth0Sub: true } },
      },
    });

    for (const referral of referralsToCheck) {
      const checkCount = referral.statusCheckCount;

      if (checkCount >= 3) {
        // Escalation: 3+ unanswered checks → flag to support
        const existingFlag = await this.prisma.hireBypassFlag.findFirst({
          where: {
            referralId: referral.id,
            isResolved: false,
          },
        });

        if (!existingFlag) {
          await this.prisma.hireBypassFlag.create({
            data: {
              referralId: referral.id,
              mandateId: referral.mandateId,
              orgId: referral.mandate.orgId,
              riskLevel: BypassRiskLevel.HIGH,
              riskScore: 70,
              signals: [
                {
                  type: 'NO_CONFIRMATION_RESPONSE',
                  description: `Company has not responded to ${checkCount} hire confirmation requests for ${referral.candidateProfile.name}.`,
                  weight: 7,
                  detectedAt: new Date().toISOString(),
                },
              ] as any,
              description: `Company has ignored ${checkCount} hire confirmation checks for ${referral.candidateProfile.name} on mandate "${referral.mandate.title}".`,
            },
          });
          escalations++;
        }

        // After PAUSE_THRESHOLD_DAYS / 3 checks, consider pausing mandate referrals
        if (checkCount >= Math.ceil(PAUSE_THRESHOLD_DAYS / CONFIRMATION_REMINDER_DAYS)) {
          // Notify support admins for manual review
          this.notifySupportTeam(referral);
          paused++;
        }
      }

      // Send notification to company admins
      const admins = await this.prisma.user.findMany({
        where: { orgId: referral.mandate.orgId, role: { in: ['ADMIN', 'HR'] } },
        select: { id: true, email: true },
        take: 5,
      });

      for (const admin of admins) {
        this.notifications
          .create({
            userId: admin.id,
            orgId: referral.mandate.orgId,
            type: 'HIRE_CONFIRMATION_REQUEST',
            title: 'Candidate Status Update Required',
            body: `Please update the status of ${referral.candidateProfile.name} referred for "${referral.mandate.title}". What is the current hiring status?`,
            entityType: 'REFERRAL',
            entityId: referral.id,
            actionUrl: `/mandates/${referral.mandateId}/referrals`,
          })
          .catch(() => null);
      }

      // Update check tracking
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          lastCheckedAt: new Date(),
          statusCheckCount: { increment: 1 },
        },
      });

      notificationsSent++;
    }

    this.logger.log(
      `Hire confirmation checks complete. Notifications: ${notificationsSent}, Escalations: ${escalations}, Paused: ${paused}`,
    );

    return { notificationsSent, escalations, paused };
  }

  // ── Option 2: Candidate-Side Hire Detection ────────────────────

  /**
   * Sends periodic "Have you been hired?" check-ins to candidates.
   * Called by the pg-boss cron worker (runs bi-weekly).
   */
  async runCandidateCheckIns(): Promise<{ checksSent: number }> {
    this.logger.log('Starting candidate check-in dispatch...');
    let checksSent = 0;

    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 14); // Don't re-check within 14 days

    const referrals = await this.prisma.referral.findMany({
      where: {
        status: {
          in: ['ACTIVATED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'],
        },
        candidateReportedHire: false,
        activatedAt: { lte: checkDate },
        OR: [
          { lastCheckedAt: null },
          { lastCheckedAt: { lte: checkDate } },
        ],
        mandate: { status: { in: ['ACTIVE', 'PAUSED', 'FILLED', 'CLOSED'] } },
      },
      include: {
        mandate: {
          select: {
            title: true,
            orgId: true,
            status: true,
            organization: { select: { name: true } },
          },
        },
        candidateProfile: { select: { id: true, name: true, email: true } },
      },
    });

    for (const referral of referrals) {
      // Check if there's already a pending/unexpired check
      const existingCheck = await this.prisma.candidateStatusCheck.findFirst({
        where: {
          referralId: referral.id,
          response: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingCheck) continue;

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const mandateStatus = referral.mandate.status;
      const checkType =
        mandateStatus === 'FILLED'
          ? 'MANDATE_FILLED'
          : mandateStatus === 'CLOSED'
            ? 'MANDATE_CLOSED'
            : 'PERIODIC';

      const orgName = referral.mandate.organization.name;
      const mandateTitle = referral.mandate.title;

      await this.prisma.candidateStatusCheck.create({
        data: {
          referralId: referral.id,
          candidateProfileId: referral.candidateProfile.id,
          checkType,
          question: `Hi ${referral.candidateProfile.name}, we'd like to know the status of your application for "${mandateTitle}" at ${orgName}. Have you received an offer or been hired?`,
          checkToken: token,
          expiresAt,
        },
      });

      // Send email to candidate
      this.emailService
        .sendCandidateStatusCheckEmail({
          toEmail: referral.candidateProfile.email,
          candidateName: referral.candidateProfile.name,
          companyName: orgName,
          mandateTitle,
          checkToken: token,
        })
        .catch((e) => this.logger.error('Failed to send candidate check-in email:', e));

      // Update referral tracking
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { lastCheckedAt: new Date() },
      });

      checksSent++;
    }

    this.logger.log(`Candidate check-in dispatch complete. Checks sent: ${checksSent}`);
    return { checksSent };
  }

  /**
   * Process a candidate's response to a status check.
   * Public endpoint (token-based auth, no login required).
   */
  async processCandidateResponse(
    checkToken: string,
    response: StatusCheckResponse,
    responseDetails?: string,
  ) {
    const check = await this.prisma.candidateStatusCheck.findUnique({
      where: { checkToken },
      include: {
        referral: {
          include: {
            mandate: {
              select: {
                id: true,
                title: true,
                orgId: true,
                organization: { select: { name: true } },
              },
            },
            recruiter: {
              select: { id: true, name: true, email: true, auth0Sub: true },
            },
          },
        },
      },
    });

    if (!check) throw new NotFoundException('Status check not found or invalid token.');
    if (check.expiresAt < new Date()) {
      throw new BadRequestException('This status check has expired.');
    }
    if (check.response) {
      throw new BadRequestException('You have already responded to this check.');
    }

    // Save response
    await this.prisma.candidateStatusCheck.update({
      where: { id: check.id },
      data: {
        response,
        responseDetails,
        respondedAt: new Date(),
      },
    });

    if (response === StatusCheckResponse.HIRED) {
      // CRITICAL: Candidate confirmed they were hired!
      await this.handleCandidateConfirmedHire(check.referral);
    } else if (response === StatusCheckResponse.REJECTED) {
      // Update referral status if company hasn't done it
      if (
        check.referral.status !== 'REJECTED' &&
        check.referral.status !== 'HIRED'
      ) {
        await this.prisma.referral.update({
          where: { id: check.referralId },
          data: { status: 'REJECTED' },
        });
      }
    }

    return {
      success: true,
      message: 'Thank you for your response. We have recorded your update.',
    };
  }

  /**
   * When a candidate confirms they were hired, this creates a bypass flag,
   * notifies the support team, and marks the referral for reward processing.
   */
  private async handleCandidateConfirmedHire(referral: any) {
    // Mark the referral
    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        candidateReportedHire: true,
        bypassRiskScore: 100,
      },
    });

    // Create a CRITICAL bypass flag
    await this.prisma.hireBypassFlag.create({
      data: {
        referralId: referral.id,
        mandateId: referral.mandateId,
        orgId: referral.mandate.orgId,
        riskLevel: BypassRiskLevel.CRITICAL,
        riskScore: 100,
        signals: [
          {
            type: 'CANDIDATE_CONFIRMED_HIRE',
            description: `Candidate directly confirmed being hired for "${referral.mandate?.title || 'the role'}" at ${referral.mandate?.organization?.name || 'the company'}, but company never updated referral status to HIRED.`,
            weight: 10,
            detectedAt: new Date().toISOString(),
          },
        ] as any,
        description: `CRITICAL: Candidate confirmed hire for "${referral.mandate?.title || 'the role'}" but company did not report it. Recruiter ${referral.recruiter?.name || 'assigned'} may be owed a reward.`,
      },
    });

    // Notify the recruiter
    if (referral.recruiter?.auth0Sub) {
      this.notifications
        .create({
          userId: referral.recruiter.auth0Sub,
          orgId: referral.mandate.orgId,
          type: 'CANDIDATE_CONFIRMED_HIRE',
          title: 'Candidate Hire Confirmed!',
          body: `Your referred candidate has confirmed being hired for "${referral.mandate.title}". Our team is verifying with the company.`,
          entityType: 'REFERRAL',
          entityId: referral.id,
          actionUrl: '/recruiter/dashboard',
        })
        .catch(() => null);
    }

    // Notify support team
    this.notifySupportTeam(referral);

    // Notify company admins to confirm
    const admins = await this.prisma.user.findMany({
      where: {
        orgId: referral.mandate.orgId,
        role: { in: ['ADMIN', 'HR'] },
      },
      select: { id: true },
      take: 5,
    });

    for (const admin of admins) {
      this.notifications
        .create({
          userId: admin.id,
          orgId: referral.mandate.orgId,
          type: 'HIRE_CONFIRMATION_REQUIRED',
          title: 'Hire Confirmation Required',
          body: `A candidate has confirmed being hired for "${referral.mandate.title}". Please confirm this hire in the platform to process the recruiter's reward.`,
          entityType: 'REFERRAL',
          entityId: referral.id,
          actionUrl: `/mandates/${referral.mandateId}/referrals`,
        })
        .catch(() => null);
    }
  }

  // ── Public: Get status check details (for candidate page) ──────

  async getStatusCheckByToken(token: string) {
    const check = await this.prisma.candidateStatusCheck.findUnique({
      where: { checkToken: token },
      include: {
        referral: {
          select: {
            mandate: {
              select: {
                title: true,
                organization: { select: { name: true } },
              },
            },
          },
        },
        candidateProfile: { select: { name: true } },
      },
    });

    if (!check) throw new NotFoundException('Status check not found.');

    return {
      id: check.id,
      candidateName: check.candidateProfile.name,
      companyName: check.referral.mandate.organization.name,
      mandateTitle: check.referral.mandate.title,
      question: check.question,
      hasResponded: !!check.response,
      response: check.response,
      isExpired: check.expiresAt < new Date(),
      expiresAt: check.expiresAt,
    };
  }

  // ── Company: Confirm referral status (mandatory confirmation) ──

  async confirmReferralStatus(
    orgId: string,
    mandateId: string,
    referralId: string,
    status: string,
    notes?: string,
  ) {
    const referral = await this.prisma.referral.findFirst({
      where: { id: referralId, mandateId, mandate: { orgId } },
      include: {
        recruiter: { select: { name: true, email: true, auth0Sub: true } },
        candidateProfile: { select: { name: true } },
        mandate: { select: { title: true } },
      },
    });

    if (!referral) throw new NotFoundException('Referral not found for this mandate.');

    if (status === 'HIRED') {
      // Company confirms the hire — update referral and trigger reward
      await this.prisma.referral.update({
        where: { id: referralId },
        data: {
          status: 'HIRED',
          lastCheckedAt: new Date(),
          bypassRiskScore: 0, // Clear risk since they confirmed
        },
      });

      // Resolve any existing bypass flags
      await this.prisma.hireBypassFlag.updateMany({
        where: { referralId, isResolved: false },
        data: {
          isResolved: true,
          resolution: 'CONFIRMED_HIRE',
          resolvedAt: new Date(),
          notes: notes || 'Company confirmed hire via confirmation flow.',
        },
      });

      // Notify recruiter
      if (referral.recruiter.auth0Sub) {
        this.notifications
          .create({
            userId: referral.recruiter.auth0Sub,
            orgId,
            type: 'REFERRAL_HIRED_CONFIRMED',
            title: 'Hire Confirmed! 🎉',
            body: `Great news! ${referral.candidateProfile.name} has been confirmed as hired for "${referral.mandate.title}". Your reward is being processed.`,
            entityType: 'REFERRAL',
            entityId: referralId,
            actionUrl: '/recruiter/dashboard',
          })
          .catch(() => null);
      }

      return { success: true, message: 'Hire confirmed. Reward processing initiated.' };
    }

    if (status === 'REJECTED') {
      await this.prisma.referral.update({
        where: { id: referralId },
        data: { status: 'REJECTED', lastCheckedAt: new Date() },
      });

      // Resolve any flags as false positive
      await this.prisma.hireBypassFlag.updateMany({
        where: { referralId, isResolved: false },
        data: {
          isResolved: true,
          resolution: 'FALSE_POSITIVE',
          resolvedAt: new Date(),
          notes: notes || 'Company confirmed candidate was rejected.',
        },
      });

      return { success: true, message: 'Referral marked as rejected.' };
    }

    // IN_PROCESS — just update the check timestamp to reset the clock
    await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        lastCheckedAt: new Date(),
        statusCheckCount: 0, // Reset check counter since they responded
      },
    });

    return { success: true, message: 'Status acknowledged. We will check again later.' };
  }

  // ── Hook: Called when mandate status changes to FILLED/CLOSED ──

  /**
   * Auto-triggered when a company marks a mandate as FILLED or CLOSED.
   * Immediately sends candidate check-ins for all active referrals on that mandate.
   */
  async onMandateStatusChange(mandateId: string, newStatus: string) {
    if (newStatus !== 'FILLED' && newStatus !== 'CLOSED') return;

    const referrals = await this.prisma.referral.findMany({
      where: {
        mandateId,
        status: {
          in: ['ACTIVATED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED'],
        },
        candidateReportedHire: false,
      },
      include: {
        candidateProfile: { select: { id: true, name: true, email: true } },
        mandate: {
          select: {
            title: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    for (const referral of referrals) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      await this.prisma.candidateStatusCheck.create({
        data: {
          referralId: referral.id,
          candidateProfileId: referral.candidateProfile.id,
          checkType: newStatus === 'FILLED' ? 'MANDATE_FILLED' : 'MANDATE_CLOSED',
          question: `Hi ${referral.candidateProfile.name}, the position "${referral.mandate.title}" at ${referral.mandate.organization.name} has been ${newStatus.toLowerCase()}. Were you hired for this role?`,
          checkToken: token,
          expiresAt,
        },
      });

      this.emailService
        .sendCandidateStatusCheckEmail({
          toEmail: referral.candidateProfile.email,
          candidateName: referral.candidateProfile.name,
          companyName: referral.mandate.organization.name,
          mandateTitle: referral.mandate.title,
          checkToken: token,
        })
        .catch((e) => this.logger.error('Failed to send candidate check-in:', e));
    }

    this.logger.log(
      `Mandate ${mandateId} moved to ${newStatus}: sent ${referrals.length} candidate check-ins`,
    );
  }

  // ── Company Trust Score Calculation ─────────────────────────────

  /**
   * Recalculates trust scores for all organisations with mandates.
   * Called by the pg-boss cron worker (runs weekly).
   */
  async recalculateTrustScores(): Promise<{ orgsUpdated: number }> {
    this.logger.log('Recalculating company trust scores...');

    const orgs = await this.prisma.organization.findMany({
      where: { mandates: { some: {} } },
      select: { id: true },
    });

    let orgsUpdated = 0;

    for (const org of orgs) {
      await this.calculateOrgTrustScore(org.id);
      orgsUpdated++;
    }

    this.logger.log(`Trust score recalculation complete. Orgs updated: ${orgsUpdated}`);
    return { orgsUpdated };
  }

  async calculateOrgTrustScore(orgId: string) {
    const [totalReferrals, hiredReferrals, respondedReferrals, disputes, filledMandates, mandatesWithHiredReferral] =
      await Promise.all([
        // Total referrals received (excluding pending consent)
        this.prisma.referral.count({
          where: {
            mandate: { orgId },
            status: {
              notIn: ['PENDING_CONSENT', 'CONSENT_REQUESTED', 'CANDIDATE_DECLINED'],
            },
          },
        }),
        // Referrals that reached HIRED status
        this.prisma.referral.count({
          where: { mandate: { orgId }, status: 'HIRED' },
        }),
        // Referrals that got any status update beyond ACTIVATED within 14 days
        this.prisma.referral.count({
          where: {
            mandate: { orgId },
            status: {
              notIn: ['PENDING_CONSENT', 'CONSENT_REQUESTED', 'CANDIDATE_DECLINED', 'ACTIVATED'],
            },
          },
        }),
        // Disputed rewards
        this.prisma.rewardTracking.count({
          where: { orgId, status: 'DISPUTED' },
        }),
        // Mandates that were filled
        this.prisma.mandate.count({
          where: { orgId, status: { in: ['FILLED', 'CLOSED'] } },
        }),
        // Mandates filled where at least one referral was marked HIRED
        this.prisma.mandate.count({
          where: {
            orgId,
            status: { in: ['FILLED', 'CLOSED'] },
            referrals: { some: { status: 'HIRED' } },
          },
        }),
      ]);

    const responseRate = totalReferrals > 0
      ? Math.round((respondedReferrals / totalReferrals) * 10000) / 100
      : 100;

    const hireReportRate = filledMandates > 0
      ? Math.round((mandatesWithHiredReferral / filledMandates) * 10000) / 100
      : 100;

    // Determine trust level
    let trustLevel: 'TRUSTED' | 'STANDARD' | 'FLAGGED' | 'SUSPENDED' = 'STANDARD';
    if (responseRate > 90 && disputes === 0 && hireReportRate > 80) {
      trustLevel = 'TRUSTED';
    } else if (responseRate < 40 || disputes > 3) {
      trustLevel = 'SUSPENDED';
    } else if (responseRate < 60 || disputes > 1 || hireReportRate < 30) {
      trustLevel = 'FLAGGED';
    }

    return this.prisma.companyTrustScore.upsert({
      where: { orgId },
      update: {
        responseRate,
        hireReportRate,
        totalReferrals,
        reportedHires: hiredReferrals,
        disputeCount: disputes,
        trustLevel,
        lastCalculatedAt: new Date(),
      },
      create: {
        orgId,
        responseRate,
        hireReportRate,
        totalReferrals,
        reportedHires: hiredReferrals,
        disputeCount: disputes,
        trustLevel,
        lastCalculatedAt: new Date(),
      },
    });
  }

  // ── Query APIs ─────────────────────────────────────────────────

  /** Get all unresolved bypass flags (for support admin dashboard) */
  async getBypassFlags(opts: {
    orgId?: string;
    riskLevel?: BypassRiskLevel;
    isResolved?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { orgId, riskLevel, isResolved = false, limit = 20, offset = 0 } = opts;
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(offset, 0);

    const where: any = { isResolved };
    if (orgId) where.orgId = orgId;
    if (riskLevel) where.riskLevel = riskLevel;

    const [flags, total] = await Promise.all([
      this.prisma.hireBypassFlag.findMany({
        where,
        take,
        skip,
        orderBy: [{ riskScore: 'desc' }, { createdAt: 'desc' }],
        include: {
          referral: {
            select: {
              id: true,
              status: true,
              candidateProfile: { select: { name: true, email: true } },
              recruiter: { select: { name: true, email: true } },
              mandate: {
                select: {
                  title: true,
                  status: true,
                  organization: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.hireBypassFlag.count({ where }),
    ]);

    return {
      data: flags,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /** Resolve a bypass flag (support admin action) */
  async resolveBypassFlag(
    flagId: string,
    resolution: string,
    notes: string,
    resolvedById: string,
  ) {
    const flag = await this.prisma.hireBypassFlag.findUnique({
      where: { id: flagId },
    });
    if (!flag) throw new NotFoundException('Bypass flag not found.');

    const updated = await this.prisma.hireBypassFlag.update({
      where: { id: flagId },
      data: {
        isResolved: true,
        resolution,
        notes,
        resolvedById,
        resolvedAt: new Date(),
      },
    });

    // If resolution confirms a hire, trigger reward flow
    if (resolution === 'CONFIRMED_HIRE' && flag.referralId) {
      await this.prisma.referral.update({
        where: { id: flag.referralId },
        data: { status: 'HIRED' },
      });
    }

    return updated;
  }

  /** Get trust score for an organisation */
  async getTrustScore(orgId: string) {
    const score = await this.prisma.companyTrustScore.findUnique({
      where: { orgId },
    });
    if (!score) {
      // Calculate on-demand if not yet computed
      return this.calculateOrgTrustScore(orgId);
    }
    return score;
  }

  /** Get all trust scores (support admin) */
  async getAllTrustScores(limit = 50, offset = 0) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(offset, 0);

    return this.prisma.companyTrustScore.findMany({
      take,
      skip,
      orderBy: { trustLevel: 'asc' },
      include: {
        organization: { select: { id: true, name: true, industry: true } },
      },
    });
  }

  /** Get bypass flags summary stats */
  async getBypassStats() {
    const [total, unresolved, critical, high, medium, confirmedHires] =
      await Promise.all([
        this.prisma.hireBypassFlag.count(),
        this.prisma.hireBypassFlag.count({ where: { isResolved: false } }),
        this.prisma.hireBypassFlag.count({
          where: { riskLevel: 'CRITICAL', isResolved: false },
        }),
        this.prisma.hireBypassFlag.count({
          where: { riskLevel: 'HIGH', isResolved: false },
        }),
        this.prisma.hireBypassFlag.count({
          where: { riskLevel: 'MEDIUM', isResolved: false },
        }),
        this.prisma.hireBypassFlag.count({
          where: { resolution: 'CONFIRMED_HIRE' },
        }),
      ]);

    return { total, unresolved, critical, high, medium, confirmedHires };
  }

  // ── Helpers ────────────────────────────────────────────────────

  private calculateRiskLevel(score: number): BypassRiskLevel {
    if (score >= RISK_THRESHOLDS.CRITICAL) return BypassRiskLevel.CRITICAL;
    if (score >= RISK_THRESHOLDS.HIGH) return BypassRiskLevel.HIGH;
    if (score >= RISK_THRESHOLDS.MEDIUM) return BypassRiskLevel.MEDIUM;
    return BypassRiskLevel.LOW;
  }

  private notifySupportTeam(referral: any) {
    // Fire-and-forget support team notification
    this.prisma.user
      .findMany({
        where: { role: { in: ['SUPPORT_REP', 'SUPPORT_ADMIN'] } },
        select: { id: true, orgId: true },
        take: 10,
      })
      .then((supportUsers) => {
        for (const su of supportUsers) {
          this.notifications
            .create({
              userId: su.id,
              orgId: su.orgId,
              type: 'HIRE_BYPASS_ESCALATION',
              title: '🚨 Hire Bypass Escalation',
              body: `Potential hire bypass detected for "${referral.mandate?.title || 'Unknown'}". Please investigate.`,
              entityType: 'REFERRAL',
              entityId: referral.id,
              actionUrl: `/support/bypass-flags`,
            })
            .catch(() => null);
        }
      })
      .catch(() => null);
  }
}
