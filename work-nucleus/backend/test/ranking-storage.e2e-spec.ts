import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { RankingScorecardStore } from '../src/modules/resume-ranking/ranking-scorecard.store';
import { QuickRankingRunsService } from '../src/modules/resume-ranking/quick-ranking-runs.service';

// Use only a disposable database with the current schema, e.g. the ranking storage smoke test.
const dbTest = process.env.RANKING_TEST_DATABASE_URL ? it : it.skip;
dbTest(
  'persists the scorecard and completed run across service instances and isolates users',
  async () => {
    const db = new PrismaClient({
      datasources: { db: { url: process.env.RANKING_TEST_DATABASE_URL! } },
    }) as PrismaService;
    const id = randomUUID();
    const org = await db.organization.create({
      data: { name: 'Ranking test ' + id },
    });
    try {
      const user = await db.user.create({
        data: {
          orgId: org.id,
          email: id + '@example.invalid',
          name: 'Tester',
          auth0Sub: id,
        },
      });
      const input = {
        jobDescription: { summary: 'Require SQL for reports.' },
        skills: [],
        weights: { skillsMatch: 100 },
      };
      const engine = {
        draftScorecard: jest
          .fn()
          .mockResolvedValue([{ id: 'R001', text: 'SQL' }]),
      };
      const cards = new RankingScorecardStore(db, engine as any);
      const first = await cards.draft(org.id, null, input);
      const reloaded = new RankingScorecardStore(db, engine as any);
      expect(await reloaded.draft(org.id, null, input)).toEqual(first);
      expect(engine.draftScorecard).toHaveBeenCalledTimes(1);
      await expect(
        reloaded.resolve(
          org.id,
          null,
          {
            ...input,
            shortlistingRules: { requiredCertification: 'REQUIRED' },
          },
          first.scorecardId,
        ),
      ).rejects.toThrow('changed');
      const ranker = {
        quickRank: jest
          .fn()
          .mockResolvedValue({
            rankings: [{ candidateId: 'sample', totalScore: 60 }],
          }),
      };
      const runs = new QuickRankingRunsService(db, ranker as any);
      const dto = {
        clientRunId: id,
        confirmedScorecardId: first.scorecardId,
        jdText: 'Require SQL for reports.',
        resumes: [{ resumeText: 'Sample text' }],
      };
      const result = await runs.rank(org.id, user.id, dto);
      expect(await runs.rank(org.id, user.id, dto)).toEqual(result);
      expect(ranker.quickRank).toHaveBeenCalledTimes(1);
      const restored = new QuickRankingRunsService(db, ranker as any);
      expect((await restored.status(org.id, user.id, id)).result).toEqual(
        result,
      );
      await expect(restored.status(org.id, randomUUID(), id)).rejects.toThrow(
        'unavailable',
      );
      await db.quickRankingRun.update({
        where: { id },
        data: { expiresAt: new Date(0) },
      });
      await expect(restored.status(org.id, user.id, id)).rejects.toThrow(
        'unavailable',
      );
    } finally {
      await db.quickRankingRun.deleteMany({ where: { orgId: org.id } });
      await db.user.deleteMany({ where: { orgId: org.id } });
      await db.organization.delete({ where: { id: org.id } });
      await db.$disconnect();
    }
  },
);
