import json
import logging
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.resume_match import (
    ResumeMatchRequest,
    ResumeMatchResponse,
    SkillMatchDetail,
)

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "resume_match.j2"


class ResumeMatcherAgent(BaseAgent):
    """AI agent that matches a candidate's resume against a job description."""

    def __init__(self):
        super().__init__(agent_name="resume_matcher")
        self._template = Template(PROMPT_TEMPLATE_PATH.read_text())

    def _parse_json_response(self, text: str) -> dict:
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        if "```" in text:
            parts = text.split("```")
            for part in parts:
                cleaned = part.strip()
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:].strip()
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    continue

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

        raise ValueError("Failed to parse JSON from AI response")

    async def match(self, request: ResumeMatchRequest) -> ResumeMatchResponse:
        jd = request.jobDescription
        qualifications = jd.get("qualifications", {})

        system_prompt = self._template.render(
            title=jd.get("title", ""),
            summary=jd.get("summary", ""),
            responsibilities=jd.get("responsibilities", []),
            required_qualifications=qualifications.get("required", []),
            preferred_qualifications=qualifications.get("preferred", []),
            skills=[s.model_dump() for s in request.skills],
            candidate_name=request.candidateName,
            resume_text=request.resumeText[:8000],  # Limit to avoid token overflow
        )

        user_prompt = "Analyze the resume against the job description. Return ONLY the JSON object."

        response = await self.call_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=4096,
        )

        raw_text = response.get("content", "")

        try:
            parsed = self._parse_json_response(raw_text)
        except ValueError:
            logger.warning("First JSON parse failed for resume match, retrying")
            retry_response = await self.call_claude(
                system_prompt="Fix this JSON and return ONLY valid JSON.",
                user_prompt=f"Fix this JSON:\n\n{raw_text}",
                max_tokens=4096,
            )
            raw_text = retry_response.get("content", "")
            parsed = self._parse_json_response(raw_text)

        score = max(0, min(100, parsed.get("matchScore", 0)))

        return ResumeMatchResponse(
            matchScore=round(score, 2),
            summary=parsed.get("summary", ""),
            skillMatches=[
                SkillMatchDetail(**sm) for sm in parsed.get("skillMatches", [])
            ],
            strengths=parsed.get("strengths", []),
            gaps=parsed.get("gaps", []),
            recommendation=parsed.get("recommendation", "PARTIAL_MATCH"),
        )
