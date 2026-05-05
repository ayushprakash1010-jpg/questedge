import { ReportSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Whitelisted fields per source. Inputs to filters / groupBy / metrics MUST
 * intersect these sets. Anything outside is silently dropped — never proxied
 * into a query. NEVER allow raw SQL from user input.
 */
const SOURCE_FIELDS: Record<ReportSource, { groupable: string[]; aggregatable: string[] }> = {
  HIRING: {
    groupable: ['status', 'department', 'industry', 'year', 'quarter'],
    aggregatable: ['totalRoles', 'filledRoles', 'budgetMin', 'budgetMax'],
  },
  APPLICATIONS: {
    groupable: ['status', 'currentStageId', 'hiringPlanId', 'source'],
    aggregatable: ['aiMatchScore', 'totalScore'],
  },
  APPRAISAL: {
    groupable: ['cycleId', 'type', 'status', 'ratingLabel'],
    aggregatable: ['finalRating'],
  },
  COMPENSATION: {
    groupable: ['cycleId', 'status', 'scopeKey', 'retentionTier'],
    aggregatable: ['finalHikePct', 'finalHikeINR', 'finalBonusINR', 'newFixed'],
  },
  BGV: {
    groupable: ['status', 'vendor', 'riskScore'],
    aggregatable: [],
  },
  ATTRITION: {
    // Currently sourced from CandidateApplication terminal states
    groupable: ['status', 'hiringPlanId'],
    aggregatable: [],
  },
};

export interface ReportFilter {
  field: string;
  op: 'eq' | 'in' | 'gte' | 'lte';
  value: unknown;
}

export interface ReportMetric {
  field: string;
  agg: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportPlan {
  source: ReportSource;
  filters: ReportFilter[];
  groupBy: string[];
  metrics: ReportMetric[];
}

export interface ReportRow {
  group: Record<string, unknown>;
  metrics: Record<string, number>;
}

export class ReportRunner {
  constructor(private readonly prisma: PrismaService) {}

  async run(orgId: string, plan: ReportPlan): Promise<ReportRow[]> {
    const fields = SOURCE_FIELDS[plan.source];
    const safeGroupBy = plan.groupBy.filter((g) => fields.groupable.includes(g));
    const safeMetrics = plan.metrics.filter((m) =>
      m.agg === 'count' ? true : fields.aggregatable.includes(m.field),
    );
    const safeFilters = plan.filters.filter(
      (f) => fields.groupable.includes(f.field) || fields.aggregatable.includes(f.field),
    );

    const where = this.buildWhere(safeFilters, plan.source, orgId);
    const rows = await this.fetchRows(plan.source, where);

    return aggregate(rows, safeGroupBy, safeMetrics);
  }

  private buildWhere(filters: ReportFilter[], source: ReportSource, orgId: string): Record<string, any> {
    const where: Record<string, any> = {};
    // Org scoping per source
    switch (source) {
      case 'HIRING':
        where.orgId = orgId;
        break;
      case 'APPLICATIONS':
        where.hiringPlan = { orgId };
        break;
      case 'APPRAISAL':
        where.cycle = { orgId };
        break;
      case 'COMPENSATION':
        where.orgId = orgId;
        break;
      case 'BGV':
        where.orgId = orgId;
        break;
      case 'ATTRITION':
        where.hiringPlan = { orgId };
        where.status = { in: ['REJECTED', 'WITHDRAWN'] };
        break;
    }
    for (const f of filters) {
      switch (f.op) {
        case 'eq':
          where[f.field] = f.value;
          break;
        case 'in':
          where[f.field] = { in: Array.isArray(f.value) ? f.value : [f.value] };
          break;
        case 'gte':
          where[f.field] = { gte: f.value };
          break;
        case 'lte':
          where[f.field] = { lte: f.value };
          break;
      }
    }
    return where;
  }

  private async fetchRows(source: ReportSource, where: Record<string, any>): Promise<Record<string, any>[]> {
    switch (source) {
      case 'HIRING':
        return this.prisma.hiringPlan.findMany({ where });
      case 'APPLICATIONS':
        return this.prisma.candidateApplication.findMany({ where });
      case 'APPRAISAL':
        return this.prisma.appraisalAssessment.findMany({ where });
      case 'COMPENSATION':
        return this.prisma.compensationRevision.findMany({ where });
      case 'BGV':
        return this.prisma.bgvProfile.findMany({ where });
      case 'ATTRITION':
        return this.prisma.candidateApplication.findMany({ where });
    }
  }
}

export function aggregate(
  rows: Record<string, any>[],
  groupBy: string[],
  metrics: ReportMetric[],
): ReportRow[] {
  if (groupBy.length === 0 && metrics.length === 0) {
    return [{ group: {}, metrics: { count: rows.length } }];
  }

  const groups = new Map<string, { group: Record<string, unknown>; rows: Record<string, any>[] }>();
  for (const row of rows) {
    const groupVals: Record<string, unknown> = {};
    for (const g of groupBy) groupVals[g] = row[g] ?? null;
    const key = JSON.stringify(groupVals);
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = { group: groupVals, rows: [] };
      groups.set(key, bucket);
    }
    bucket.rows.push(row);
  }

  return Array.from(groups.values()).map((b) => {
    const m: Record<string, number> = { count: b.rows.length };
    for (const metric of metrics) {
      const key = `${metric.agg}_${metric.field}`;
      if (metric.agg === 'count') {
        m[key] = b.rows.length;
        continue;
      }
      const values = b.rows
        .map((r) => Number(r[metric.field]))
        .filter((n) => Number.isFinite(n));
      if (values.length === 0) {
        m[key] = 0;
        continue;
      }
      switch (metric.agg) {
        case 'sum':
          m[key] = round(values.reduce((s, x) => s + x, 0));
          break;
        case 'avg':
          m[key] = round(values.reduce((s, x) => s + x, 0) / values.length);
          break;
        case 'min':
          m[key] = Math.min(...values);
          break;
        case 'max':
          m[key] = Math.max(...values);
          break;
      }
    }
    return { group: b.group, metrics: m };
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function listAvailableFields(source: ReportSource) {
  return SOURCE_FIELDS[source];
}
