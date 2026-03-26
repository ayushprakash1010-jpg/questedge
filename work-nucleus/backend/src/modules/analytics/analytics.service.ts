import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplicationStatus, HiringPlanStatus } from '@prisma/client';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AnalyticsService {
  private memCache = new Map<string, { data: any; expiry: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const entry = this.memCache.get(key);
    if (entry && entry.expiry > Date.now()) return entry.data as T;
    const result = await fn();
    this.memCache.set(key, { data: result, expiry: Date.now() + TTL_MS });
    return result;
  }

  async getOverview(orgId: string) {
    return this.cached(`overview:${orgId}`, async () => {
      const [
        activePlans,
        totalRolesAgg,
        pipelineCandidates,
        selectedCount,
        rejectedCount,
      ] = await Promise.all([
        this.prisma.hiringPlan.count({
          where: { orgId, status: HiringPlanStatus.ACTIVE },
        }),
        this.prisma.hiringPlan.aggregate({
          where: { orgId, status: { in: [HiringPlanStatus.ACTIVE, HiringPlanStatus.COMPLETED] } },
          _sum: { totalRoles: true, filledRoles: true },
        }),
        this.prisma.candidateApplication.count({
          where: { hiringPlan: { orgId }, status: ApplicationStatus.ACTIVE },
        }),
        this.prisma.candidateApplication.count({
          where: { hiringPlan: { orgId }, status: ApplicationStatus.SELECTED },
        }),
        this.prisma.candidateApplication.count({
          where: { hiringPlan: { orgId }, status: ApplicationStatus.REJECTED },
        }),
      ]);

      const totalRoles = totalRolesAgg._sum.totalRoles || 0;
      const filledRoles = totalRolesAgg._sum.filledRoles || 0;
      const openRoles = totalRoles - filledRoles;
      const fillRate = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;

      // Avg time-to-hire for completed applications
      const completedApps = await this.prisma.candidateApplication.findMany({
        where: {
          hiringPlan: { orgId },
          status: { in: [ApplicationStatus.SELECTED, ApplicationStatus.REJECTED] },
          completedAt: { not: null },
        },
        select: { appliedAt: true, completedAt: true },
      });

      let avgTimeToHire = 0;
      if (completedApps.length > 0) {
        const totalDays = completedApps.reduce((sum, a) => {
          const days = Math.ceil(
            (new Date(a.completedAt!).getTime() - new Date(a.appliedAt).getTime()) / (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }, 0);
        avgTimeToHire = Math.round(totalDays / completedApps.length);
      }

      // 6-month trend (plans created per month)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentPlans = await this.prisma.hiringPlan.findMany({
        where: { orgId, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      });

      const trend: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const count = recentPlans.filter((p) => {
          const pd = new Date(p.createdAt);
          return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
        }).length;
        trend.push({ month: monthKey, count });
      }

      return {
        activePlans,
        totalRoles,
        openRoles,
        filledRoles,
        fillRate,
        pipelineCandidates,
        selectedCount,
        rejectedCount,
        avgTimeToHire,
        trend,
      };
    });
  }

  async getPipelineFunnel(orgId: string, hiringPlanId?: string) {
    const cacheKey = hiringPlanId ? `funnel:${orgId}:${hiringPlanId}` : `funnel:${orgId}`;
    return this.cached(cacheKey, async () => {
      const planFilter = hiringPlanId ? { hiringPlanId } : { hiringPlan: { orgId } };

      const stages = await this.prisma.pipelineStage.findMany({
        where: hiringPlanId ? { hiringPlanId } : { hiringPlan: { orgId } },
        orderBy: { stageOrder: 'asc' },
        select: { id: true, name: true, stageType: true, stageOrder: true },
      });

      const stageData = await Promise.all(
        stages.map(async (stage) => {
          const [entered, passed, rejected] = await Promise.all([
            this.prisma.candidateStageHistory.count({
              where: { stageId: stage.id, application: planFilter },
            }),
            this.prisma.candidateStageHistory.count({
              where: { stageId: stage.id, outcome: 'PASSED', application: planFilter },
            }),
            this.prisma.candidateStageHistory.count({
              where: { stageId: stage.id, outcome: 'REJECTED', application: planFilter },
            }),
          ]);

          // Avg days in stage
          const histories = await this.prisma.candidateStageHistory.findMany({
            where: { stageId: stage.id, exitedAt: { not: null }, application: planFilter },
            select: { enteredAt: true, exitedAt: true },
          });

          let avgDays = 0;
          if (histories.length > 0) {
            const totalDays = histories.reduce((sum, h) => {
              return sum + Math.ceil(
                (new Date(h.exitedAt!).getTime() - new Date(h.enteredAt).getTime()) / (1000 * 60 * 60 * 24),
              );
            }, 0);
            avgDays = Math.round(totalDays / histories.length);
          }

          const passThroughRate = entered > 0 ? Math.round((passed / entered) * 100) : 0;

          return {
            id: stage.id,
            name: stage.name,
            stageType: stage.stageType,
            stageOrder: stage.stageOrder,
            entered,
            passed,
            rejected,
            passThroughRate,
            avgDays,
          };
        }),
      );

      return stageData;
    });
  }

  async getTimeToHire(orgId: string, groupBy: 'role' | 'department' | 'quarter' = 'department') {
    return this.cached(`tth:${orgId}:${groupBy}`, async () => {
      const apps = await this.prisma.candidateApplication.findMany({
        where: {
          hiringPlan: { orgId },
          status: ApplicationStatus.SELECTED,
          completedAt: { not: null },
        },
        include: {
          hiringPlan: { select: { designation: true, department: true, quarter: true, year: true } },
        },
      });

      const groups: Record<string, number[]> = {};
      for (const a of apps) {
        const days = Math.ceil(
          (new Date(a.completedAt!).getTime() - new Date(a.appliedAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        let key: string;
        if (groupBy === 'role') key = a.hiringPlan.designation;
        else if (groupBy === 'quarter') key = `Q${a.hiringPlan.quarter} ${a.hiringPlan.year}`;
        else key = a.hiringPlan.department;

        if (!groups[key]) groups[key] = [];
        groups[key].push(days);
      }

      const result = Object.entries(groups).map(([key, days]) => {
        const sorted = [...days].sort((a, b) => a - b);
        return {
          group: key,
          count: days.length,
          avg: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
          median: sorted[Math.floor(sorted.length / 2)],
          min: sorted[0],
          max: sorted[sorted.length - 1],
        };
      });

      // 12-month trend
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const trend: { month: string; avgDays: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthApps = apps.filter((a) => {
          const cd = new Date(a.completedAt!);
          return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
        });
        const avg = monthApps.length > 0
          ? Math.round(
              monthApps.reduce((s, a) =>
                s + Math.ceil((new Date(a.completedAt!).getTime() - new Date(a.appliedAt).getTime()) / (1000 * 60 * 60 * 24)),
              0) / monthApps.length,
            )
          : 0;
        trend.push({
          month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          avgDays: avg,
        });
      }

      return { byGroup: result, trend };
    });
  }

  async getCostTracking(orgId: string) {
    return this.cached(`cost:${orgId}`, async () => {
      const plans = await this.prisma.hiringPlan.findMany({
        where: { orgId, status: { in: [HiringPlanStatus.ACTIVE, HiringPlanStatus.COMPLETED] } },
        select: {
          id: true,
          title: true,
          budgetMin: true,
          budgetMax: true,
          currency: true,
          totalRoles: true,
          filledRoles: true,
        },
      });

      const result = await Promise.all(
        plans.map(async (plan) => {
          const offers = await this.prisma.selectionDecision.findMany({
            where: { application: { hiringPlanId: plan.id }, decision: 'SELECTED', offerCtc: { not: null } },
            select: { offerCtc: true },
          });

          const totalSpent = offers.reduce((s, o) => s + Number(o.offerCtc), 0);
          const avgOfferCtc = offers.length > 0 ? Math.round(totalSpent / offers.length) : 0;

          return {
            planId: plan.id,
            title: plan.title,
            budgetMin: Number(plan.budgetMin),
            budgetMax: Number(plan.budgetMax),
            currency: plan.currency,
            totalRoles: plan.totalRoles,
            filledRoles: plan.filledRoles,
            offersCount: offers.length,
            avgOfferCtc,
            totalSpent,
            remainingBudget: Number(plan.budgetMax) * plan.totalRoles - totalSpent,
          };
        }),
      );

      return result;
    });
  }

  async getInterviewerStats(orgId: string) {
    return this.cached(`interviewers:${orgId}`, async () => {
      const feedbacks = await this.prisma.interviewFeedback.findMany({
        where: { application: { hiringPlan: { orgId } }, isSubmitted: true },
        include: {
          interviewer: { select: { id: true, name: true } },
        },
      });

      const interviewerMap: Record<string, {
        id: string;
        name: string;
        totalInterviews: number;
        ratingSum: number;
        recommendations: Record<string, number>;
        feedbackTimes: number[];
      }> = {};

      for (const fb of feedbacks) {
        const iId = fb.interviewer.id;
        if (!interviewerMap[iId]) {
          interviewerMap[iId] = {
            id: iId,
            name: fb.interviewer.name,
            totalInterviews: 0,
            ratingSum: 0,
            recommendations: {},
            feedbackTimes: [],
          };
        }
        const m = interviewerMap[iId];
        m.totalInterviews++;
        m.ratingSum += fb.overallRating;
        m.recommendations[fb.recommendation] = (m.recommendations[fb.recommendation] || 0) + 1;

        // Feedback time (created to submitted)
        if (fb.submittedAt) {
          const hours = Math.ceil(
            (new Date(fb.submittedAt).getTime() - new Date(fb.createdAt).getTime()) / (1000 * 60 * 60),
          );
          m.feedbackTimes.push(hours);
        }
      }

      return Object.values(interviewerMap)
        .map((m) => ({
          id: m.id,
          name: m.name,
          totalInterviews: m.totalInterviews,
          avgRating: Math.round((m.ratingSum / m.totalInterviews) * 10) / 10,
          avgFeedbackTimeHours: m.feedbackTimes.length > 0
            ? Math.round(m.feedbackTimes.reduce((s, t) => s + t, 0) / m.feedbackTimes.length)
            : 0,
          recommendations: m.recommendations,
        }))
        .sort((a, b) => b.totalInterviews - a.totalInterviews);
    });
  }

  async getHiringProgress(orgId: string) {
    return this.cached(`progress:${orgId}`, async () => {
      const plans = await this.prisma.hiringPlan.findMany({
        where: { orgId, status: { in: [HiringPlanStatus.ACTIVE, HiringPlanStatus.COMPLETED] } },
        select: {
          id: true,
          title: true,
          quarter: true,
          year: true,
          totalRoles: true,
          filledRoles: true,
          status: true,
          _count: {
            select: {
              applications: { where: { status: ApplicationStatus.ACTIVE } },
            },
          },
        },
        orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
      });

      return plans.map((p) => ({
        id: p.id,
        title: p.title,
        quarter: p.quarter,
        year: p.year,
        totalRoles: p.totalRoles,
        filledRoles: p.filledRoles,
        inPipeline: p._count.applications,
        progress: p.totalRoles > 0 ? Math.round((p.filledRoles / p.totalRoles) * 100) : 0,
        status: p.status,
      }));
    });
  }

  async getSourceEffectiveness(orgId: string) {
    return this.cached(`sources:${orgId}`, async () => {
      const apps = await this.prisma.candidateApplication.findMany({
        where: { hiringPlan: { orgId } },
        select: {
          id: true,
          status: true,
          totalScore: true,
          appliedAt: true,
          completedAt: true,
          candidate: { select: { source: true } },
        },
      });

      const sourceMap: Record<string, {
        candidates: number;
        selected: number;
        scores: number[];
        times: number[];
      }> = {};

      for (const a of apps) {
        const src = a.candidate.source;
        if (!sourceMap[src]) {
          sourceMap[src] = { candidates: 0, selected: 0, scores: [], times: [] };
        }
        sourceMap[src].candidates++;
        if (a.status === ApplicationStatus.SELECTED) sourceMap[src].selected++;
        if (a.totalScore) sourceMap[src].scores.push(Number(a.totalScore));
        if (a.completedAt) {
          const days = Math.ceil(
            (new Date(a.completedAt).getTime() - new Date(a.appliedAt).getTime()) / (1000 * 60 * 60 * 24),
          );
          sourceMap[src].times.push(days);
        }
      }

      return Object.entries(sourceMap)
        .map(([source, data]) => ({
          source,
          candidates: data.candidates,
          selected: data.selected,
          selectionRate: data.candidates > 0 ? Math.round((data.selected / data.candidates) * 100) : 0,
          avgScore: data.scores.length > 0
            ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
            : 0,
          avgTimeToHire: data.times.length > 0
            ? Math.round(data.times.reduce((s, v) => s + v, 0) / data.times.length)
            : 0,
        }))
        .sort((a, b) => b.candidates - a.candidates);
    });
  }

  async getInsights(orgId: string) {
    // Gather all analytics
    const [overview, funnel, timeToHire, cost, interviewerStats, sources] = await Promise.all([
      this.getOverview(orgId),
      this.getPipelineFunnel(orgId),
      this.getTimeToHire(orgId),
      this.getCostTracking(orgId),
      this.getInterviewerStats(orgId),
      this.getSourceEffectiveness(orgId),
    ]);

    const aiServiceUrl = this.config.get('AI_SERVICE_URL', 'http://localhost:8000');
    const apiKey = this.config.get('INTERNAL_API_KEY', 'dev-internal-key');

    // Get org name
    const org = await this.prisma.organization.findFirst({ where: { id: orgId } });

    const payload = {
      companyName: org?.name || 'Company',
      overview,
      funnel,
      timeToHire,
      cost,
      interviewerStats,
      sourceEffectiveness: sources,
    };

    const res = await fetch(`${aiServiceUrl}/ai/dashboard-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new BadRequestException(`AI insights failed: ${error}`);
    }

    return res.json();
  }
}
