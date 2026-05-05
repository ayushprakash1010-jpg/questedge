import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BudgetStatus, Prisma, RevisionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { allocate, AllocatorEmployee, AllocatorReport, BudgetMatrix } from './allocator';

export interface SimulateOptions {
  /** Override pool sizes for what-if simulation. */
  overridePools?: { hikePoolINR?: number; bonusPoolINR?: number };
  /** Override the rating matrix. */
  overrideMatrix?: Record<string, number>;
  /** Override individual employee ratings: { employeeId: rating }. */
  overrideRatings?: Record<string, number>;
}

@Injectable()
export class CompAllocatorService {
  private readonly logger = new Logger(CompAllocatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async loadEmployees(orgId: string, cycleId: string): Promise<AllocatorEmployee[]> {
    const assessments = await this.prisma.appraisalAssessment.findMany({
      where: {
        cycle: { orgId },
        cycleId,
        type: 'MANAGER',
        status: { in: ['REVIEWED', 'FINALISED'] },
      },
      include: {
        employee: { select: { id: true } },
      },
    });

    return assessments.map((a) => ({
      employeeId: a.employeeId,
      rating: a.finalRating ? Number(a.finalRating) : 3,
      currentFixed: 0,
      currentVariable: 0,
      scope: {},
    }));
  }

  /**
   * Allocate persistently: writes one CompensationRevision per employee.
   * Re-running before any revision is LOCKED is allowed; LOCKED revisions
   * are preserved untouched (idempotent for the calibrated subset).
   */
  async allocate(orgId: string, cycleId: string, opts: { effectiveDate?: Date } = {}): Promise<AllocatorReport> {
    const budget = await this.prisma.appraisalBudget.findFirst({ where: { orgId, cycleId } });
    if (!budget) throw new NotFoundException('Budget not found for cycle');

    const employees = await this.enrichEmployees(orgId, cycleId);
    if (employees.length === 0) {
      throw new BadRequestException('No finalised manager assessments for this cycle');
    }

    const report = allocate(this.toBudgetMatrix(budget), employees);

    const effectiveDate = opts.effectiveDate ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

    // Persist within a SERIALIZABLE transaction so concurrent allocator runs
    // can't interleave and produce inconsistent revisions.
    await this.prisma.$transaction(
      async (tx) => {
        const locked = await tx.compensationRevision.findMany({
          where: { cycleId, status: RevisionStatus.LOCKED },
          select: { employeeId: true },
        });
        const lockedSet = new Set(locked.map((l) => l.employeeId));

        const empMap = new Map(employees.map((e) => [e.employeeId, e]));

        for (const r of report.results) {
          if (lockedSet.has(r.employeeId)) continue;
          const e = empMap.get(r.employeeId)!;
          await tx.compensationRevision.upsert({
            where: { cycleId_employeeId: { cycleId, employeeId: r.employeeId } },
            update: {
              budgetId: budget.id,
              currentFixed: e.currentFixed,
              currentVariable: e.currentVariable,
              rating: e.rating,
              computedHikePct: r.computedHikePct,
              computedHikeINR: r.computedHikeINR,
              computedBonusINR: r.computedBonusINR,
              finalHikePct: r.computedHikePct,
              finalHikeINR: r.computedHikeINR,
              finalBonusINR: r.computedBonusINR,
              newFixed: r.newFixed,
              newVariable: r.newVariable,
              effectiveDate,
              scopeKey: scopeKey(e.scope),
              retentionTier: e.retentionRiskTier,
              status: RevisionStatus.DRAFT,
            },
            create: {
              orgId,
              cycleId,
              budgetId: budget.id,
              employeeId: r.employeeId,
              currentFixed: e.currentFixed,
              currentVariable: e.currentVariable,
              rating: e.rating,
              computedHikePct: r.computedHikePct,
              computedHikeINR: r.computedHikeINR,
              computedBonusINR: r.computedBonusINR,
              finalHikePct: r.computedHikePct,
              finalHikeINR: r.computedHikeINR,
              finalBonusINR: r.computedBonusINR,
              newFixed: r.newFixed,
              newVariable: r.newVariable,
              effectiveDate,
              scopeKey: scopeKey(e.scope),
              retentionTier: e.retentionRiskTier,
              status: RevisionStatus.DRAFT,
            },
          });
        }

        await tx.appraisalBudget.update({
          where: { id: budget.id },
          data: { status: BudgetStatus.DISTRIBUTED },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      `Allocated cycle=${cycleId}: hike ${report.totalHikeAllocated}/${report.totalHikeBudget}, bonus ${report.totalBonusAllocated}/${report.totalBonusBudget}`,
    );
    return report;
  }

  /**
   * What-if: pure simulation, never persists. Used by the simulator UI for
   * sub-200ms recompute (the spec target). No DB writes.
   */
  async simulate(orgId: string, cycleId: string, opts: SimulateOptions = {}): Promise<AllocatorReport> {
    const budget = await this.prisma.appraisalBudget.findFirst({ where: { orgId, cycleId } });
    if (!budget) throw new NotFoundException('Budget not found for cycle');

    const employees = await this.enrichEmployees(orgId, cycleId);
    const baseMatrix = this.toBudgetMatrix(budget);
    const overridden: BudgetMatrix = {
      ...baseMatrix,
      hikePoolINR: opts.overridePools?.hikePoolINR ?? baseMatrix.hikePoolINR,
      bonusPoolINR: opts.overridePools?.bonusPoolINR ?? baseMatrix.bonusPoolINR,
      matrix: opts.overrideMatrix ?? baseMatrix.matrix,
    };
    const adjustedEmployees = opts.overrideRatings
      ? employees.map((e) => ({ ...e, rating: opts.overrideRatings![e.employeeId] ?? e.rating }))
      : employees;
    return allocate(overridden, adjustedEmployees);
  }

  /**
   * Equity-lens pay-gap diagnostic. Coarse — refine in Phase 5B BI module.
   */
  async equityDiff(orgId: string, cycleId: string) {
    const employees = await this.enrichEmployees(orgId, cycleId);
    const revisions = await this.prisma.compensationRevision.findMany({
      where: { orgId, cycleId },
      select: { employeeId: true, currentFixed: true, newFixed: true },
    });
    const empById = new Map(employees.map((e) => [e.employeeId, e]));
    const buckets: Record<string, { before: number[]; after: number[] }> = {};
    for (const r of revisions) {
      const e = empById.get(r.employeeId);
      const key = e?.scope?.location ?? 'unknown';
      buckets[key] = buckets[key] ?? { before: [], after: [] };
      buckets[key].before.push(Number(r.currentFixed));
      buckets[key].after.push(Number(r.newFixed));
    }
    return Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [
        k,
        {
          n: v.before.length,
          medianBefore: median(v.before),
          medianAfter: median(v.after),
          spreadBefore: stddev(v.before),
          spreadAfter: stddev(v.after),
        },
      ]),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async enrichEmployees(orgId: string, cycleId: string): Promise<AllocatorEmployee[]> {
    const assessments = await this.prisma.appraisalAssessment.findMany({
      where: { cycle: { orgId }, cycleId, type: 'MANAGER', status: { in: ['REVIEWED', 'FINALISED'] } },
      include: {
        employee: { select: { id: true } },
      },
    });
    if (assessments.length === 0) return [];

    const existing = await this.prisma.compensationRevision.findMany({
      where: { orgId, cycleId },
      select: { employeeId: true, currentFixed: true, currentVariable: true, scopeKey: true, retentionTier: true },
    });
    const map = new Map(existing.map((r) => [r.employeeId, r]));

    return assessments.map((a) => {
      const prior = map.get(a.employeeId);
      const scope = prior?.scopeKey ? parseScopeKey(prior.scopeKey) : {};
      return {
        employeeId: a.employeeId,
        rating: a.finalRating ? Number(a.finalRating) : 3,
        currentFixed: prior ? Number(prior.currentFixed) : 1_000_000,
        currentVariable: prior ? Number(prior.currentVariable) : 0,
        scope,
        retentionRiskTier: prior?.retentionTier ?? undefined,
      };
    });
  }

  private toBudgetMatrix(budget: {
    hikePoolINR: Prisma.Decimal;
    bonusPoolINR: Prisma.Decimal;
    matrix: Prisma.JsonValue;
    bonusMatrix: Prisma.JsonValue;
    splits: Prisma.JsonValue;
    marketCorrection: Prisma.JsonValue;
    retentionRules: Prisma.JsonValue;
    hikeCapPct: Prisma.Decimal;
  }): BudgetMatrix {
    return {
      hikePoolINR: Number(budget.hikePoolINR),
      bonusPoolINR: Number(budget.bonusPoolINR),
      matrix: budget.matrix as unknown as Record<string, number>,
      bonusMatrix: budget.bonusMatrix as unknown as Record<string, number>,
      splits: budget.splits as unknown as BudgetMatrix['splits'],
      marketCorrection: budget.marketCorrection as unknown as BudgetMatrix['marketCorrection'],
      retentionRules: budget.retentionRules as unknown as BudgetMatrix['retentionRules'],
      hikeCapPct: Number(budget.hikeCapPct),
    };
  }
}

function scopeKey(scope: Record<string, string>): string {
  return Object.keys(scope)
    .sort()
    .map((k) => `${k}=${scope[k]}`)
    .join('|') || '__global';
}

function parseScopeKey(key: string): Record<string, string> {
  if (key === '__global') return {};
  return Object.fromEntries(key.split('|').map((p) => p.split('='))) as Record<string, string>;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}
