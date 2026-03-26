import json
import logging
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.communication import (
    DraftCommunicationRequest,
    DraftCommunicationResponse,
)

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "communication_draft.j2"


class CommunicationDrafterAgent(BaseAgent):
    """AI agent that drafts selection/rejection communication emails."""

    def __init__(self):
        super().__init__(agent_name="communication_drafter")
        self._template = Template(PROMPT_TEMPLATE_PATH.read_text())

    def _build_system_prompt(self, request: DraftCommunicationRequest) -> str:
        return self._template.render(
            candidate_name=request.candidate.name,
            candidate_email=request.candidate.email,
            role=request.role,
            department=request.department,
            company=request.company,
            decision=request.decision,
            feedback_tone=request.feedbackTone,
            offer_details=request.offerDetails.model_dump() if request.offerDetails else None,
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

    async def draft(self, request: DraftCommunicationRequest) -> DraftCommunicationResponse:
        system_prompt = self._build_system_prompt(request)
        user_prompt = "Draft the email now. Return ONLY the JSON object."

        response = await self.call_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=2048,
        )

        raw_text = response.get("content", "")

        try:
            parsed = self._parse_json_response(raw_text)
        except ValueError:
            logger.warning("First JSON parse failed, retrying")
            retry_response = await self.call_claude(
                system_prompt="Fix this JSON and return ONLY valid JSON with 'subject' and 'body' keys.",
                user_prompt=f"Fix this JSON:\n\n{raw_text}",
                max_tokens=2048,
            )
            raw_text = retry_response.get("content", "")
            parsed = self._parse_json_response(raw_text)

        return DraftCommunicationResponse.model_validate(parsed)
