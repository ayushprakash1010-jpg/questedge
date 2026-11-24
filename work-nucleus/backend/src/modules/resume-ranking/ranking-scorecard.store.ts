import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EvidenceRankingService } from './evidence-ranking.service';
import { Requirement, RANKING_POLICY_VERSION } from './ranking-policy';

type ScorecardInput = Parameters<EvidenceRankingService['draftScorecard']>[0];
type Draft = { scorecardId: string; scorecard: Requirement[] };

@Injectable()
export class RankingScorecardStore {
  private readonly pending = new Map<string, Promise<Draft>>();

  constructor(
    private readonly db: PrismaService,
    private readonly engine: EvidenceRankingService,
  ) {}

  private fingerprint(mandateId: string | null, input: ScorecardInput) {
    // JD field and array order determine line citations. Weights and toggles do not.
    const settings = (value: Record<string, unknown>) =>
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return createHash('sha256')
      .update(
        JSON.stringify([
          RANKING_POLICY_VERSION,
          mandateId,
          input.jobDescription,
          input.skills,
          settings(input.weights),
          settings(input.shortlistingRules || {}).filter(
            ([, v]) => v === 'REQUIRED',
          ),
        ]),
      )
      .digest('hex');
  }

  async draft(
    orgId: string,
    mandateId: string | null,
    input: ScorecardInput,
  ): Promise<Draft> {
    if (!orgId)
      throw new ForbiddenException(
        'An organization is required to rank applicants.',
      );
    const fingerprint = this.fingerprint(mandateId, input);
    const key = orgId + ':' + fingerprint;
    const inflight = this.pending.get(key);
    if (inflight) return inflight;
    const work = this.findOrCreate(orgId, mandateId, fingerprint, input);
    this.pending.set(key, work);
    try {
      return await work;
    } finally {
      this.pending.delete(key);
    }
  }

  private async findOrCreate(
    orgId: string,
    mandateId: string | null,
    fingerprint: string,
    input: ScorecardInput,
  ) {
    const where = { orgId_fingerprint: { orgId, fingerprint } };
    let row = await this.db.resumeRankingScorecard.findUnique({ where });
    if (!row) {
      const requirements = await this.engine.draftScorecard(input);
      // Concurrent instances use the same winning row, including its exact requirement IDs.
      row = await this.db.resumeRankingScorecard.upsert({
        where,
        create: {
          orgId,
          mandateId,
          fingerprint,
          requirements: requirements as unknown as Prisma.InputJsonValue,
        },
        update: { fingerprint },
      });
    }
    return {
      scorecardId: row.id,
      scorecard: row.requirements as unknown as Requirement[],
    };
  }

  async resolve(
    orgId: string,
    mandateId: string | null,
    input: ScorecardInput,
    id?: string,
  ): Promise<Requirement[]> {
    if (!orgId)
      throw new ForbiddenException(
        'An organization is required to rank applicants.',
      );
    if (!id) return (await this.draft(orgId, mandateId, input)).scorecard;
    const row = await this.db.resumeRankingScorecard.findFirst({
      where: {
        id,
        orgId,
        mandateId,
        fingerprint: this.fingerprint(mandateId, input),
      },
    });
    if (!row)
      throw new ConflictException(
        'The job, rules, or weights have changed. Review the current scorecard before ranking.',
      );
    return row.requirements as unknown as Requirement[];
  }
}
