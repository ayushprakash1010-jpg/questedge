from pydantic import BaseModel, Field


class SkillInfo(BaseModel):
    name: str
    category: str  # TECHNICAL, LEADERSHIP, etc.
    priority: str  # MUST_HAVE, NICE_TO_HAVE


class CandidateResume(BaseModel):
    candidateId: str
    candidateName: str
    resumeText: str
    currentCompany: str | None = None
    currentRole: str | None = None
    experienceYears: float | None = None
    education: str | None = None


class ScoringWeights(BaseModel):
    skillsMatch: int = 25
    experienceRelevance: int = 20
    projectRelevance: int = 15
    educationCertifications: int = 10
    domainIndustryFit: int = 10
    roleSeniorityFit: int = 8
    culturalSoftSignals: int = 7
    logisticsAvailability: int = 5


class ResumeRankingRequest(BaseModel):
    jobDescription: dict
    skills: list[SkillInfo] = []
    candidates: list[CandidateResume]
    weights: ScoringWeights | None = None
    maxCandidates: int = Field(default=50, le=100)


class DimensionScore(BaseModel):
    score: float
    maxScore: float
    evidence: list[str] = []
    comment: str = ""


class ScoreBreakdown(BaseModel):
    skillsMatch: DimensionScore
    experienceRelevance: DimensionScore
    projectRelevance: DimensionScore
    educationCertifications: DimensionScore
    domainIndustryFit: DimensionScore
    roleSeniorityFit: DimensionScore
    culturalSoftSignals: DimensionScore
    logisticsAvailability: DimensionScore


class RankedCandidate(BaseModel):
    rank: int
    candidateId: str
    candidateName: str
    totalScore: float
    verdict: str  # EXCELLENT_FIT, STRONG_FIT, GOOD_FIT, PARTIAL_FIT, WEAK_FIT
    scoreBreakdown: ScoreBreakdown
    strengths: list[str] = []
    gaps: list[str] = []
    standoutFactors: list[str] = []
    comparisonNote: str = ""
    recommendation: str = ""


class JdCoverageStats(BaseModel):
    totalMustHaveSkills: int = 0
    avgMustHaveCoverage: float = 0.0
    strongFitCount: int = 0
    poolStrength: str = ""  # EXCELLENT, GOOD, FAIR, WEAK


class ResumeRankingResponse(BaseModel):
    rankings: list[RankedCandidate]
    summary: str = ""
    jdCoverage: JdCoverageStats = JdCoverageStats()
