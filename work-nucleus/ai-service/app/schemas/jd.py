from pydantic import BaseModel, Field
from typing import Optional


class HiringPlanInput(BaseModel):
    title: str
    industry: str
    department: str
    designation: str
    quarter: int
    year: int
    totalRoles: int
    budgetMin: float
    budgetMax: float
    currency: str = "INR"
    benefits: list = []
    reportingManagerName: str
    hodName: str
    teamSize: Optional[int] = None
    teamLevels: Optional[str] = None
    organizationName: Optional[str] = None


class SkillInput(BaseModel):
    name: str
    category: str
    priority: str
    minProficiency: int


class GenerateJdRequest(BaseModel):
    hiringPlan: HiringPlanInput
    skills: list[SkillInput] = []
    additionalContext: Optional[str] = None


# --- Response models ---

class Qualifications(BaseModel):
    required: list[str] = []
    preferred: list[str] = []


class JdContent(BaseModel):
    title: str = ""
    summary: str = ""
    responsibilities: list[str] = []
    qualifications: Qualifications = Qualifications()
    aboutCompany: str = ""
    workMode: str = ""


class CtcRange(BaseModel):
    min: float = 0
    max: float = 0
    currency: str = "INR"


class FitmentMapping(BaseModel):
    role: str = ""
    designation: str = ""
    ctcRange: CtcRange = CtcRange()
    reportingTo: str = ""
    hod: str = ""
    teamSize: Optional[int] = None
    teamLevels: Optional[str] = None
    industry: str = ""


class TechnicalSkillEval(BaseModel):
    name: str
    proficiencyExpected: int = 3
    assessmentCriteria: str = ""


class LeadershipSkillEval(BaseModel):
    name: str
    indicators: list[str] = []


class BehaviouralSkillEval(BaseModel):
    name: str
    assessmentCriteria: str = ""


class EvaluationParameters(BaseModel):
    technicalSkills: list[TechnicalSkillEval] = []
    leadershipSkills: list[LeadershipSkillEval] = []
    behaviouralSkills: list[BehaviouralSkillEval] = []


class GenerateJdResponse(BaseModel):
    content: JdContent = JdContent()
    fitmentMapping: FitmentMapping = FitmentMapping()
    evaluationParameters: EvaluationParameters = EvaluationParameters()
