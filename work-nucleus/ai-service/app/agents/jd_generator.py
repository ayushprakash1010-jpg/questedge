import json
import logging
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.jd import (
    GenerateJdRequest,
    GenerateJdResponse,
    JdContent,
    FitmentMapping,
    EvaluationParameters,
)

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "jd_system.j2"


class JdGeneratorAgent(BaseAgent):
    """AI agent that generates structured job descriptions from hiring plan data."""

    def __init__(self):
        super().__init__(agent_name="jd_generation")
        self._template = Template(PROMPT_TEMPLATE_PATH.read_text())

    def _build_system_prompt(self, request: GenerateJdRequest) -> str:
        plan = request.hiringPlan

        must_have = [s for s in request.skills if s.priority == "MUST_HAVE"]
        nice_to_have = [s for s in request.skills if s.priority == "NICE_TO_HAVE"]

        return self._template.render(
            title=plan.title,
            designation=plan.designation,
            industry=plan.industry,
            department=plan.department,
            quarter=plan.quarter,
            year=plan.year,
            total_roles=plan.totalRoles,
            budget_min=plan.budgetMin,
            budget_max=plan.budgetMax,
            currency=plan.currency,
            reporting_manager_name=plan.reportingManagerName,
            hod_name=plan.hodName,
            team_size=plan.teamSize,
            team_levels=plan.teamLevels,
            organization_name=plan.organizationName,
            must_have_skills=[s.model_dump() for s in must_have],
            nice_to_have_skills=[s.model_dump() for s in nice_to_have],
            benefits=plan.benefits,
            additional_context=request.additionalContext,
        )

    def _parse_json_response(self, text: str) -> dict:
        """Extract and parse JSON from the response text."""
        # Try direct parse first
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code block
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

        # Try finding the outermost braces
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

        raise ValueError("Failed to parse JSON from AI response")

    async def generate(self, request: GenerateJdRequest) -> GenerateJdResponse:
        system_prompt = self._build_system_prompt(request)
        user_prompt = "Generate the job description now. Return ONLY the JSON object."

        response = await self.call_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=4096,
        )

        raw_text = response.get("content", "")

        # First attempt to parse
        try:
            parsed = self._parse_json_response(raw_text)
        except ValueError:
            # Retry once with a "fix your JSON" follow-up
            logger.warning("First JSON parse failed, retrying with fix prompt")
            retry_response = await self.call_claude(
                system_prompt="You previously generated invalid JSON. Fix the following text and return ONLY valid JSON matching the schema.",
                user_prompt=f"Fix this JSON:\n\n{raw_text}",
                max_tokens=4096,
            )
            raw_text = retry_response.get("content", "")
            parsed = self._parse_json_response(raw_text)

        # Validate with Pydantic models
        content = JdContent.model_validate(parsed.get("content", {}))
        fitment = FitmentMapping.model_validate(parsed.get("fitmentMapping", {}))
        evaluation = EvaluationParameters.model_validate(parsed.get("evaluationParameters", {}))

        return GenerateJdResponse(
            content=content,
            fitmentMapping=fitment,
            evaluationParameters=evaluation,
        )
