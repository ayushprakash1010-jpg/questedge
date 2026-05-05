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
    decision: str = "SELECTED"  # SELECTED or REJECTED
    feedbackTone: str = "mixed"  # positive, mixed, negative
    offerDetails: Optional[OfferDetails] = None
    intent: Optional[str] = None  # e.g. "OFFER_LETTER_BODY" — switches prompt path
    tone: Optional[str] = None  # warm | formal | neutral — used by OFFER_LETTER_BODY
    compensation: Optional[dict] = None  # advisory only; numbers rendered by template


class DraftCommunicationResponse(BaseModel):
    subject: str
    body: str
