import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CompLetterStatus, Prisma, RevisionStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { OfferRenderService } from '../offers/services/offer-render.service';
import { buildOfferHtml } from '../offers/services/template-renderer';
import { OverrideRevisionDto } from './dto/revision.dto';

const APPROVAL_CHAIN: RevisionStatus[] = [
  RevisionStatus.MANAGER_REVIEW,
  RevisionStatus.DIRECTOR_APPROVAL,
  RevisionStatus.CHRO_APPROVAL,
  RevisionStatus.CEO_APPROVAL,
];

interface ApprovalChainEntry {
  level: RevisionStatus;
  action: 'APPROVE' | 'REJECT';
  actorUserId: string;
  comment?: string;
  at: string;
}

@Injectable()
export class CompRevisionsService {
  private readonly logger = new Logger(CompRevisionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly offerRender: OfferRenderService,
    @Optional() private readonly email?: EmailService,
  ) {}

  private async getManagedEmployeeIds(
    orgId: string,
    cycleId: string | undefined,
    managerUserId: string,
  ): Promise<string[]> {
    const [goals, assessments] = await Promise.all([
      this.prisma.goal.findMany({
        where: {
          managerId: managerUserId,
          cycle: { orgId, ...(cycleId ? { id: cycleId } : {}) },
        },
        select: { employeeId: true },
        distinct: ['employeeId'],
      }),
      this.prisma.appraisalAssessment.findMany({
        where: {
          managerId: managerUserId,
          cycle: { orgId, ...(cycleId ? { id: cycleId } : {}) },
        },
        select: { employeeId: true },
        distinct: ['employeeId'],
      }),
    ]);
    return Array.from(
      new Set([
        ...goals.map((g) => g.employeeId),
        ...assessments.map((a) => a.employeeId),
      ]),
    );
  }

  private async assertCanAccessEmployee(
    orgId: string,
    cycleId: string,
    employeeId: string,
    actorUserId?: string,
    actorRole?: Role,
  ) {
    if (!actorRole || actorRole === Role.ADMIN || actorRole === Role.HR) {
      return;
    }
    if (!actorUserId || employeeId === actorUserId) {
      throw new ForbiddenException('You cannot modify or approve your own compensation');
    }
    const managed = await this.getManagedEmployeeIds(orgId, cycleId, actorUserId);
    if (!managed.includes(employeeId)) {
      throw new ForbiddenException(
        'Managers may only view or modify compensation for their direct reports',
      );
    }
  }

  async list(
    orgId: string,
    opts: {
      cycleId?: string;
      managerUserId?: string;
      status?: RevisionStatus;
    } = {},
  ) {
    let managedFilter: { employeeId: { in: string[] } } | undefined;
    if (opts.managerUserId) {
      const managedIds = await this.getManagedEmployeeIds(
        orgId,
        opts.cycleId,
        opts.managerUserId,
      );
      if (managedIds.length === 0) return [];
      managedFilter = { employeeId: { in: managedIds } };
    }
    return this.prisma.compensationRevision.findMany({
      where: {
        orgId,
        ...(opts.cycleId && { cycleId: opts.cycleId }),
        ...(opts.status && { status: opts.status }),
        ...managedFilter,
      },
      include: { employee: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const r = await this.prisma.compensationRevision.findFirst({
      where: { id, orgId },
      include: { employee: { select: { id: true, name: true, email: true } } },
    });
    if (!r) throw new NotFoundException('Revision not found');
    return r;
  }

  async findOneForActor(
    orgId: string,
    id: string,
    userId: string,
    userRole: Role,
  ) {
    const r = await this.findOne(orgId, id);
    await this.assertCanAccessEmployee(orgId, r.cycleId, r.employeeId, userId, userRole);
    return r;
  }

  /**
   * Manager override: edit final hike/bonus values with required reason.
   * Conservative — locks revisions can't be overridden.
   */
  async override(
    orgId: string,
    id: string,
    userId: string,
    dto: OverrideRevisionDto,
    userRole?: Role,
  ) {
    const r = await this.findOne(orgId, id);
    await this.assertCanAccessEmployee(orgId, r.cycleId, r.employeeId, userId, userRole);
    if (
      r.status === RevisionStatus.LOCKED ||
      r.status === RevisionStatus.COMMUNICATED
    ) {
      throw new BadRequestException(`Revision is ${r.status}; cannot override`);
    }
    if (!dto.overrideReason || dto.overrideReason.length < 5) {
      throw new BadRequestException('overrideReason is required (min 5 chars)');
    }

    // Translate hikePct ↔ hikeINR; whichever is supplied wins, the other is derived.
    const currentFixed = Number(r.currentFixed);
    let finalHikePct = Number(r.finalHikePct);
    let finalHikeINR = Number(r.finalHikeINR);
    if (dto.finalHikePct !== undefined) {
      finalHikePct = dto.finalHikePct;
      finalHikeINR = round2(currentFixed * (finalHikePct / 100));
    } else if (dto.finalHikeINR !== undefined) {
      finalHikeINR = dto.finalHikeINR;
      finalHikePct =
        currentFixed > 0 ? round2((finalHikeINR / currentFixed) * 100) : 0;
    }
    const finalBonusINR = dto.finalBonusINR ?? Number(r.finalBonusINR);
    const newFixed = round2(currentFixed + finalHikeINR);

    return this.prisma.compensationRevision.update({
      where: { id },
      data: {
        finalHikePct,
        finalHikeINR,
        finalBonusINR,
        newFixed,
        overrideReason: dto.overrideReason,
      },
    });
  }

  // ── Approval chain ────────────────────────────────────────────

  async submitToApproval(orgId: string, id: string, userId?: string, userRole?: Role) {
    const r = await this.findOne(orgId, id);
    await this.assertCanAccessEmployee(orgId, r.cycleId, r.employeeId, userId, userRole);
    if (r.status !== RevisionStatus.DRAFT)
      throw new BadRequestException('Only DRAFT revisions can be submitted');
    return this.prisma.compensationRevision.update({
      where: { id },
      data: { status: RevisionStatus.MANAGER_REVIEW },
    });
  }

  async act(
    orgId: string,
    id: string,
    userId: string,
    userRole: Role,
    action: 'APPROVE' | 'REJECT',
    comment?: string,
  ) {
    const r = await this.findOne(orgId, id);
    await this.assertCanAccessEmployee(orgId, r.cycleId, r.employeeId, userId, userRole);
    if (!APPROVAL_CHAIN.includes(r.status)) {
      throw new BadRequestException(
        `Revision is ${r.status}; not in an approval state`,
      );
    }
    if (
      r.status !== RevisionStatus.MANAGER_REVIEW &&
      userRole !== Role.ADMIN &&
      userRole !== Role.HR
    ) {
      throw new ForbiddenException(
        'Only ADMIN or HR can act on approval steps beyond MANAGER_REVIEW',
      );
    }
    const chain = (r.approvalChain as unknown as ApprovalChainEntry[]) ?? [];
    chain.push({
      level: r.status,
      action,
      actorUserId: userId,
      comment,
      at: new Date().toISOString(),
    });

    let nextStatus: RevisionStatus = r.status;
    if (action === 'REJECT') {
      nextStatus = RevisionStatus.DRAFT;
    } else {
      const idx = APPROVAL_CHAIN.indexOf(r.status);
      nextStatus =
        idx === APPROVAL_CHAIN.length - 1
          ? RevisionStatus.APPROVED
          : APPROVAL_CHAIN[idx + 1];
    }

    return this.prisma.compensationRevision.update({
      where: { id },
      data: {
        status: nextStatus,
        approvalChain: chain as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async lock(orgId: string, id: string) {
    const r = await this.findOne(orgId, id);
    if (r.status !== RevisionStatus.APPROVED)
      throw new BadRequestException('Only APPROVED revisions can be locked');
    return this.prisma.compensationRevision.update({
      where: { id },
      data: { status: RevisionStatus.LOCKED },
    });
  }

  // ── Letter + acknowledgement ──────────────────────────────────

  async generateLetter(orgId: string, id: string) {
    const r = await this.findOne(orgId, id);
    if (
      r.status !== RevisionStatus.LOCKED &&
      r.status !== RevisionStatus.COMMUNICATED
    ) {
      throw new BadRequestException('Only LOCKED revisions get letters');
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const empName = escapeCompHtml(r.employee?.name ?? 'Team Member');
    const orgName = org?.name ?? 'Your Organization';
    const effDate = r.effectiveDate.toISOString().slice(0, 10);
    const bodyHtml = `
      <p>Dear ${empName},</p>
      <p>We are pleased to share your updated compensation revision summary, effective <strong>${escapeCompHtml(effDate)}</strong>.</p>
      <ul>
        <li><strong>Previous Fixed Annual:</strong> INR ${Number(r.currentFixed).toLocaleString('en-IN')}</li>
        <li><strong>Revised Fixed Annual:</strong> INR ${Number(r.newFixed).toLocaleString('en-IN')} (${Number(r.finalHikePct)}% increment)</li>
        <li><strong>Revised Variable Annual:</strong> INR ${Number(r.newVariable).toLocaleString('en-IN')}</li>
        ${Number(r.finalBonusINR) > 0 ? `<li><strong>One-time Performance Bonus:</strong> INR ${Number(r.finalBonusINR).toLocaleString('en-IN')}</li>` : ''}
      </ul>
      ${r.managerComment ? `<p><strong>Manager Note:</strong> ${escapeCompHtml(r.managerComment)}</p>` : ''}
      <p>Please sign in to QuestEdge to review and acknowledge your compensation letter.</p>
    `;
    const html = buildOfferHtml({
      bodyHtml,
      candidateName: r.employee?.name ?? 'Team Member',
      orgName,
    });
    const s3Key = `comp/${orgId}/${id}/letter.html`;
    await this.offerRender.uploadHtml(s3Key, html);

    return this.prisma.compensationRevision.update({
      where: { id },
      data: {
        letterStatus: CompLetterStatus.RENDERED,
        letterUrl: s3Key,
      },
    });
  }

  async getLetterUrl(
    orgId: string,
    id: string,
    userId: string,
    userRole: Role,
  ) {
    const r = await this.findOne(orgId, id);
    if (r.employeeId !== userId) {
      await this.assertCanAccessEmployee(orgId, r.cycleId, r.employeeId, userId, userRole);
    }
    if (!r.letterUrl) {
      throw new NotFoundException('Compensation letter has not been generated yet');
    }
    return { url: await this.offerRender.signedUrl(r.letterUrl) };
  }

  async markOneOnOne(orgId: string, id: string, userId: string, userRole?: Role) {
    const r = await this.findOne(orgId, id);
    await this.assertCanAccessEmployee(orgId, r.cycleId, r.employeeId, userId, userRole);
    return this.prisma.compensationRevision.update({
      where: { id },
      data: { oneOnOneAt: new Date() },
    });
  }

  async deliver(orgId: string, id: string) {
    const r = await this.findOne(orgId, id);
    if (!r.oneOnOneAt) {
      throw new BadRequestException(
        'Manager 1-on-1 must be logged before letter is delivered (manager-first gate)',
      );
    }
    if (r.letterStatus !== CompLetterStatus.RENDERED) {
      throw new BadRequestException('Letter not yet rendered');
    }
    const updated = await this.prisma.compensationRevision.update({
      where: { id },
      data: {
        letterStatus: CompLetterStatus.DELIVERED,
        letterIssuedAt: new Date(),
        status: RevisionStatus.COMMUNICATED,
      },
    });
    if (this.email && r.employee?.email) {
      await this.email.sendNotificationEmail(
        r.employee.email,
        'Your Compensation Revision Letter is Available',
        `Your compensation revision summary effective ${r.effectiveDate.toISOString().slice(0, 10)} has been issued after your 1-on-1 review.`,
        '/appraisal',
      );
    }
    return updated;
  }

  async acknowledge(orgId: string, id: string, userId: string) {
    const r = await this.findOne(orgId, id);
    if (r.employeeId !== userId)
      throw new BadRequestException('Only the employee can acknowledge');
    return this.prisma.compensationRevision.update({
      where: { id },
      data: {
        letterStatus: CompLetterStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });
  }

  // ── Variance + payroll exports ────────────────────────────────

  async varianceReport(orgId: string, cycleId: string) {
    const [budget, revisions] = await Promise.all([
      this.prisma.appraisalBudget.findFirst({ where: { orgId, cycleId } }),
      this.prisma.compensationRevision.findMany({ where: { orgId, cycleId } }),
    ]);
    if (!budget) throw new NotFoundException('Budget not found');

    const totals = revisions.reduce(
      (acc, r) => {
        acc.computedHike += Number(r.computedHikeINR);
        acc.finalHike += Number(r.finalHikeINR);
        acc.computedBonus += Number(r.computedBonusINR);
        acc.finalBonus += Number(r.finalBonusINR);
        const matrixHike = Number(r.computedHikePct);
        const finalPct = Number(r.finalHikePct);
        if (Math.abs(finalPct - matrixHike) <= 0.5) acc.conformantCount++;
        return acc;
      },
      {
        computedHike: 0,
        finalHike: 0,
        computedBonus: 0,
        finalBonus: 0,
        conformantCount: 0,
      },
    );

    const distributionByRating: Record<string, number> = {};
    for (const r of revisions) {
      const rating = r.rating ? Math.round(Number(r.rating)) : 0;
      const k = String(rating);
      distributionByRating[k] = (distributionByRating[k] ?? 0) + 1;
    }

    const totalCurrentFixed = revisions.reduce(
      (s, r) => s + Number(r.currentFixed),
      0,
    );
    const totalNewFixed = revisions.reduce((s, r) => s + Number(r.newFixed), 0);

    return {
      budget: {
        hikePoolINR: Number(budget.hikePoolINR),
        bonusPoolINR: Number(budget.bonusPoolINR),
      },
      totals,
      conformancePct:
        revisions.length === 0
          ? 0
          : (totals.conformantCount / revisions.length) * 100,
      distributionByRating,
      annualisedWageBillIncrease: round2(totalNewFixed - totalCurrentFixed),
    };
  }

  async payrollExport(
    orgId: string,
    cycleId: string,
    format: 'keka' | 'darwinbox' | 'zinghr' | 'csv',
  ) {
    const revisions = await this.prisma.compensationRevision.findMany({
      where: {
        orgId,
        cycleId,
        status: { in: [RevisionStatus.LOCKED, RevisionStatus.COMMUNICATED] },
      },
      include: { employee: { select: { id: true, email: true, name: true } } },
    });
    const rows = revisions.map((r) => ({
      employeeId: r.employeeId,
      employeeEmail: r.employee.email,
      employeeName: r.employee.name,
      oldFixed: Number(r.currentFixed),
      newFixed: Number(r.newFixed),
      oldVariable: Number(r.currentVariable),
      newVariable: Number(r.newVariable),
      oneTimeBonus: Number(r.finalBonusINR),
      effectiveDate: r.effectiveDate.toISOString().slice(0, 10),
    }));
    return {
      format,
      cycleId,
      exportedAt: new Date().toISOString(),
      rowCount: rows.length,
      hash: simpleHash(JSON.stringify(rows)),
      rows: format === 'csv' ? csvify(rows) : transformForVendor(rows, format),
    };
  }
}

function csvify(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(',')),
  ].join('\n');
}

function transformForVendor(
  rows: any[],
  format: 'keka' | 'darwinbox' | 'zinghr',
): Record<string, unknown>[] {
  switch (format) {
    case 'keka':
      return rows.map((r) => ({
        EmployeeID: r.employeeId,
        Email: r.employeeEmail,
        BasicNew: r.newFixed,
        VariableNew: r.newVariable,
        BonusOneTime: r.oneTimeBonus,
        EffectiveDate: r.effectiveDate,
      }));
    case 'darwinbox':
      return rows.map((r) => ({
        emp_id: r.employeeId,
        emp_email: r.employeeEmail,
        new_fixed: r.newFixed,
        new_variable: r.newVariable,
        bonus: r.oneTimeBonus,
        effective_date: r.effectiveDate,
      }));
    case 'zinghr':
      return rows.map((r) => ({
        EmployeeCode: r.employeeId,
        NewFixedCTC: r.newFixed,
        NewVariablePay: r.newVariable,
        SignOnBonus: r.oneTimeBonus,
        EffectiveDate: r.effectiveDate,
      }));
  }
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function escapeCompHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
