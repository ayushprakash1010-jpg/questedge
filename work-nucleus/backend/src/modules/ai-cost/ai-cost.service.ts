import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ANOMALY_MULTIPLIER = 2;

@Injectable()
export class AiCostService {
  constructor(private readonly prisma: PrismaService) {}

  async logCall(input: {
    orgId?: string;
    agentName: string;
    modelUsed: string;
    tokensInput?: number;
    tokensOutput?: number;
    costInPaise?: number;
    cacheHit?: boolean;
    status: string;
    latencyMs?: number;
  }) {
    return this.prisma.aiCallLog.create({ data: input });
  }

  /**
   * Non-throwing telemetry helper for Gemini / AI SDK responses.
   * Converts token usage into integer paise (approx ₹0.01/1K in, ₹0.03/1K out -> min 1 paise per successful call).
   */
  async logGeminiCall(params: {
    orgId?: string;
    agentName: string;
    modelUsed: string;
    startedAtMs: number;
    response?: any;
    error?: unknown;
    cacheHit?: boolean;
  }) {
    try {
      const usage = params.response?.usageMetadata;
      const tokensInput =
        typeof usage?.promptTokenCount === 'number'
          ? usage.promptTokenCount
          : undefined;
      const tokensOutput =
        typeof usage?.candidatesTokenCount === 'number'
          ? usage.candidatesTokenCount
          : undefined;
      const estimatedPaise =
        tokensInput !== undefined || tokensOutput !== undefined
          ? Math.max(
              1,
              Math.round(
                ((tokensInput ?? 0) * 0.001 + (tokensOutput ?? 0) * 0.004),
              ),
            )
          : params.error
            ? 0
            : 2;

      await this.prisma.aiCallLog.create({
        data: {
          orgId: params.orgId,
          agentName: params.agentName,
          modelUsed: params.modelUsed,
          tokensInput,
          tokensOutput,
          costInPaise: params.cacheHit ? 0 : estimatedPaise,
          cacheHit: params.cacheHit ?? false,
          status: params.error ? 'ERROR' : 'SUCCESS',
          latencyMs: Math.max(0, Date.now() - params.startedAtMs),
        },
      });
    } catch {
      // Telemetry must never break primary workflows
    }
  }

  /**
   * Daily AI cost dashboard for an org with anomaly flag (today > 2× rolling avg).
   */
  async dashboard(orgId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const calls = await this.prisma.aiCallLog.findMany({
      where: { orgId, createdAt: { gte: since } },
      select: {
        agentName: true,
        costInPaise: true,
        tokensInput: true,
        tokensOutput: true,
        createdAt: true,
        status: true,
        cacheHit: true,
      },
    });

    const byDay: Record<
      string,
      { paise: number; calls: number; cacheHits: number }
    > = {};
    const byAgent: Record<string, { paise: number; calls: number }> = {};
    let totalPaise = 0;
    const totalCalls = calls.length;
    let cacheHits = 0;

    for (const c of calls) {
      const day = c.createdAt.toISOString().slice(0, 10);
      byDay[day] = byDay[day] ?? { paise: 0, calls: 0, cacheHits: 0 };
      byDay[day].paise += c.costInPaise ?? 0;
      byDay[day].calls += 1;
      if (c.cacheHit) byDay[day].cacheHits += 1;

      byAgent[c.agentName] = byAgent[c.agentName] ?? { paise: 0, calls: 0 };
      byAgent[c.agentName].paise += c.costInPaise ?? 0;
      byAgent[c.agentName].calls += 1;

      totalPaise += c.costInPaise ?? 0;
      if (c.cacheHit) cacheHits += 1;
    }

    const dayKeys = Object.keys(byDay).sort();
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayPaise = byDay[todayKey]?.paise ?? 0;
    const rollingAvg =
      dayKeys.length > 1
        ? dayKeys
            .filter((k) => k !== todayKey)
            .reduce((s, k) => s + byDay[k].paise, 0) /
          Math.max(1, dayKeys.length - 1)
        : 0;
    const anomaly =
      rollingAvg > 0 && todayPaise > rollingAvg * ANOMALY_MULTIPLIER;

    return {
      totalCalls,
      totalPaise,
      totalRupees: totalPaise / 100,
      cacheHitRate: totalCalls === 0 ? 0 : cacheHits / totalCalls,
      anomaly,
      todayPaise,
      rollingAvgPaise: Math.round(rollingAvg),
      byDay,
      byAgent,
    };
  }
}
