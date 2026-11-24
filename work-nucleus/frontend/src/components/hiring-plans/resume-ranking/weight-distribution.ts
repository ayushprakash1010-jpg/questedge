export interface ScoringWeights {
  skillsMatch: number;
  experienceRelevance: number;
  projectRelevance: number;
  educationCertifications: number;
  domainIndustryFit: number;
  roleSeniorityFit: number;
  culturalSoftSignals: number;
  logisticsAvailability: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skillsMatch: 35,
  experienceRelevance: 20,
  projectRelevance: 20,
  educationCertifications: 0,
  domainIndustryFit: 10,
  roleSeniorityFit: 10,
  culturalSoftSignals: 5,
  logisticsAvailability: 0,
};

export const WEIGHT_DIMENSIONS = [
  { key: "skillsMatch", label: "Skills match", color: "#4f46e5" },
  { key: "experienceRelevance", label: "Experience", color: "#0369a1" },
  { key: "projectRelevance", label: "Projects", color: "#0f766e" },
  { key: "domainIndustryFit", label: "Domain fit", color: "#b45309" },
  { key: "roleSeniorityFit", label: "Role and seniority", color: "#9333ea" },
  { key: "culturalSoftSignals", label: "Soft-skill signals", color: "#be185d" },
] as const;

export type WeightKey = (typeof WEIGHT_DIMENSIONS)[number]["key"];
export const MAX_WEIGHT = 50;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Numeric edits redistribute the remaining points with integer values and a cap.
export function setWeight(
  weights: ScoringWeights,
  key: WeightKey,
  value: number,
): ScoringWeights {
  if (!Number.isFinite(value)) return weights;
  const next = { ...weights, educationCertifications: 0, logisticsAvailability: 0 };
  next[key] = clamp(Math.round(value), 0, MAX_WEIGHT);
  const others = WEIGHT_DIMENSIONS.filter((d) => d.key !== key);
  let remaining = 100 - next[key];
  others.forEach((d) => {
    next[d.key] = 0;
  });
  while (remaining > 0) {
    const available = others.filter((d) => next[d.key] < MAX_WEIGHT);
    const denominator = available.reduce(
      (sum, d) => sum + Math.max(0, weights[d.key]),
      0,
    );
    const shares = available.map((d) => ({
      key: d.key,
      share: denominator
        ? Math.max(0, weights[d.key]) / denominator
        : 1 / available.length,
    }));
    const budget = remaining;
    for (const d of shares) {
      const amount = Math.min(
        MAX_WEIGHT - next[d.key],
        Math.floor(budget * d.share),
      );
      next[d.key] += amount;
      remaining -= amount;
    }
    shares.sort((a, b) => ((budget * b.share) % 1) - ((budget * a.share) % 1));
    for (const d of shares) {
      if (remaining > 0 && next[d.key] < MAX_WEIGHT) {
        next[d.key]++;
        remaining--;
      }
    }
  }
  return next;
}

// A boundary transfers points only between its two neighboring slices.
export function moveBoundary(
  weights: ScoringWeights,
  index: number,
  delta: number,
): ScoringWeights {
  const left = WEIGHT_DIMENSIONS[index].key;
  const right = WEIGHT_DIMENSIONS[(index + 1) % WEIGHT_DIMENSIONS.length].key;
  const amount = clamp(
    Math.round(delta),
    Math.max(-weights[left], weights[right] - MAX_WEIGHT),
    Math.min(MAX_WEIGHT - weights[left], weights[right]),
  );
  return {
    ...weights,
    [left]: weights[left] + amount,
    [right]: weights[right] - amount,
  };
}
