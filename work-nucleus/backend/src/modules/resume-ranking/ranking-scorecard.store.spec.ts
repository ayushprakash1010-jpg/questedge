import { ConflictException } from '@nestjs/common';
import { RankingScorecardStore } from './ranking-scorecard.store';
import { redactResumeText } from './resume-text-privacy';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DraftScorecardDto, QuickRankDto } from './dto/rank-resumes.dto';
import { QuickRankingRunsService } from './quick-ranking-runs.service';

it('reuses one draft, scopes it to the employer and invalidates changed requirements', async () => {
  const rows = new Map<string, any>();
  const cards = {
    findUnique: async ({ where }: any) =>
      rows.get(JSON.stringify(where.orgId_fingerprint)),
    upsert: async ({ create, where }: any) => {
      const row = { id: 'version-a', ...create };
      rows.set(JSON.stringify(where.orgId_fingerprint), row);
      return row;
    },
    findFirst: async ({ where }: any) =>
      [...rows.values()].find((row) =>
        Object.entries(where).every(([field, value]) => row[field] === value),
      ),
  };
  const engine = {
    draftScorecard: jest
      .fn()
      .mockResolvedValue([{ id: 'R001', text: 'Python' }]),
  };
  const store = new RankingScorecardStore(
    { resumeRankingScorecard: cards } as any,
    engine as any,
  );
  const input = {
    jobDescription: { title: 'Developer' },
    skills: [],
    weights: { skillsMatch: 100 },
  };
  const [a, b] = await Promise.all([
    store.draft('employer', null, input),
    store.draft('employer', null, input),
  ]);
  expect(a).toEqual(b);
  expect(await store.draft('employer', null, input)).toEqual(a);
  expect(await store.resolve('employer', null, input, a.scorecardId)).toEqual(
    a.scorecard,
  );
  expect(engine.draftScorecard).toHaveBeenCalledTimes(1);
  await expect(
    store.resolve('different-employer', null, input, a.scorecardId),
  ).rejects.toThrow(ConflictException);
  await expect(
    store.resolve(
      'employer',
      null,
      { ...input, shortlistingRules: { requiredCertification: 'REQUIRED' } },
      a.scorecardId,
    ),
  ).rejects.toThrow(ConflictException);
});

it('accepts JD-only previews but requires a confirmed version on the ranking API', async () => {
  const job = { jdText: 'An analyst who uses SQL for reporting.' };
  const settings = { whitelist: true, forbidNonWhitelisted: true };
  expect(
    await validate(plainToInstance(DraftScorecardDto, job), settings),
  ).toHaveLength(0);
  const errors = await validate(
    plainToInstance(QuickRankDto, {
      ...job,
      resumes: [{ resumeText: 'Example resume' }],
    }),
    settings,
  );
  expect(errors.map((e) => e.property)).toEqual(['confirmedScorecardId']);
  const extra = await validate(
    plainToInstance(DraftScorecardDto, { ...job, resumes: [] }),
    settings,
  );
  expect(extra.map((e) => e.property)).toContain('resumes');
});

it('records a recruiter correction for the exact original finding and rejects unknown criteria', async () => {
  const record = {
    candidateId: 'C1',
    scoreBreakdown: {
      skillsMatch: { criteria: [{ id: 'R1', finding: 'PLAUSIBLE' }] },
      _evaluation: { scorecardId: 'v1' },
    },
  };
  const db = {
    quickRankingRun: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ result: { rankings: [record] } }),
    },
    auditLog: { create: jest.fn() },
  };
  const service = new QuickRankingRunsService(db as any, {} as any);
  const dto = {
    source: 'QUICK' as const,
    recordId: 'run',
    candidateId: 'C1',
    requirementId: 'R1',
    finding: 'LISTED_ONLY',
  };
  await service.recordCorrection('org', 'user', dto);
  expect(db.auditLog.create.mock.calls[0][0].data.changes).toMatchObject({
    original: 'PLAUSIBLE',
    corrected: 'LISTED_ONLY',
    scorecardId: 'v1',
  });
  await expect(
    service.recordCorrection('org', 'user', {
      ...dto,
      requirementId: 'missing',
    }),
  ).rejects.toThrow('unavailable');
  expect(db.auditLog.create).toHaveBeenCalledTimes(1);
});

it('redacts names, Indian contact details and personal fields while preserving work dates and certifications', () => {
  const text = redactResumeText(
    'PRIYA SHAH | priya@example.com | +91 98765 43210\nDOB: 01/01/1990\nlinkedin.com/in/priya\nExperience: 2020-2024\nPL-600 certification earned',
    'Priya Shah',
  );
  expect(text).not.toMatch(/priya|98765|1990/i);
  expect(text).toContain('2020-2024');
  expect(text).toContain('PL-600 certification earned');
  expect(redactResumeText('PRIYA SHAH | priya@example.com\nExperience: SQL', 'upload_2'))
    .not.toMatch(/priya/i);
});
