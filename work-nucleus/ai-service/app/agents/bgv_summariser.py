import json
import logging
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.bgv import BgvSummariseRequest, BgvSummariseResponse

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "bgv_summarise.j2"


class BgvSummariserAgent(BaseAgent):
    """AI agent that summarises BGV findings into a structured advisory.

    Output is *never* auto-actioned — every recommendation must be reviewed by a
    human before any candidate-facing action is taken.
    """

    def __init__(self):
        super().__init__(agent_name="bgv_summariser")
        self._template = Template(PROMPT_TEMPLATE_PATH.read_text())

    def _build_system_prompt(self, request: BgvSummariseRequest) -> str:
        return self._template.render(
            candidate_name=request.candidate.name,
            candidate_email=request.candidate.email,
            vendor=request.profile.vendor,
            risk_score=request.profile.riskScore,
            checks=[
                {
                    "type": c.type,
                    "status": c.status,
                    "finding": c.finding,
                    "report_url": c.reportUrl,
                }
                for c in request.checks
            ],
        )

    def _parse_json_response(self, text: str) -> dict:
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        if "```" in text:
            for part in text.split("```"):
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
        raise ValueError("Failed to parse BGV summariser JSON")

    async def summarise(self, request: BgvSummariseRequest) -> BgvSummariseResponse:
        system_prompt = self._build_system_prompt(request)
        user_prompt = "Produce the JSON advisory now. Return ONLY the JSON object."

        # Low temperature — this is high-stakes structured output, not creative writing
        response = await self.call_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=2048,
            temperature=0.1,
        )

        raw = response.get("content", "")
        try:
            parsed = self._parse_json_response(raw)
        except ValueError:
            logger.warning("BGV summariser parse failed, retrying with repair prompt")
            retry = await self.call_claude(
                system_prompt="Fix this JSON and return ONLY valid JSON matching the BGV summariser schema.",
                user_prompt=f"Fix this:\n\n{raw}",
                max_tokens=2048,
            )
            parsed = self._parse_json_response(retry.get("content", ""))

        return BgvSummariseResponse.model_validate(parsed)
