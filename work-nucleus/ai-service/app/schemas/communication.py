from pydantic import BaseModel
from typing import Optional


class CandidateInfo(BaseModel):
    name: str
    email: str


class OfferDetails(BaseModel):
    ctc: Optional[float] = None
    designation: str
    joiningDate: Optional[str] = None


class DraftCommunicationRequest(BaseModel):
    candidate: CandidateInfo
    role: str
    company: str
    department: str
    decision: str  # SELECTED or REJECTED
    feedbackTone: str = "mixed"  # positive, mixed, negative
    offerDetails: Optional[OfferDetails] = None


class DraftCommunicationResponse(BaseModel):
    subject: str
    body: str
