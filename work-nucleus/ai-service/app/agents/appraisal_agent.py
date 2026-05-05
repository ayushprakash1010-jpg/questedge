import json
import logging
from collections import Counter
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.appraisal import (
    AppraisalSummaryRequest,
    AppraisalSummaryResponse,
    PeerFeedbackThemesRequest,
    PeerFeedbackThemesResponse,
)

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "appraisal_summary.j2"


class AppraisalAgent(BaseAgent):
    """Combines two related advisory flows: manager-review summary and peer
    feedback theme extraction. Both keep the manager firmly in the loop."""

    def __init__(self):
        super().__init__(agent_name="appraisal_agent")
        self._summary_template = Template(PROMPT_PATH.read_text())

    def _parse_json(self, text: str) -> dict:
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
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise ValueError("Failed to parse appraisal JSON")

    async def summarise(self, req: AppraisalSummaryRequest) -> AppraisalSummaryResponse:
        self_summary = (req.self or {}).get("selfSummary") if isinstance(req.self, dict) else None
        manager_summary = (req.manager or {}).get("managerSummary") if isinstance(req.manager, dict) else None
        system_prompt = self._summary_template.render(
            cycle_id=req.cycleId,
            employee_id=req.employeeId,
            goal_count=len(req.goals),
            self_summary=self_summary,
            manager_summary=manager_summary,
            peer_count=req.peerFeedbackCount,
            goals=[
                {
                    "title": g.get("title"),
                    "weight": g.get("weight"),
                    "selfRating": g.get("selfRating"),
                    "managerRating": g.get("managerRating"),
                }
                for g in req.goals
                if isinstance(g, dict)
            ],
        )

        try:
            response = await self.call_claude(
                system_prompt=system_prompt,
                user_prompt="Produce the JSON now. Return ONLY the JSON object.",
                max_tokens=1024,
                temperature=0.2,
            )
            parsed = self._parse_json(response.get("content", ""))
            return AppraisalSummaryResponse.model_validate(parsed)
        except Exception as err:
            logger.warning("Appraisal summary failed: %s; using fallback", err)
            return AppraisalSummaryResponse(
                strengths=["Goals captured for the cycle"],
                growth_areas=["Insufficient data for AI advisory"],
                suggested_rating_range=[3, 4],
                suggested_comment="AI summariser unavailable; please draft manually.",
            )

    async def peer_themes(self, req: PeerFeedbackThemesRequest) -> PeerFeedbackThemesResponse:
        # Lightweight client-side aggregation when the payload is small —
        # avoids burning a Claude call for trivial summaries.
        if len(req.responses) < 5:
            return self._rule_based_themes(req)

        system_prompt = (
            "You are an HR analyst aggregating anonymous peer feedback. "
            "Output JSON: { \"themes\": [<3-6 short phrases>], "
            "\"quotes\": [<2-4 verbatim phrases that capture the most common signals, NEVER reveal names>] }. "
            "Never invent feedback that isn't in the responses."
        )
        user_prompt = "Responses:\n" + json.dumps(req.responses)[:4000]
        try:
            response = await self.call_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=1024,
                temperature=0.2,
            )
            parsed = self._parse_json(response.get("content", ""))
            return PeerFeedbackThemesResponse.model_validate(parsed)
        except Exception as err:
            logger.warning("Peer themes failed: %s", err)
            return self._rule_based_themes(req)

    def _rule_based_themes(self, req: PeerFeedbackThemesRequest) -> PeerFeedbackThemesResponse:
        text = " ".join(
            str(v).lower()
            for r in req.responses
            for v in (r.values() if isinstance(r, dict) else [r])
            if isinstance(v, str)
        )
        words = [w for w in __import__("re").findall(r"\b[a-z]{4,}\b", text) if len(w) > 3]
        common = [w for w, c in Counter(words).most_common(8) if c >= 2]
        return PeerFeedbackThemesResponse(themes=common, quotes=[])
