from pydantic import BaseModel, Field
from typing import List, Optional, Any


class BgvCandidate(BaseModel):
    name: str
    email: str


class BgvProfileMeta(BaseModel):
    riskScore: Optional[str] = None
    vendor: str


class BgvCheckRecord(BaseModel):
    type: str
    status: str
    finding: str
    reportUrl: Optional[str] = None
    response: Optional[Any] = None


class BgvSummariseRequest(BaseModel):
    candidate: BgvCandidate
    profile: BgvProfileMeta
    checks: List[BgvCheckRecord]


class BgvDiscrepancy(BaseModel):
    check: str
    severity: str
    recommended_action: str


class BgvSummariseResponse(BaseModel):
    overall_recommendation: str = Field(..., description="PROCEED | PROCEED_WITH_CAUTION | BLOCK")
    key_findings: List[str]
    discrepancies: List[BgvDiscrepancy]
    executive_summary: str
