from pydantic import BaseModel, Field
from typing import Any, List, Optional


class AppraisalSummaryRequest(BaseModel):
    cycleId: str
    employeeId: str
    self: Optional[Any] = None
    manager: Optional[Any] = None
    goals: List[Any] = []
    peerFeedbackCount: int = 0


class AppraisalSummaryResponse(BaseModel):
    strengths: List[str]
    growth_areas: List[str]
    suggested_rating_range: List[int] = Field(..., description="[min, max] both inclusive on the cycle's rating scale")
    suggested_comment: str


class PeerFeedbackThemesRequest(BaseModel):
    responses: List[Any]


class PeerFeedbackThemesResponse(BaseModel):
    themes: List[str]
    quotes: List[str]
