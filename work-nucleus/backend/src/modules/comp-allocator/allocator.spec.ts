import { allocate, AllocatorEmployee, BudgetMatrix } from './allocator';

const matrix = { '5': 15, '4': 10, '3': 6, '2': 2, '1': 0 };
const bonusMatrix = { '5': 2, '4': 1, '3': 0.5, '2': 0, '1': 0 };

function emp(id: string, rating: number, fixed: number, scope: Record<string, string> = {}): AllocatorEmployee {
  return { employeeId: id, rating, currentFixed: fixed, currentVariable: 0, scope };
}

describe('compensation allocator', () => {
  it('underspend: small pool with conservative ratings stays in budget', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 10_000_000,
      bonusPoolINR: 1_000_000,
      matrix,
      bonusMatrix,
    };
    const employees = Array.from({ length: 50 }, (_, i) => emp(`e${i}`, 3, 1_000_000));
    const out = allocate(budget, employees);
    expect(out.totalHikeAllocated).toBeLessThanOrEqual(budget.hikePoolINR);
    expect(out.results.every((r) => r.computedHikePct >= 5.5 && r.computedHikePct <= 6.5)).toBe(true);
    expect(out.underspend.hikeINR).toBeGreaterThan(0);
  });

  it('all-employees-rated-5: forced compression keeps totals at budget', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 5_000_000,
      bonusPoolINR: 0,
      matrix,
      bonusMatrix: { '5': 0 },
    };
    const employees = Array.from({ length: 100 }, (_, i) => emp(`e${i}`, 5, 1_000_000));
    const out = allocate(budget, employees);
    expect(out.overruns.length).toBe(1);
    expect(out.totalHikeAllocated).toBeLessThan(budget.hikePoolINR * 1.01);
    expect(out.totalHikeAllocated).toBeGreaterThan(budget.hikePoolINR * 0.99);
    expect(out.results.every((r) => r.computedHikeINR > 0)).toBe(true);
  });

  it('hike cap clamps unbounded matrix entries', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 10_000_000_000,
      bonusPoolINR: 0,
      matrix: { '5': 200, '4': 100, '3': 50, '2': 20, '1': 0 },
      bonusMatrix,
      hikeCapPct: 50,
    };
    const employees = [emp('high', 5, 1_000_000)];
    const out = allocate(budget, employees);
    expect(out.results[0].computedHikePct).toBeLessThanOrEqual(50.01);
  });

  it('per-scope splits trim only the over-budget department', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 4_000_000,
      bonusPoolINR: 0,
      matrix,
      bonusMatrix,
      splits: [
        { scope: { dept: 'eng' }, hikeINR: 500_000, bonusINR: 0 },
        { scope: { dept: 'sales' }, hikeINR: 3_500_000, bonusINR: 0 },
      ],
    };
    const employees = [
      ...Array.from({ length: 10 }, (_, i) => emp(`eng${i}`, 5, 1_000_000, { dept: 'eng' })),
      ...Array.from({ length: 10 }, (_, i) => emp(`sales${i}`, 3, 1_000_000, { dept: 'sales' })),
    ];
    const out = allocate(budget, employees);
    const engTotal = out.results.filter((r) => r.employeeId.startsWith('eng')).reduce((s, r) => s + r.computedHikeINR, 0);
    const salesTotal = out.results.filter((r) => r.employeeId.startsWith('sales')).reduce((s, r) => s + r.computedHikeINR, 0);
    expect(engTotal).toBeLessThan(500_000 * 1.01);
    expect(salesTotal).toBeLessThan(3_500_000 * 1.01);
  });

  it('retention rules add bumps for flagged tiers', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 10_000_000,
      bonusPoolINR: 0,
      matrix,
      bonusMatrix,
      retentionRules: [{ riskTier: 'HIGH', additionalPercent: 4 }],
    };
    const flagged = { ...emp('flag', 3, 1_000_000), retentionRiskTier: 'HIGH' };
    const out = allocate(budget, [flagged, emp('plain', 3, 1_000_000)]);
    const flaggedR = out.results.find((r) => r.employeeId === 'flag')!;
    const plainR = out.results.find((r) => r.employeeId === 'plain')!;
    expect(flaggedR.computedHikePct).toBeGreaterThan(plainR.computedHikePct);
  });

  it('trim weights protect higher performers', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 100_000,
      bonusPoolINR: 0,
      matrix,
      bonusMatrix,
    };
    const top = emp('top', 5, 1_000_000);
    const mid = emp('mid', 3, 1_000_000);
    const out = allocate(budget, [top, mid]);
    const topR = out.results.find((r) => r.employeeId === 'top')!;
    const midR = out.results.find((r) => r.employeeId === 'mid')!;
    expect(topR.computedHikePct).toBeGreaterThan(midR.computedHikePct);
  });

  it('totals never exceed budget pools by more than tolerance', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 2_500_000,
      bonusPoolINR: 500_000,
      matrix,
      bonusMatrix,
    };
    const employees = Array.from({ length: 200 }, (_, i) =>
      emp(`e${i}`, 1 + (i % 5), 800_000 + (i % 5) * 100_000),
    );
    const out = allocate(budget, employees);
    expect(out.totalHikeAllocated).toBeLessThan(budget.hikePoolINR * 1.01);
    expect(out.totalBonusAllocated).toBeLessThan(budget.bonusPoolINR * 1.01);
  });

  it('floor prevents negative or sub-floor new fixed', () => {
    const budget: BudgetMatrix = {
      hikePoolINR: 0,
      bonusPoolINR: 0,
      matrix: { '1': 0 },
      bonusMatrix: { '1': 0 },
      minimumFixedINR: 30_000,
    };
    const out = allocate(budget, [emp('low', 1, 10_000)]);
    expect(out.results[0].newFixed).toBeGreaterThanOrEqual(30_000);
  });
});
