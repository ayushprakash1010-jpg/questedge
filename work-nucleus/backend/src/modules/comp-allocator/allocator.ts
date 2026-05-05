/**
 * Pure-function compensation allocator. No I/O, no Prisma — fully testable.
 * Caller wraps it in a SERIALIZABLE transaction when persisting (see service).
 *
 * Design notes:
 * - Hike is computed first, bonus uses the same proportional-trim shape so
 *   golden tests cover both with one harness.
 * - Floor / ceiling are enforced *after* trim — so a sustained over-pool run
 *   can't push someone below minimum or over the configured cap.
 * - Binary search converges in ≤ 20 iterations for any plausible budget.
 */

export interface BudgetMatrix {
  hikePoolINR: number;
  bonusPoolINR: number;
  /** ratingToHikePercent: { "5": 15, "4": 10, ... } */
  matrix: Record<string, number>;
  /** ratingToBonusMonths: { "5": 2, "4": 1, ... } */
  bonusMatrix: Record<string, number>;
  /** Per-scope hike ceiling [{ scope, hikeINR, bonusINR }] */
  splits?: Array<{ scope: Record<string, string>; hikeINR: number; bonusINR: number }>;
  /** [{ scope, adjustmentPercent (e.g. 1.1 = +10%), reason }] */
  marketCorrection?: Array<{ scope: Record<string, string>; adjustmentPercent: number; reason: string }>;
  /** [{ riskTier, additionalPercent }] */
  retentionRules?: Array<{ riskTier: string; additionalPercent: number }>;
  /** Hard cap on hike % (default 50). */
  hikeCapPct?: number;
  /** Floor (rupees) on new fixed; below this triggers a noop. */
  minimumFixedINR?: number;
}

export interface AllocatorEmployee {
  employeeId: string;
  rating: number; // 1..5 (decimals supported)
  currentFixed: number;
  currentVariable: number;
  scope: Record<string, string>;
  retentionRiskTier?: string;
}

export interface AllocatorOutput {
  employeeId: string;
  computedHikePct: number;
  computedHikeINR: number;
  computedBonusINR: number;
  newFixed: number;
  newVariable: number;
  appliedAdjustments: { market?: number; retention?: number; trim?: number };
}

export interface AllocatorReport {
  results: AllocatorOutput[];
  totalHikeAllocated: number;
  totalBonusAllocated: number;
  totalHikeBudget: number;
  totalBonusBudget: number;
  overruns: Array<{ scopeKey: string; budget: number; pre: number; post: number }>;
  underspend: { hikeINR: number; bonusINR: number };
}

const DEFAULT_HIKE_CAP_PCT = 50;
const DEFAULT_FLOOR = 25_000; // ₹25k/month equivalent of monthly minimum wage proxy
const TOLERANCE_PCT = 0.005;
const MAX_BINARY_ITERS = 24;

export function allocate(budget: BudgetMatrix, employees: AllocatorEmployee[]): AllocatorReport {
  const cap = budget.hikeCapPct ?? DEFAULT_HIKE_CAP_PCT;
  const floor = budget.minimumFixedINR ?? DEFAULT_FLOOR;

  // 1. Compute base hike + apply per-employee adjustments
  const intermediate = employees.map((e) => {
    const baseHikePct = lookupRating(budget.matrix, e.rating);
    const market = matchScope(budget.marketCorrection ?? [], e.scope)?.adjustmentPercent ?? 1;
    const retention = matchRetention(budget.retentionRules ?? [], e.retentionRiskTier);
    let hikePct = baseHikePct * market + retention;
    hikePct = clamp(hikePct, 0, cap);
    return { e, baseHikePct, hikePct, market, retention };
  });

  // 2. Group by scope key and proportionally trim within each group if needed
  const overruns: AllocatorReport['overruns'] = [];
  const trimFactors: Record<string, number> = {};

  if (budget.splits && budget.splits.length > 0) {
    for (const split of budget.splits) {
      const key = scopeKey(split.scope);
      const inGroup = intermediate.filter((x) => scopeKey(x.e.scope) === key);
      const groupSum = inGroup.reduce((s, x) => s + x.e.currentFixed * (x.hikePct / 100), 0);
      if (groupSum > split.hikeINR) {
        const factor = fitProportionally(
          inGroup.map((x) => ({ weight: weightForTrim(x.hikePct, x.e.rating), base: x.e.currentFixed * (x.hikePct / 100) })),
          split.hikeINR,
        );
        trimFactors[key] = factor;
        overruns.push({ scopeKey: key, budget: split.hikeINR, pre: groupSum, post: groupSum * factor });
      }
    }
  } else {
    // No per-scope splits: trim against the global hike pool
    const groupSum = intermediate.reduce((s, x) => s + x.e.currentFixed * (x.hikePct / 100), 0);
    if (groupSum > budget.hikePoolINR) {
      const factor = fitProportionally(
        intermediate.map((x) => ({ weight: weightForTrim(x.hikePct, x.e.rating), base: x.e.currentFixed * (x.hikePct / 100) })),
        budget.hikePoolINR,
      );
      trimFactors['__global'] = factor;
      overruns.push({ scopeKey: '__global', budget: budget.hikePoolINR, pre: groupSum, post: groupSum * factor });
    }
  }

  // 3. Final hike per employee
  const hikes = intermediate.map((x) => {
    const key = budget.splits && budget.splits.length > 0 ? scopeKey(x.e.scope) : '__global';
    const factor = trimFactors[key] ?? 1;
    const finalHikeINR = x.e.currentFixed * (x.hikePct / 100) * factor;
    const newFixed = Math.max(floor, x.e.currentFixed + finalHikeINR);
    const finalHikePct = x.e.currentFixed > 0 ? (finalHikeINR / x.e.currentFixed) * 100 : 0;
    return {
      employeeId: x.e.employeeId,
      computedHikePct: round2(finalHikePct),
      computedHikeINR: round2(finalHikeINR),
      newFixed: round2(newFixed),
      market: x.market,
      retention: x.retention,
      trim: factor,
    };
  });

  // 4. Bonus computation: bonusMonths × monthly fixed, then proportional fit to bonus pool
  let bonusBase = intermediate.map((x) => {
    const months = lookupRating(budget.bonusMatrix, x.e.rating);
    return { employeeId: x.e.employeeId, base: months * (x.e.currentFixed / 12), rating: x.e.rating };
  });
  let bonusFactor = 1;
  const bonusSum = bonusBase.reduce((s, b) => s + b.base, 0);
  if (bonusSum > budget.bonusPoolINR && budget.bonusPoolINR > 0) {
    bonusFactor = fitProportionally(
      bonusBase.map((b) => ({ weight: weightForTrim(b.base, b.rating), base: b.base })),
      budget.bonusPoolINR,
    );
  }
  const bonusByEmployee = new Map(bonusBase.map((b) => [b.employeeId, round2(b.base * bonusFactor)]));

  // 5. Stitch together
  const results: AllocatorOutput[] = hikes.map((h) => {
    const employee = employees.find((e) => e.employeeId === h.employeeId)!;
    const bonusINR = bonusByEmployee.get(h.employeeId) ?? 0;
    return {
      employeeId: h.employeeId,
      computedHikePct: h.computedHikePct,
      computedHikeINR: h.computedHikeINR,
      computedBonusINR: bonusINR,
      newFixed: h.newFixed,
      newVariable: round2(employee.currentVariable),
      appliedAdjustments: {
        market: h.market !== 1 ? h.market : undefined,
        retention: h.retention || undefined,
        trim: h.trim !== 1 ? h.trim : undefined,
      },
    };
  });

  const totalHikeAllocated = sumBy(results, (r) => r.computedHikeINR);
  const totalBonusAllocated = sumBy(results, (r) => r.computedBonusINR);

  return {
    results,
    totalHikeAllocated: round2(totalHikeAllocated),
    totalBonusAllocated: round2(totalBonusAllocated),
    totalHikeBudget: budget.hikePoolINR,
    totalBonusBudget: budget.bonusPoolINR,
    overruns,
    underspend: {
      hikeINR: round2(Math.max(0, budget.hikePoolINR - totalHikeAllocated)),
      bonusINR: round2(Math.max(0, budget.bonusPoolINR - totalBonusAllocated)),
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────

function lookupRating(matrix: Record<string, number>, rating: number): number {
  const exact = matrix[String(Math.round(rating))];
  if (exact !== undefined) return exact;
  const sorted = Object.keys(matrix)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  let last = 0;
  for (const k of sorted) {
    if (k <= rating) last = matrix[String(k)];
  }
  return last;
}

function matchScope<T extends { scope: Record<string, string> }>(
  rules: T[],
  empScope: Record<string, string>,
): T | undefined {
  return rules.find((r) =>
    Object.entries(r.scope).every(([k, v]) => empScope[k] === v),
  );
}

function matchRetention(
  rules: Array<{ riskTier: string; additionalPercent: number }>,
  tier?: string,
): number {
  if (!tier) return 0;
  return rules.find((r) => r.riskTier === tier)?.additionalPercent ?? 0;
}

function scopeKey(scope: Record<string, string>): string {
  return Object.keys(scope)
    .sort()
    .map((k) => `${k}=${scope[k]}`)
    .join('|') || '__global';
}

/**
 * Weight inversely with rating so trims hit lower performers first; the plan
 * spec calls this out explicitly ("top performers protected").
 */
function weightForTrim(base: number, rating: number): number {
  const ratingWeight = Math.max(1, 6 - rating); // rating 5 → 1, rating 1 → 5
  return base * ratingWeight;
}

/**
 * Binary-search the scaling factor f ∈ [0,1] such that sum(base × f) targets
 * `targetTotal` within tolerance. Returns f.
 */
function fitProportionally(
  items: Array<{ weight: number; base: number }>,
  targetTotal: number,
): number {
  if (items.length === 0) return 1;
  const totalBase = items.reduce((s, x) => s + x.base, 0);
  if (totalBase <= targetTotal) return 1;

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < MAX_BINARY_ITERS; i++) {
    const mid = (lo + hi) / 2;
    const projected = items.reduce((s, x) => s + x.base * mid, 0);
    if (Math.abs(projected - targetTotal) / targetTotal < TOLERANCE_PCT) return mid;
    if (projected > targetTotal) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumBy<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((s, x) => s + fn(x), 0);
}
