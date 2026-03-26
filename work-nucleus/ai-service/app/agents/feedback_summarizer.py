import json
import logging
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.feedback import (
    SummarizeFeedbackRequest,
    FeedbackSummaryResponse,
)

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "feedback_summary.j2"


class FeedbackSummarizerAgent(BaseAgent):
    """AI agent that summarizes interview feedback for a candidate."""

    def __init__(self):
        super().__init__(agent_name="feedback_summarizer")
        self._template = Template(PROMPT_TEMPLATE_PATH.read_text())

    def _build_system_prompt(self, request: SummarizeFeedbackRequest) -> str:
        ctx = request.applicationContext
        return self._template.render(
            candidate_name=ctx.candidateName,
            role=ctx.role,
            department=ctx.department,
            plan_title=ctx.planTitle,
            feedbacks=[fb.model_dump() for fb in request.feedbacks],
        )

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

    async def summarize(self, request: SummarizeFeedbackRequest) -> FeedbackSummaryResponse:
        system_prompt = self._build_system_prompt(request)
        user_prompt = "Analyze the feedback and generate the summary now. Return ONLY the JSON object."

        response = await self.call_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=4096,
        )

        raw_text = response.get("content", "")

        try:
            parsed = self._parse_json_response(raw_text)
        except ValueError:
            logger.warning("First JSON parse failed, retrying with fix prompt")
            retry_response = await self.call_claude(
                system_prompt="You previously generated invalid JSON. Fix the following text and return ONLY valid JSON.",
                user_prompt=f"Fix this JSON:\n\n{raw_text}",
                max_tokens=4096,
            )
            raw_text = retry_response.get("content", "")
            parsed = self._parse_json_response(raw_text)

        return FeedbackSummaryResponse.model_validate(parsed)
