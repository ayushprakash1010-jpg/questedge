import logging
from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager

from app.config import settings
from app.services.db import init_db
from app.middleware.api_key_auth import verify_internal_api_key
from app.schemas.jd import GenerateJdRequest, GenerateJdResponse
from app.agents.jd_generator import JdGeneratorAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

jd_agent = JdGeneratorAgent()


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
