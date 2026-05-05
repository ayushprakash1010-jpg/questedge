import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BgvAiSummary {
  overall_recommendation: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'BLOCK';
  key_findings: string[];
  discrepancies: Array<{ check: string; severity: string; recommended_action: string }>;
  executive_summary: string;
}

@Injectable()
export class BgvAiService {
  private readonly logger = new Logger(BgvAiService.name);
  private readonly aiServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.internalApiKey = this.config.get<string>('INTERNAL_API_KEY', 'dev-internal-key');
  }

  async summarise(payload: {
    candidate: { name: string; email: string };
    profile: { riskScore?: string | null; vendor: string };
    checks: Array<{
      type: string;
      status: string;
      finding: string;
      reportUrl?: string | null;
      response?: unknown;
    }>;
  }): Promise<BgvAiSummary> {
    try {
      const res = await fetch(`${this.aiServiceUrl}/ai/bgv-summarise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': this.internalApiKey,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`AI service error ${res.status}: ${text}`);
        return this.fallback(payload.checks);
      }
      const data: any = await res.json();
      return data as BgvAiSummary;
    } catch (err) {
      this.logger.error(`BGV AI service call failed: ${err}`);
      return this.fallback(payload.checks);
    }
  }

  private fallback(checks: Array<{ finding: string }>): BgvAiSummary {
    const discrepancyCount = checks.filter((c) => c.finding === 'DISCREPANCY').length;
    const recommendation =
      discrepancyCount === 0
        ? 'PROCEED'
        : discrepancyCount > 2
        ? 'BLOCK'
        : 'PROCEED_WITH_CAUTION';
    return {
      overall_recommendation: recommendation,
      key_findings: [`AI summariser unavailable; rule-based fallback. ${discrepancyCount} discrepancy/ies.`],
      discrepancies: [],
      executive_summary: 'AI summariser unavailable. Please review check findings manually.',
    };
  }
}
