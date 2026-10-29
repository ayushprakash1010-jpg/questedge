export interface MatchScoreBreakdown {
  skillsFit: number; // 0 - 40 points
  experienceFit: number; // 0 - 25 points
  roleDomainFit: number; // 0 - 20 points
  preferencesFit: number; // 0 - 15 points (location, work model, notice period, compensation)
}

export type MatchVerdict = 'STRONG_MATCH' | 'GOOD_MATCH' | 'POTENTIAL_MATCH' | 'LOW_FIT';

export interface MatchEvaluationResult {
  matchScore: number; // 0 - 100
  verdict: MatchVerdict;
  scoreBreakdown: MatchScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  aiSummary: string;
  evaluatedAt: string;
  isAiGenerated: boolean;
}

export interface MandateMatchItem {
  mandate: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    workModel: string | null;
    mandatorySkills: string[];
    preferredSkills: string[];
    referralRewardAmount: number | null;
    currency: string;
    status?: string;
    organization: {
      id: string;
      name: string;
    };
  };
  match: MatchEvaluationResult;
}

export interface CandidateMatchItem {
  candidate: {
    id: string;
    name: string;
    email: string;
    headline: string | null;
    currentDesignation: string | null;
    currentCompany: string | null;
    experienceYears: number | null;
    skills: string[];
    currentLocation: string | null;
    workModel: string | null;
    noticePeriodDays: number | null;
  };
  match: MatchEvaluationResult;
}
