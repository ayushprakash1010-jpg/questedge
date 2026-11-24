// Run from backend with: npx ts-node scripts/check-ranking-batch.ts [--compare-order]
// All input is synthetic. The optional comparison adds two evaluation requests.
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { EvidenceRankingService } from '../src/modules/resume-ranking/evidence-ranking.service';
import { DEFAULT_DIMENSION_WEIGHTS } from '../src/modules/resume-ranking/ranking-policy';

async function main() {
  const engine = new EvidenceRankingService(new ConfigService());
  const input = {
    jobDescription: {
      summary:
        'Write SQL queries for reporting. The PL-600 certification is required.',
    },
    skills: [],
    weights: DEFAULT_DIMENSION_WEIGHTS,
    shortlistingRules: { requiredCertification: 'REQUIRED' },
  };
  const candidates = Array.from({ length: 10 }, (_, i) => ({
    candidateId: 'sample-' + (i + 1),
    candidateName: 'Sample Person ' + (i + 1),
    resumeText: [
      i % 2
        ? 'Skills: SQL'
        : 'Projects\nI wrote SQL queries to build inventory reports for store ' +
          (i + 1) +
          '.',
      i < 5
        ? 'Certifications: PL-600 awarded.'
        : 'Education: Bachelor of Economics.',
    ].join('\n'),
  }));
  const confirmedScorecard = await engine.draftScorecard(input);
  const evaluate = async (group: typeof candidates) => {
    const result = await engine.rank('synthetic-benchmark', {
      ...input,
      candidates: group,
      confirmedScorecard,
    });
    return Object.fromEntries(
      result.rankings.map((r) => [
        r.candidateId,
        {
          score: r.totalScore,
          eligibility: r.scoreBreakdown.eligibility,
          findings: Object.values(r.scoreBreakdown)
            .flatMap((value: any) =>
              (value?.criteria ?? []).map((c: any) => [
                c.requirementId,
                c.finding,
                c.qualification,
              ]),
            )
            .sort(),
        },
      ]),
    );
  };
  const group = await evaluate(candidates);
  const errors: string[] = [];
  if (Object.keys(group).length !== candidates.length)
    errors.push('Missing candidates');
  for (const [i, c] of candidates.entries()) {
    const expected = i < 5 ? 'MEETS_REQUIREMENTS' : 'NEEDS_VERIFICATION';
    if (group[c.candidateId]?.eligibility !== expected)
      errors.push(c.candidateId + ' credential status');
  }
  if (!(group['sample-1'].score > group['sample-2'].score))
    errors.push('Applied SQL should outrank listed-only SQL');
  if (process.argv.includes('--compare-order')) {
    const singles = process.argv.includes('--each-alone') ? candidates : candidates.slice(0, 1);
    for (const batch of [...singles.map((c) => [c]), [...candidates].reverse()]) {
      const other = await evaluate(batch);
      for (const id of Object.keys(other)) {
        if (JSON.stringify(group[id]) !== JSON.stringify(other[id]))
          errors.push(id + ' changed in another batch');
      }
    }
  }
  console.log(
    JSON.stringify({
      candidateCount: candidates.length,
      requirements: confirmedScorecard.length,
      errors,
    }),
  );
  if (errors.length) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
