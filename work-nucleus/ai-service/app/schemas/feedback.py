from pydantic import BaseModel, Field
from typing import Optional


# --- Shared Input Models ---

class ApplicationContext(BaseModel):
    candidateName: str
    role: str
    department: str
    planTitle: str


class SkillRatingInput(BaseModel):
    skillName: str
    category: str
    rating: int
    notes: Optional[str] = None


class FeedbackInput(BaseModel):
    interviewer: str
    stage: str
    stageType: str
    overallRating: int
    recommendation: str
    strengths: Optional[str] = None
    concerns: Optional[str] = None
    qualitativeNotes: Optional[str] = None
    skillRatings: list[SkillRatingInput] = []


# --- Summarize Request/Response ---

class SummarizeFeedbackRequest(BaseModel):
    applicationContext: ApplicationContext
    feedbacks: list[FeedbackInput]


class FeedbackSummaryResponse(BaseModel):
    overallAssessment: str = ""
    keyStrengths: list[str] = []
    areasOfConcern: list[str] = []
    skillAnalysis: list[dict] = []
    recommendation: str = ""
    confidence: str = ""
    riskFactors: list[str] = []


# --- Score Request/Response ---

class ScoringWeights(BaseModel):
    technical: int = 40
    leadership: int = 25
    behavioural: int = 20
    communication: int = 15


class ScoreCandidateRequest(BaseModel):
    applicationContext: ApplicationContext
    feedbacks: list[FeedbackInput]
    scoringWeights: ScoringWeights = ScoringWeights()


class CategoryBreakdown(BaseModel):
    category: str
    score: float
    weight: int
    weightedScore: float


class ScoreCandidateResponse(BaseModel):
    score: float
    breakdown: list[CategoryBreakdown] = []
    confidence: str = ""
    keyFactors: list[str] = []
