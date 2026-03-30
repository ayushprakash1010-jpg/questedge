from pydantic import BaseModel


class SkillInfo(BaseModel):
    name: str
    category: str
    priority: str


class ResumeMatchRequest(BaseModel):
    jobDescription: dict
    skills: list[SkillInfo]
    resumeText: str
    candidateName: str


class SkillMatchDetail(BaseModel):
    skill: str
    matched: bool
    evidence: str


class ResumeMatchResponse(BaseModel):
    matchScore: float
    summary: str
    skillMatches: list[SkillMatchDetail]
    strengths: list[str]
    gaps: list[str]
    recommendation: str  # STRONG_MATCH, GOOD_MATCH, PARTIAL_MATCH, WEAK_MATCH
