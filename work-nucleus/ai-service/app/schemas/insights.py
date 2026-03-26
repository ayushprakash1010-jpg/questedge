from pydantic import BaseModel
from typing import Optional


class InsightsRequest(BaseModel):
    companyName: str
    overview: dict = {}
    funnel: list = []
    timeToHire: dict = {}
    cost: list = []
    interviewerStats: list = []
    sourceEffectiveness: list = []


class Insight(BaseModel):
    title: str
    description: str
    severity: str = "info"  # info, warning, critical
    category: str = ""
    recommendation: str = ""


class InsightsResponse(BaseModel):
    insights: list[Insight] = []
