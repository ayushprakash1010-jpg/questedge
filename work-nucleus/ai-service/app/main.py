import logging
from fastapi import FastAPI, Depends, File, UploadFile
from contextlib import asynccontextmanager

from app.config import settings
from app.services.db import init_db
from app.middleware.api_key_auth import verify_internal_api_key
from app.schemas.jd import GenerateJdRequest, GenerateJdResponse
from app.schemas.feedback import (
    SummarizeFeedbackRequest, FeedbackSummaryResponse,
    ScoreCandidateRequest, ScoreCandidateResponse,
)
from app.agents.jd_generator import JdGeneratorAgent
from app.agents.feedback_summarizer import FeedbackSummarizerAgent
from app.agents.candidate_scorer import CandidateScorerAgent
from app.schemas.communication import DraftCommunicationRequest, DraftCommunicationResponse
from app.agents.communication_drafter import CommunicationDrafterAgent
from app.schemas.insights import InsightsRequest, InsightsResponse
from app.agents.insights_agent import InsightsAgent
from app.schemas.resume_match import ResumeMatchRequest, ResumeMatchResponse
from app.agents.resume_matcher import ResumeMatcherAgent
from app.services.resume_parser import extract_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

jd_agent = JdGeneratorAgent()
feedback_summarizer = FeedbackSummarizerAgent()
candidate_scorer = CandidateScorerAgent()
communication_drafter = CommunicationDrafterAgent()
insights_agent = InsightsAgent()
resume_matcher = ResumeMatcherAgent()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Work Nucleus AI Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/ai/health")
async def health():
    return {
        "status": "ok",
        "service": "work-nucleus-ai",
        "model": settings.CLAUDE_MODEL,
    }


@app.post("/ai/generate-jd", response_model=GenerateJdResponse)
async def generate_jd(
    request: GenerateJdRequest,
    _api_key: str = Depends(verify_internal_api_key),
):
    """Generate a job description using AI based on hiring plan data."""
    logger.info(f"Generating JD for: {request.hiringPlan.title}")
    result = await jd_agent.generate(request)
    logger.info(f"JD generated successfully for: {request.hiringPlan.title}")
    return result


@app.post("/ai/summarize-feedback", response_model=FeedbackSummaryResponse)
async def summarize_feedback(
    request: SummarizeFeedbackRequest,
    _api_key: str = Depends(verify_internal_api_key),
):
    """Summarize interview feedback using AI."""
    logger.info(f"Summarizing feedback for: {request.applicationContext.candidateName}")
    result = await feedback_summarizer.summarize(request)
    logger.info(f"Feedback summary generated for: {request.applicationContext.candidateName}")
    return result


@app.post("/ai/score-candidate", response_model=ScoreCandidateResponse)
async def score_candidate(
    request: ScoreCandidateRequest,
    _api_key: str = Depends(verify_internal_api_key),
):
    """Score a candidate using weighted feedback analysis and AI adjustment."""
    logger.info(f"Scoring candidate: {request.applicationContext.candidateName}")
    result = await candidate_scorer.score(request)
    logger.info(f"Score generated for: {request.applicationContext.candidateName} — {result.score}")
    return result


@app.post("/ai/draft-communication", response_model=DraftCommunicationResponse)
async def draft_communication(
    request: DraftCommunicationRequest,
    _api_key: str = Depends(verify_internal_api_key),
):
    """Draft a selection or rejection communication email."""
    logger.info(f"Drafting {request.decision} communication for: {request.candidate.name}")
    result = await communication_drafter.draft(request)
    logger.info(f"Communication drafted for: {request.candidate.name}")
    return result


@app.post("/ai/dashboard-insights", response_model=InsightsResponse)
async def dashboard_insights(
    request: InsightsRequest,
    _api_key: str = Depends(verify_internal_api_key),
):
    """Generate AI-powered hiring insights from analytics data."""
    logger.info(f"Generating insights for: {request.companyName}")
    result = await insights_agent.analyze(request)
    logger.info(f"Generated {len(result.insights)} insights for: {request.companyName}")
    return result


@app.post("/ai/extract-resume-text")
async def extract_resume_text(
    file: UploadFile = File(...),
    _api_key: str = Depends(verify_internal_api_key),
):
    """Extract plain text from a resume file (PDF or DOCX)."""
    file_bytes = await file.read()
    content_type = file.content_type or ""
    logger.info(f"Extracting text from resume: {file.filename} ({content_type})")
    text = extract_text(file_bytes, content_type)
    logger.info(f"Extracted {len(text)} characters from resume")
    return {"text": text}


@app.post("/ai/match-resume", response_model=ResumeMatchResponse)
async def match_resume(
    request: ResumeMatchRequest,
    _api_key: str = Depends(verify_internal_api_key),
):
    """Match a candidate's resume against a job description using AI."""
    logger.info(f"Matching resume for: {request.candidateName}")
    result = await resume_matcher.match(request)
    logger.info(f"Resume match complete for {request.candidateName}: score={result.matchScore}")
    return result
