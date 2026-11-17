export interface DimensionScore {
  score: number;
  maxScore: number;
  evidence: string[];
  comment: string;
}

export interface ScoreBreakdown {
  skillsMatch: DimensionScore;
  experienceRelevance: DimensionScore;
  projectRelevance: DimensionScore;
  educationCertifications: DimensionScore;
  domainIndustryFit: DimensionScore;
  roleSeniorityFit: DimensionScore;
  culturalSoftSignals: DimensionScore;
  logisticsAvailability: DimensionScore;
}

export type RankingVerdict =
  | 'EXCELLENT_FIT'
  | 'STRONG_FIT'
  | 'GOOD_FIT'
  | 'PARTIAL_FIT'
  | 'WEAK_FIT';

export interface RankedCandidate {
  rank: number;
  candidateId: string;
  candidateName: string;
  totalScore: number;
  verdict: RankingVerdict;
  scoreBreakdown: ScoreBreakdown;
  strengths: string[];
  gaps: string[];
  standoutFactors: string[];
  comparisonNote: string;
  recommendation: string;
}

export interface JdCoverageStats {
  totalMustHaveSkills: number;
  avgMustHaveCoverage: number;
  strongFitCount: number;
  poolStrength: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'WEAK';
}

export interface RankingResponse {
  rankings: RankedCandidate[];
  summary: string;
  jdCoverage: JdCoverageStats;
}

export interface RankingSessionSummary {
  id: string;
  mandateId: string;
  status: string;
  candidateCount: number;
  customWeights: any | null;
  poolSummary: string | null;
  processingTimeMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
  topCandidate?: string;
}
