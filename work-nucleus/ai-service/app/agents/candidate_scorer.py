import json
import logging
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.feedback import (
    ScoreCandidateRequest,
    ScoreCandidateResponse,
    CategoryBreakdown,
)

logger = logging.getLogger(__name__)

PROMPT_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "candidate_score.j2"

CATEGORY_MAP = {
    "TECHNICAL": "technical",
    "DOMAIN": "technical",
    "LEADERSHIP": "leadership",
    "BEHAVIOURAL": "behavioural",
    "COMMUNICATION": "communication",
}


class CandidateScorerAgent(BaseAgent):
    """AI agent that scores a candidate based on interview feedback with weighted categories."""

    def __init__(self):
        super().__init__(agent_name="candidate_scorer")
        self._template = Template(PROMPT_TEMPLATE_PATH.read_text())

    def _calculate_raw_score(self, request: ScoreCandidateRequest) -> tuple[float, list[CategoryBreakdown]]:
        """Calculate the raw weighted score from skill ratings."""
        weights = request.scoringWeights
        weight_map = {
            "technical": weights.technical,
            "leadership": weights.leadership,
            "behavioural": weights.behavioural,
            "communication": weights.communication,
        }

        # Collect all ratings grouped by category
        category_ratings: dict[str, list[int]] = {
            "technical": [],
            "leadership": [],
            "behavioural": [],
            "communication": [],
        }

        for fb in request.feedbacks:
            for sr in fb.skillRatings:
                mapped = CATEGORY_MAP.get(sr.category, "technical")
                category_ratings[mapped].append(sr.rating)

        # Also factor in overall ratings for categories with no skill ratings
        if not any(category_ratings.values()):
            avg_overall = sum(fb.overallRating for fb in request.feedbacks) / len(request.feedbacks)
            for cat in category_ratings:
                category_ratings[cat].append(round(avg_overall))

        breakdown = []
        total_weighted = 0
        total_weight = 0

        for cat, weight in weight_map.items():
            ratings = category_ratings[cat]
            if ratings:
                avg = sum(ratings) / len(ratings)
            else:
                # Use overall rating as fallback
                avg = sum(fb.overallRating for fb in request.feedbacks) / len(request.feedbacks)

            # Convert 1-5 rating to 0-100 scale for this category
            score_100 = (avg / 5) * 100
            weighted = score_100 * (weight / 100)
            total_weighted += weighted
            total_weight += weight

            breakdown.append(CategoryBreakdown(
                category=cat,
                score=round(avg, 2),
                weight=weight,
                weightedScore=round(weighted, 2),
            ))

        raw_score = round(total_weighted, 2) if total_weight > 0 else 0
        return raw_score, breakdown

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

    async def score(self, request: ScoreCandidateRequest) -> ScoreCandidateResponse:
        raw_score, breakdown = self._calculate_raw_score(request)

        ctx = request.applicationContext
        system_prompt = self._template.render(
            candidate_name=ctx.candidateName,
            role=ctx.role,
            department=ctx.department,
            raw_score=raw_score,
            breakdown=[b.model_dump() for b in breakdown],
            feedbacks=[fb.model_dump() for fb in request.feedbacks],
        )

        user_prompt = "Review the score and feedback, then provide your qualitative adjustment. Return ONLY the JSON object."

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
                system_prompt="Fix this JSON and return ONLY valid JSON.",
                user_prompt=f"Fix this JSON:\n\n{raw_text}",
                max_tokens=2048,
            )
            raw_text = retry_response.get("content", "")
            parsed = self._parse_json_response(raw_text)

        # Apply adjustment
        adjusted_score = parsed.get("adjustedScore", raw_score)
        adjusted_score = max(0, min(100, adjusted_score))

        return ScoreCandidateResponse(
            score=round(adjusted_score, 2),
            breakdown=breakdown,
            confidence=parsed.get("confidence", "medium"),
            keyFactors=parsed.get("keyFactors", []),
        )
