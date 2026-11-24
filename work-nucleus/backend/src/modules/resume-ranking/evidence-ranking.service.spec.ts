import { ConfigService } from '@nestjs/config';
import { EvidenceRankingService } from './evidence-ranking.service';
import {
  allocatePoints,
  applyWeights,
  eligibilityFor,
  DEFAULT_DIMENSION_WEIGHTS,
} from './ranking-policy';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

describe('Evidence ranking pipeline', () => {
  let service: EvidenceRankingService;
  let evaluationInput: any;
  let useSecondCandidateEvidence: boolean;
  let selectedFinding: string;
  let qualification: string;
  let invalidSource: boolean;
  let omitCandidate: boolean;
  let omitRequirement: boolean;
  let skillsOnlyEvidence: boolean;
  const payload = () => ({
    jobDescription: {
      title: 'Frontend engineer',
      summary:
        'Build React applications. Master degree and PL-600 certificate.',
    },
    skills: [{ name: 'React', priority: 'MANDATORY' }],
    candidates: [
      {
        candidateId: 'saved-profile-id',
        candidateName: 'Alice Smith',
        resumeText:
          'Alice Smith\nalice@example.com\nSkills: React\nCheckout project\nStack: React\nI built checkout validation.\nPursuing a master degree.\nPreparing for the PL-600 exam.',
      },
    ],
    weights: { ...DEFAULT_DIMENSION_WEIGHTS },
    shortlistingRules: {
      requiredEducation: 'REQUIRED',
      requiredCertification: 'REQUIRED',
    },
  });

  beforeEach(() => {
    service = new EvidenceRankingService({
      get: (_key: string, fallback: string) => fallback,
    } as ConfigService);
    useSecondCandidateEvidence = false;
    selectedFinding = 'DEMONSTRATED';
    qualification = 'UNCONFIRMED';
    invalidSource = false;
    omitCandidate = false;
    omitRequirement = false;
    skillsOnlyEvidence = false;
    jest
      .spyOn(service as any, 'generate')
      .mockImplementation(
        async (_model: any, schema: any, prompt: any, validate: any) => {
          if (schema.properties.requirements) {
            const sources = JSON.parse(prompt.split('JD sources: ')[1]);
            const source = sources.find((s: any) =>
              s.text.includes('Master degree'),
            );
            return validate({
              requirements: [
                {
                  text: 'Hands-on React',
                  kind: 'SKILL',
                  dimension: 'skillsMatch',
                  priority: 'MANDATORY',
                  rule: 'mandatorySkills',
                  sourceIds: [source.id],
                },
                {
                  text: 'Master degree',
                  kind: 'EDUCATION',
                  dimension: 'educationCertifications',
                  priority: 'MANDATORY',
                  rule: 'requiredEducation',
                  sourceIds: [source.id],
                },
                {
                  text: 'PL-600 certificate',
                  kind: 'CERTIFICATION',
                  dimension: 'educationCertifications',
                  priority: 'MANDATORY',
                  rule: 'requiredCertification',
                  sourceIds: [source.id],
                },
              ],
            });
          }
          const input = JSON.parse(prompt.slice(prompt.lastIndexOf('\n') + 1));
          evaluationInput = input;
          const candidates = input.candidates.map((candidate: any) => ({
            candidateId: candidate.candidateId,
            findings: input.requirements.map((r: any) => {
              const isSkill = r.kind === 'SKILL';
              let sources = candidate.sources.filter((s: any) =>
                isSkill
                  ? selectedFinding === 'LISTED_ONLY' || skillsOnlyEvidence
                    ? s.text.includes('Skills:')
                    : /Skills:|Stack:|I built/.test(s.text)
                  : s.text.includes(
                      r.kind === 'EDUCATION' ? 'master degree' : 'PL-600',
                    ),
              );
              if (selectedFinding === 'NO_EVIDENCE') sources = [];
              const finding = isSkill
                ? selectedFinding
                : qualification === 'MET'
                  ? 'DEMONSTRATED'
                  : qualification === 'EXPLICITLY_UNMET'
                    ? 'EXPLICIT_MISMATCH'
                    : 'PARTIAL';
              return {
                requirementId: r.id,
                finding,
                qualification: isSkill
                  ? selectedFinding === 'DEMONSTRATED'
                    ? 'MET'
                    : 'UNCONFIRMED'
                  : qualification,
                explanation: isSkill
                  ? 'Evidence links the project stack to the described contribution.'
                  : 'Qualification completion needs verification.',
                sourceIds: invalidSource
                  ? ['other-candidate-source']
                  : sources.map((s: any) =>
                      useSecondCandidateEvidence
                        ? s.id.replace('C001-', 'C002-')
                        : s.id,
                    ),
              };
            }),
          }));
          if (omitCandidate) candidates.pop();
          if (omitRequirement) candidates[0].findings.pop();
          return validate({ candidates });
        },
      );
  });

  it('preserves all redacted source lines and returns cited evidence for the correct candidate', async () => {
    const result = await service.rank('org-a', payload());
    expect(result.rankings[0].candidateId).toBe('saved-profile-id');
    expect(result.rankings[0].totalScore).toBe(100);
    expect(result.rankings[0].scoreBreakdown.eligibility).toBe(
      'NEEDS_VERIFICATION',
    );
    const serialized = JSON.stringify(evaluationInput);
    expect(serialized).not.toContain('Alice Smith');
    expect(serialized).not.toContain('alice@example.com');
    expect(serialized).not.toContain('resumeText');
    expect(evaluationInput.candidates[0].candidateId).toBe('C001');
    const sources = evaluationInput.candidates[0].sources;
    const stackIndex = sources.findIndex(
      (line: any) => line.text === 'Stack: React',
    );
    expect(stackIndex).toBeGreaterThan(0);
    expect(sources[stackIndex + 1].text).toBe('I built checkout validation.');
    const criteria = (result.rankings[0].scoreBreakdown as any).skillsMatch
      .criteria;
    expect(
      criteria[0].evidence.some((s: any) => s.text === 'Stack: React'),
    ).toBe(true);
    expect(criteria[0].score).toBe(criteria[0].maxPoints);
  });

  it.each([
    ['LISTED_ONLY', 20],
    ['TEAM_CONTEXT', 35],
    ['PLAUSIBLE', 50],
    ['DEMONSTRATED', 100],
  ])('awards fixed credit for %s evidence', async (finding, expected) => {
    selectedFinding = finding;
    const result = await service.rank('org-a', payload());
    expect(result.rankings[0].totalScore).toBe(expected);
  });

  it('keeps separate qualification checks and cannot compensate for an explicit mismatch with skill points', async () => {
    qualification = 'EXPLICITLY_UNMET';
    const result = await service.rank('org-a', payload());
    expect(result.rankings[0].isDisqualified).toBe(true);
    expect(result.rankings[0].totalScore).toBe(100);
    expect(
      (result.rankings[0].scoreBreakdown as any).educationCertifications
        .criteria,
    ).toHaveLength(2);
  });

  it('uses one evaluation call with a confirmed card and ten uncached resumes', async () => {
    const input = payload();
    const confirmedScorecard = await service.draftScorecard(input);
    const provider = (service as any).generate as jest.Mock;
    provider.mockClear();
    input.candidates = Array.from({ length: 10 }, (_, idx) => ({
      ...input.candidates[0],
      candidateId: `external-${idx}`,
    }));
    const result = await service.rank('org-a', {
      ...input,
      confirmedScorecard,
    });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(result.rankings.map((row) => row.candidateId)).toEqual(
      input.candidates.map((row) => row.candidateId),
    );
    expect(result.evaluation.scorecard).toEqual(confirmedScorecard);
  });

  it('rejects a genuine source ID belonging to another candidate even for identical document text', async () => {
    const input = payload();
    input.candidates.push({ ...input.candidates[0], candidateId: 'other' });
    useSecondCandidateEvidence = true;
    await expect(service.rank('org-a', input)).rejects.toThrow(
      'Invalid evidence references',
    );
  });

  it('checks damaged confirmed cards before sending any resume', async () => {
    const input = payload();
    const card = await service.draftScorecard(input);
    card[0].sourceIds = ['nonexistent-line'];
    const provider = (service as any).generate as jest.Mock;
    provider.mockClear();
    await expect(
      service.rank('org-a', { ...input, confirmedScorecard: card }),
    ).rejects.toThrow('confirmed scorecard is invalid');
    expect(provider).not.toHaveBeenCalled();
  });

  it('rejects hands-on credit supported only by a global skills list', async () => {
    skillsOnlyEvidence = true;
    await expect(service.rank('org-a', payload())).rejects.toThrow(
      'Applied skill findings need a project or work experience source',
    );
  });

  it('bounds model responses for larger mandate pools without losing candidates', async () => {
    const input = payload();
    input.candidates = Array.from({ length: 11 }, (_, index) => ({
      ...input.candidates[0],
      candidateId: `candidate-${index}`,
    }));
    const result = await service.rank('org-a', input);
    expect(result.rankings).toHaveLength(11);
    const calls = (service as any).generate.mock.calls.filter(
      (call: any[]) => call[1].properties.candidates,
    );
    expect(calls).toHaveLength(2);
    expect(new Set(result.rankings.map((r) => r.candidateId)).size).toBe(11);
  });

  it('reads relevant evidence after character 4000', async () => {
    const input = payload();
    input.candidates[0].resumeText =
      'Unrelated history\n'.repeat(350) + input.candidates[0].resumeText;
    const result = await service.rank('org-a', input);
    expect(result.rankings[0].totalScore).toBe(100);
    expect(JSON.stringify(evaluationInput)).toContain('Unrelated history');
    expect(JSON.stringify(result.rankings)).not.toContain('Unrelated history');
  });

  it.each(['source', 'candidate', 'requirement'])(
    'rejects invalid or missing %s data',
    async (part) => {
      invalidSource = part === 'source';
      omitCandidate = part === 'candidate';
      omitRequirement = part === 'requirement';
      await expect(service.rank('org-a', payload())).rejects.toThrow();
    },
  );

  it('allocates scoring points exactly while qualifications and location remain unweighted for older callers', () => {
    expect(
      allocatePoints(30, [1, 1, 1, 1, 1, 1, 1]).reduce((a, b) => a + b, 0),
    ).toBeCloseTo(30);
    const requirements: any[] = [
      {
        id: 'location',
        dimension: 'logisticsAvailability',
        priority: 'MANDATORY',
        required: true,
        maxPoints: 5,
      },
      { dimension: 'skillsMatch', priority: 'MANDATORY' },
      { dimension: 'skillsMatch', priority: 'PREFERRED' },
      { dimension: 'projectRelevance', priority: 'MANDATORY' },
      {
        dimension: 'educationCertifications',
        priority: 'MANDATORY',
        maxPoints: 0,
      },
    ];
    const weights = applyWeights(requirements, {
      skillsMatch: 30,
      projectRelevance: 20,
      educationCertifications: 45,
      logisticsAvailability: 5,
    });
    expect(weights.educationCertifications).toBe(0);
    expect(weights.skillsMatch).toBe(60);
    expect(requirements[0].maxPoints).toBe(0);
    expect(requirements[1].maxPoints).toBe(40);
    expect(requirements[2].maxPoints).toBe(20);
    expect(weights.logisticsAvailability).toBe(0);
    expect(
      eligibilityFor(requirements, [
        { requirementId: 'location', qualification: 'UNCONFIRMED' } as any,
      ]),
    ).toBe('NEEDS_VERIFICATION');
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('Gemini failure handling', () => {
  const input = {
    jobDescription: { summary: 'Build React applications' },
    skills: [],
    weights: DEFAULT_DIMENSION_WEIGHTS,
  };
  const service = new EvidenceRankingService({
    get: (key: string) =>
      key === 'GEMINI_API_KEY' ? 'mock-key' : 'mock-model',
  } as ConfigService);
  let generateContent: jest.Mock;

  beforeEach(() => {
    generateContent = jest.fn();
    require('@google/genai').GoogleGenAI.mockImplementation(() => ({
      models: { generateContent },
    }));
  });

  it('sends an invalid evidence response to manual review without repeating the call', async () => {
    generateContent.mockResolvedValue({ text: '{"requirements":[]}' });
    await expect(service.draftScorecard(input)).rejects.toMatchObject({
      status: 422,
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures once and reports provider unavailability', async () => {
    generateContent.mockRejectedValue(
      Object.assign(new Error('Unavailable'), { status: 503 }),
    );
    await expect(service.draftScorecard(input)).rejects.toMatchObject({
      status: 503,
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
