import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BgvCheckStatus,
  BgvCheckType,
  BgvFinding,
  BgvProfileStatus,
  BgvRiskScore,
  BgvVendor,
  TicketCategory,
  TicketPriority,
} from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BgvVendorRouter } from '../../integrations/bgv/bgv.service';
import { JobQueueService } from '../job-queue/job-queue.service';
import { InitiateBgvDto } from './dto/initiate-bgv.dto';
import { detectDiscrepancies, findingFromHits } from './services/discrepancy-detector';
import { BgvAiService, BgvAiSummary } from './services/bgv-ai.service';

@Injectable()
export class BgvService {
  private readonly logger = new Logger(BgvService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly router: BgvVendorRouter,
    private readonly queue: JobQueueService,
    private readonly ai: BgvAiService,
  ) {}

  // ── Profile lifecycle ─────────────────────────────────────────

  async initiate(orgId: string, dto: InitiateBgvDto) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: dto.candidateId, orgId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    const existing = await this.prisma.bgvProfile.findFirst({
      where: { orgId, candidateId: dto.candidateId, offerId: dto.offerId ?? null },
    });
    if (existing) {
      throw new BadRequestException(`BGV profile already exists for this candidate (id=${existing.id})`);
    }

    const provider = await this.router.getProviderForOrg(orgId);
    const vendorEnum: BgvVendor = providerToEnum(provider.name);

    const consentToken = randomBytes(24).toString('hex');

    const profile = await this.prisma.bgvProfile.create({
      data: {
        orgId,
        candidateId: dto.candidateId,
        offerId: dto.offerId,
        vendor: vendorEnum,
        status: BgvProfileStatus.CONSENT_PENDING,
        consentToken,
        retentionDays: dto.retentionDays ?? 90,
        checks: {
          create: dto.checkTypes.map((type) => ({
            type,
            status: BgvCheckStatus.QUEUED,
            request: {} as any,
          })),
        },
      },
      include: { checks: true, candidate: true },
    });

    return profile;
  }

  async listForOrg(orgId: string, opts: { status?: BgvProfileStatus } = {}) {
    return this.prisma.bgvProfile.findMany({
      where: { orgId, ...(opts.status && { status: opts.status }) },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        checks: { select: { id: true, type: true, status: true, finding: true, costInPaise: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForOrg(orgId: string, id: string) {
    const p = await this.prisma.bgvProfile.findFirst({
      where: { id, orgId },
      include: {
        candidate: true,
        offer: { select: { id: true, status: true } },
        checks: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!p) throw new NotFoundException('BGV profile not found');
    return p;
  }

  // ── Consent flow (token-gated) ────────────────────────────────

  async findByConsentToken(token: string) {
    const p = await this.prisma.bgvProfile.findUnique({
      where: { consentToken: token },
      include: {
        organization: { select: { id: true, name: true } },
        candidate: { select: { id: true, name: true, email: true, phone: true } },
        checks: { select: { type: true } },
      },
    });
    if (!p) throw new NotFoundException('Consent record not found');
    return p;
  }

  async startConsent(token: string, ipAddress: string | undefined) {
    const p = await this.findByConsentToken(token);
    if (p.status !== BgvProfileStatus.CONSENT_PENDING) {
      throw new BadRequestException(`Consent already ${p.status}`);
    }
    const otp = randomInt(100000, 999999).toString();
    const exp = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.bgvProfile.update({
      where: { id: p.id },
      data: { consentOtp: otp, consentOtpExp: exp },
    });
    // TODO: send via MSG91 once Phase 5C lands; for now log so devs can grab in console
    this.logger.warn(`[BGV consent OTP] candidate=${p.candidate.email} otp=${otp}`);
    return { sent: true, channel: 'console-dev', expiresInSec: 600 };
  }

  async verifyConsent(token: string, otp: string, signedName: string, ipAddress: string | undefined) {
    const p = await this.findByConsentToken(token);
    if (p.status !== BgvProfileStatus.CONSENT_PENDING) {
      throw new BadRequestException(`Consent already ${p.status}`);
    }
    if (!p.consentOtp || !p.consentOtpExp) throw new BadRequestException('OTP not yet sent');
    if (p.consentOtpExp < new Date()) throw new BadRequestException('OTP expired — request a new one');
    if (p.consentOtp !== otp) throw new BadRequestException('Invalid OTP');

    const ipHash = ipAddress ? createHash('sha256').update(ipAddress).digest('hex') : null;
    await this.prisma.bgvProfile.update({
      where: { id: p.id },
      data: {
        consentedAt: new Date(),
        consentIpHash: ipHash,
        consentOtp: null,
        consentOtpExp: null,
        status: BgvProfileStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
    // Queue first round of checks
    await this.queue.enqueue('bgv.start', { profileId: p.id, signedName });
    return { ok: true };
  }

  // ── Vendor orchestration ──────────────────────────────────────

  async dispatchPendingChecks(profileId: string) {
    const profile = await this.prisma.bgvProfile.findUnique({
      where: { id: profileId },
      include: { candidate: true, checks: { where: { status: BgvCheckStatus.QUEUED } } },
    });
    if (!profile || profile.checks.length === 0) return;

    const provider = this.router.byVendor(profile.vendor);
    let vendorRefId = profile.vendorRefId;
    if (!vendorRefId) {
      const r = await provider.initiateProfile({
        candidate: { fullName: profile.candidate.name, email: profile.candidate.email, phone: profile.candidate.phone ?? undefined },
        orgRefId: profile.orgId,
      });
      vendorRefId = r.vendorRefId;
      await this.prisma.bgvProfile.update({
        where: { id: profile.id },
        data: { vendorRefId },
      });
    }

    for (const check of profile.checks) {
      try {
        const r = await provider.submitCheck({
          vendorProfileRefId: vendorRefId,
          type: check.type,
          payload: { candidateName: profile.candidate.name, email: profile.candidate.email },
        });
        await this.prisma.bgvCheck.update({
          where: { id: check.id },
          data: {
            status: BgvCheckStatus.IN_PROGRESS,
            vendorRefId: r.vendorCheckRefId,
            startedAt: new Date(),
          },
        });
      } catch (err) {
        this.logger.error(`Failed to submit check ${check.id}: ${err}`);
        await this.prisma.bgvCheck.update({
          where: { id: check.id },
          data: {
            status: BgvCheckStatus.FAILED,
            failureReason: err instanceof Error ? err.message : 'Unknown error',
            retryCount: { increment: 1 },
          },
        });
      }
    }
  }

  async pollOpenChecks() {
    const open = await this.prisma.bgvCheck.findMany({
      where: { status: BgvCheckStatus.IN_PROGRESS, vendorRefId: { not: null } },
      include: { profile: { include: { candidate: true } } },
      take: 100,
    });
    for (const check of open) {
      try {
        const provider = this.router.byVendor(check.profile.vendor);
        const status = await provider.getCheckStatus(check.vendorRefId!);
        await this.applyVendorStatus(check.id, status);
      } catch (err) {
        this.logger.warn(`Poll failed for check ${check.id}: ${err}`);
      }
    }
  }

  async applyVendorStatus(
    checkId: string,
    status: { status: string; finding?: string; reportUrl?: string; rawResponse?: unknown; failureReason?: string; costInPaise?: number },
  ) {
    const check = await this.prisma.bgvCheck.findUnique({
      where: { id: checkId },
      include: { profile: { include: { candidate: true } } },
    });
    if (!check) return;

    const finishing = status.status === 'COMPLETED' || status.status === 'FAILED' || status.status === 'CANCELLED';

    let finding: BgvFinding = (status.finding as BgvFinding) ?? check.finding;
    if (status.status === 'COMPLETED' && status.rawResponse) {
      const hits = detectDiscrepancies(check.type, status.rawResponse, { name: check.profile.candidate.name });
      if (hits.length > 0) {
        finding = findingFromHits(hits);
        await this.maybeOpenDiscrepancyTicket(check.profile.id, check.profile.orgId, check.type, hits);
      }
    }

    await this.prisma.bgvCheck.update({
      where: { id: checkId },
      data: {
        status: status.status as BgvCheckStatus,
        finding,
        reportUrl: status.reportUrl ?? check.reportUrl,
        response: (status.rawResponse ?? null) as any,
        failureReason: status.failureReason ?? check.failureReason,
        costInPaise: status.costInPaise ?? check.costInPaise,
        completedAt: finishing ? new Date() : check.completedAt,
      },
    });

    await this.maybeFinalizeProfile(check.profileId);
  }

  private async maybeFinalizeProfile(profileId: string) {
    const profile = await this.prisma.bgvProfile.findUnique({
      where: { id: profileId },
      include: { checks: true, candidate: { select: { name: true, email: true } } },
    });
    if (!profile) return;
    const allTerminal = profile.checks.every(
      (c) =>
        c.status === BgvCheckStatus.COMPLETED ||
        c.status === BgvCheckStatus.FAILED ||
        c.status === BgvCheckStatus.CANCELLED,
    );
    if (!allTerminal) return;
    if (profile.status === BgvProfileStatus.COMPLETED || profile.status === BgvProfileStatus.CANCELLED) return;

    const discrepancyCount = profile.checks.filter((c) => c.finding === BgvFinding.DISCREPANCY).length;
    const failedCount = profile.checks.filter((c) => c.status === BgvCheckStatus.FAILED).length;

    let risk: BgvRiskScore = BgvRiskScore.GREEN;
    if (discrepancyCount > 2 || profile.checks.some((c) => c.type === BgvCheckType.CRIMINAL_COURT && c.finding === BgvFinding.DISCREPANCY)) {
      risk = BgvRiskScore.RED;
    } else if (discrepancyCount > 0 || failedCount > 0) {
      risk = BgvRiskScore.AMBER;
    }

    let aiSummary: BgvAiSummary | null = null;
    try {
      aiSummary = await this.ai.summarise({
        candidate: profile.candidate,
        profile: { riskScore: risk, vendor: profile.vendor },
        checks: profile.checks.map((c) => ({
          type: c.type,
          status: c.status,
          finding: c.finding,
          reportUrl: c.reportUrl,
          response: c.response,
        })),
      });
    } catch (err) {
      this.logger.warn(`AI summarise failed: ${err}`);
    }

    await this.prisma.bgvProfile.update({
      where: { id: profileId },
      data: {
        status: discrepancyCount > 0 ? BgvProfileStatus.NEEDS_REVIEW : BgvProfileStatus.COMPLETED,
        riskScore: risk,
        completedAt: new Date(),
        aiSummary: (aiSummary ?? null) as any,
      },
    });

    // Hand off to joining when GREEN + linked offer
    if (risk === BgvRiskScore.GREEN && profile.offerId) {
      try {
        const j = await this.prisma.candidateJoining.findUnique({ where: { offerId: profile.offerId } });
        if (j && j.status !== 'READY_TO_JOIN') {
          await this.prisma.candidateJoining.update({
            where: { id: j.id },
            data: { status: 'READY_TO_JOIN' },
          });
        }
      } catch (err) {
        this.logger.warn(`Could not auto-advance joining: ${err}`);
      }
    }
  }

  private async maybeOpenDiscrepancyTicket(
    profileId: string,
    orgId: string,
    checkType: BgvCheckType,
    hits: Array<{ rule: string; severity: string; message: string }>,
  ) {
    const high = hits.find((h) => h.severity === 'HIGH');
    const priority: TicketPriority = high ? TicketPriority.HIGH : TicketPriority.MEDIUM;
    await this.prisma.supportTicket.create({
      data: {
        orgId,
        title: `BGV discrepancy: ${checkType}`,
        description: hits.map((h) => `[${h.severity}] ${h.rule}: ${h.message}`).join('\n'),
        category: TicketCategory.BGV_DISCREPANCY,
        priority,
        reportedBy: 'system',
        tags: ['bgv', `profile:${profileId}`] as any,
      },
    });
  }

  // ── HR overrides ──────────────────────────────────────────────

  async overrideFinding(orgId: string, checkId: string, userId: string, finding: BgvFinding, justification: string) {
    const check = await this.prisma.bgvCheck.findFirst({
      where: { id: checkId, profile: { orgId } },
    });
    if (!check) throw new NotFoundException('Check not found');
    const audit = (check.response as any) ?? {};
    audit.overrides = audit.overrides ?? [];
    audit.overrides.push({
      userId,
      from: check.finding,
      to: finding,
      justification,
      at: new Date().toISOString(),
    });
    await this.prisma.bgvCheck.update({
      where: { id: checkId },
      data: { finding, response: audit as any },
    });
    await this.maybeFinalizeProfile(check.profileId);
    return this.prisma.bgvCheck.findUnique({ where: { id: checkId } });
  }

  async retryFailedCheck(orgId: string, checkId: string) {
    const check = await this.prisma.bgvCheck.findFirst({
      where: { id: checkId, profile: { orgId } },
    });
    if (!check) throw new NotFoundException('Check not found');
    if (check.retryCount >= 3) throw new BadRequestException('Max auto-retries reached; manual override required');
    await this.prisma.bgvCheck.update({
      where: { id: checkId },
      data: { status: BgvCheckStatus.QUEUED, failureReason: null },
    });
    await this.dispatchPendingChecks(check.profileId);
    return this.prisma.bgvCheck.findUnique({ where: { id: checkId } });
  }

  async cancelProfile(orgId: string, profileId: string, reason: string) {
    await this.findOneForOrg(orgId, profileId);
    return this.prisma.bgvProfile.update({
      where: { id: profileId },
      data: {
        status: BgvProfileStatus.CANCELLED,
        aiSummary: { cancelledReason: reason, cancelledAt: new Date().toISOString() } as any,
      },
    });
  }

  // ── Cost report ───────────────────────────────────────────────

  async costReport(orgId: string, opts: { from?: Date; to?: Date } = {}) {
    const checks = await this.prisma.bgvCheck.findMany({
      where: {
        profile: { orgId },
        ...(opts.from || opts.to
          ? {
              completedAt: {
                ...(opts.from && { gte: opts.from }),
                ...(opts.to && { lte: opts.to }),
              },
            }
          : {}),
      },
      select: { type: true, costInPaise: true, profileId: true, profile: { select: { candidateId: true } } },
    });

    const byType: Record<string, number> = {};
    const byCandidate: Record<string, number> = {};
    let total = 0;
    for (const c of checks) {
      const cost = c.costInPaise ?? 0;
      total += cost;
      byType[c.type] = (byType[c.type] ?? 0) + cost;
      byCandidate[c.profile.candidateId] = (byCandidate[c.profile.candidateId] ?? 0) + cost;
    }
    return {
      currency: 'INR',
      totalPaise: total,
      totalRupees: total / 100,
      byType: Object.entries(byType).map(([type, paise]) => ({ type, paise })),
      candidatesCount: Object.keys(byCandidate).length,
    };
  }
}

function providerToEnum(name: string): BgvVendor {
  switch (name.toLowerCase()) {
    case 'ongrid':
      return BgvVendor.ONGRID;
    case 'idfy':
      return BgvVendor.IDFY;
    case 'springverify':
      return BgvVendor.SPRINGVERIFY;
    case 'authbridge':
    default:
      return BgvVendor.AUTHBRIDGE;
  }
}
