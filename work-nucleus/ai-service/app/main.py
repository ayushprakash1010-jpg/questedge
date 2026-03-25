from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.config import settings
from app.services.db import init_db


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
