/** Versioned policy: the model classifies evidence; these rules award the points. */
export const RANKING_POLICY_VERSION = 'evidence-v3';

export const DEFAULT_DIMENSION_WEIGHTS: Record<string, number> = {
  skillsMatch: 35,
  experienceRelevance: 20,
  projectRelevance: 20,
  educationCertifications: 0,
  domainIndustryFit: 10,
  roleSeniorityFit: 10,
  culturalSoftSignals: 5,
  logisticsAvailability: 0,
};

export const EVIDENCE_CREDIT = {
  DEMONSTRATED: 1,
  PARTIAL: 0.5,
  PLAUSIBLE: 0.5,
  TEAM_CONTEXT: 0.35,
  LISTED_ONLY: 0.2,
  NO_EVIDENCE: 0,
  EXPLICIT_MISMATCH: 0,
} as const;

export type EvidenceFinding = keyof typeof EVIDENCE_CREDIT;
export type Eligibility =
  | 'MEETS_REQUIREMENTS'
  | 'NEEDS_VERIFICATION'
  | 'DOES_NOT_MEET';

export interface SourceLine {
  id: string;
  text: string;
}
export interface EvidenceSection {
  kind: string;
  sourceIds: string[];
}
export interface CandidatePacket {
  candidateId: string;
  documentHash: string;
  sections: EvidenceSection[];
  sources: SourceLine[];
}
export interface Requirement {
  id: string;
  text: string;
  dimension: string;
  kind: string;
  priority: 'MANDATORY' | 'PREFERRED';
  rule: string;
  required: boolean;
  sourceIds: string[];
  maxPoints: number;
}
export interface RequirementFinding {
  requirementId: string;
  finding: EvidenceFinding;
  qualification: 'MET' | 'UNCONFIRMED' | 'EXPLICITLY_UNMET';
  sourceIds: string[];
  explanation: string;
}

/** Largest remainder allocation makes displayed sub-points add up exactly. */
export function allocatePoints(total: number, shares: number[]): number[] {
  const denominator = shares.reduce((sum, value) => sum + value, 0);
  if (!denominator) return shares.map(() => 0);
  const raw = shares.map((value) => (total * 100 * value) / denominator);
  const cents = raw.map(Math.floor);
  const order = raw
    .map((value, index) => ({ index, remainder: value - cents[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const remaining =
    Math.round(total * 100) - cents.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < remaining; index++) cents[order[index].index]++;
  return cents.map((value) => value / 100);
}

export function applyWeights(
  requirements: Requirement[],
  requested: Record<string, number>,
) {
  for (const requirement of requirements) {
    if (
      ['educationCertifications', 'logisticsAvailability'].includes(
        requirement.dimension,
      )
    )
      requirement.maxPoints = 0;
  }
  const active = Object.keys(DEFAULT_DIMENSION_WEIGHTS).filter(
    (dimension) =>
      dimension !== 'educationCertifications' &&
      dimension !== 'logisticsAvailability' &&
      requirements.some((r) => r.dimension === dimension),
  );
  const weights = Object.fromEntries(
    Object.keys(DEFAULT_DIMENSION_WEIGHTS).map((key) => [key, 0]),
  );
  const allocated = allocatePoints(
    100,
    active.map((key) => requested[key] || 0),
  );
  active.forEach((key, index) => {
    weights[key] = allocated[index];
    const items = requirements.filter((r) => r.dimension === key);
    // Mandatory and preferred requirements get a visible 2:1 share within a category.
    const points = allocatePoints(
      weights[key],
      items.map((r) => (r.priority === 'MANDATORY' ? 2 : 1)),
    );
    items.forEach((r, itemIndex) => {
      r.maxPoints = points[itemIndex];
    });
  });
  return weights;
}

export function eligibilityFor(
  requirements: Requirement[],
  findings: RequirementFinding[],
): Eligibility {
  let eligibility: Eligibility = 'MEETS_REQUIREMENTS';
  requirements
    .filter((r) => r.required)
    .forEach((requirement) => {
      const result = findings.find((f) => f.requirementId === requirement.id)!;
      if (result.qualification === 'EXPLICITLY_UNMET')
        eligibility = 'DOES_NOT_MEET';
      else if (
        result.qualification !== 'MET' &&
        eligibility !== 'DOES_NOT_MEET'
      )
        eligibility = 'NEEDS_VERIFICATION';
    });
  return eligibility;
}
