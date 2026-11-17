import asyncio
import json
import logging
from pathlib import Path

from jinja2 import Template

from app.agents.base_agent import BaseAgent
from app.schemas.resume_ranking import (
    ResumeRankingRequest,
    ResumeRankingResponse,
    RankedCandidate,
    ScoreBreakdown,
    DimensionScore,
    ScoringWeights,
    JdCoverageStats,
)

logger = logging.getLogger(__name__)

INDIVIDUAL_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "resume_rank.j2"
COMPARE_TEMPLATE_PATH = Path(__file__).parent.parent / "prompts" / "resume_rank_compare.j2"


class ResumeRankerAgent(BaseAgent):
    """AI agent that ranks multiple candidate resumes against a job description using two-pass scoring."""

    def __init__(self):
        super().__init__(agent_name="resume_ranker")
        self._individual_template = Template(INDIVIDUAL_TEMPLATE_PATH.read_text())
        self._compare_template = Template(COMPARE_TEMPLATE_PATH.read_text())

    def _parse_json_response(self, text: str) -> dict:
        """Parse JSON from AI response, handling markdown code blocks and extra text."""
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

    async def rank(self, request: ResumeRankingRequest) -> ResumeRankingResponse:
        """Rank candidates using two-pass AI scoring."""
        weights = request.weights or ScoringWeights()
        candidates = request.candidates[: request.maxCandidates]

        # Pass 1: Score each candidate individually (parallel, batches of 5)
        individual_scores: list[dict] = []
        for i in range(0, len(candidates), 5):
            batch = candidates[i : i + 5]
            batch_results = await asyncio.gather(
                *[
                    self._score_single(c, request.jobDescription, request.skills, weights)
                    for c in batch
                ],
                return_exceptions=True,
            )
            for idx, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to score candidate {batch[idx].candidateId}: {result}")
                    # Add a fallback minimal score for failed candidates
                    individual_scores.append({
                        "candidateId": batch[idx].candidateId,
                        "candidateName": batch[idx].candidateName,
                        "totalScore": 0,
                        "verdict": "WEAK_FIT",
                        "scoreBreakdown": {},
                        "strengths": [],
                        "gaps": ["Scoring failed — could not evaluate this candidate"],
                        "standoutFactors": [],
                        "recommendation": "Unable to evaluate. Manual review required.",
                    })
                else:
                    individual_scores.append(result)

        # Pass 2: Comparative ranking
        if len(individual_scores) > 1:
            try:
                final = await self._comparative_rank(
                    individual_scores, request.jobDescription, request.skills, weights
                )
            except Exception as e:
                logger.error(f"Comparative ranking failed, using individual scores: {e}")
                # Fallback: sort by individual scores
                sorted_scores = sorted(
                    individual_scores, key=lambda x: x.get("totalScore", 0), reverse=True
                )
                for idx, s in enumerate(sorted_scores):
                    s["rank"] = idx + 1
                    s["comparisonNote"] = "Comparative analysis unavailable."
                final = {
                    "rankings": sorted_scores,
                    "summary": "Candidates ranked by individual scores (comparative analysis failed).",
                    "jdCoverage": self._compute_coverage(sorted_scores, request.skills),
                }
        else:
            # Single candidate, skip comparison
            if individual_scores:
                individual_scores[0]["rank"] = 1
                individual_scores[0]["comparisonNote"] = "Only candidate evaluated."
            final = {
                "rankings": individual_scores,
                "summary": "Single candidate evaluated against the JD.",
                "jdCoverage": self._compute_coverage(individual_scores, request.skills),
            }

        # Build response
        rankings: list[RankedCandidate] = []
        for r in final.get("rankings", []):
            try:
                ranked = RankedCandidate(
                    rank=r.get("rank", 0),
                    candidateId=r.get("candidateId", ""),
                    candidateName=r.get("candidateName", ""),
                    totalScore=max(0, min(100, r.get("totalScore", 0))),
                    verdict=r.get("verdict", "PARTIAL_FIT"),
                    scoreBreakdown=self._parse_breakdown(r.get("scoreBreakdown", {}), weights),
                    strengths=r.get("strengths", []),
                    gaps=r.get("gaps", []),
                    standoutFactors=r.get("standoutFactors", []),
                    comparisonNote=r.get("comparisonNote", ""),
                    recommendation=r.get("recommendation", ""),
                )
                rankings.append(ranked)
            except Exception as e:
                logger.warning(f"Failed to parse ranking for candidate: {e}")

        rankings.sort(key=lambda x: x.totalScore, reverse=True)
        for i, r in enumerate(rankings):
            r.rank = i + 1

        return ResumeRankingResponse(
            rankings=rankings,
            summary=final.get("summary", ""),
            jdCoverage=(
                JdCoverageStats(**final.get("jdCoverage", {}))
                if isinstance(final.get("jdCoverage"), dict)
                else JdCoverageStats()
            ),
        )

    async def _score_single(
        self, candidate, jd: dict, skills: list, weights: ScoringWeights
    ) -> dict:
        """Score a single candidate against the JD using the individual scoring template."""
        qualifications = jd.get("qualifications", {})

        system_prompt = self._individual_template.render(
            title=jd.get("title", ""),
            summary=jd.get("summary", ""),
            responsibilities=jd.get("responsibilities", []),
            required_qualifications=qualifications.get("required", []),
            preferred_qualifications=qualifications.get("preferred", []),
            skills=[s.model_dump() for s in skills],
            candidate_id=candidate.candidateId,
            candidate_name=candidate.candidateName,
            current_company=candidate.currentCompany,
            current_role=candidate.currentRole,
            experience_years=candidate.experienceYears,
            education=candidate.education,
            resume_text=candidate.resumeText[:6000],
            weights_skills_match=weights.skillsMatch,
            weights_experience_relevance=weights.experienceRelevance,
            weights_project_relevance=weights.projectRelevance,
            weights_education_certifications=weights.educationCertifications,
            weights_domain_industry_fit=weights.domainIndustryFit,
            weights_role_seniority_fit=weights.roleSeniorityFit,
            weights_cultural_soft_signals=weights.culturalSoftSignals,
            weights_logistics_availability=weights.logisticsAvailability,
        )

        user_prompt = (
            "Score this candidate's resume against the job description across all 8 dimensions. "
            "Return ONLY the JSON object."
        )

        response = await self.call_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=8192,
        )

        raw_text = response.get("content", "")

        try:
            parsed = self._parse_json_response(raw_text)
        except ValueError:
            logger.warning(
                f"First JSON parse failed for candidate {candidate.candidateId}, retrying"
            )
            retry_response = await self.call_claude(
                system_prompt="Fix this JSON and return ONLY valid JSON.",
                user_prompt=f"Fix this JSON:\n\n{raw_text}",
                max_tokens=8192,
            )
            raw_text = retry_response.get("content", "")
            parsed = self._parse_json_response(raw_text)

        # Ensure candidate identifiers are present
        parsed.setdefault("candidateId", candidate.candidateId)
        parsed.setdefault("candidateName", candidate.candidateName)

        return parsed

    async def _comparative_rank(
        self, individual_scores: list[dict], jd: dict, skills: list, weights: ScoringWeights
    ) -> dict:
        """Perform comparative ranking of all individually scored candidates."""
        # Build candidate summaries for the comparative template
        candidate_summaries = []
        for score in individual_scores:
            # Ensure scoreBreakdown has the structure expected by the template
            breakdown = score.get("scoreBreakdown", {})
            summary_entry = {
                "candidateId": score.get("candidateId", ""),
                "candidateName": score.get("candidateName", ""),
                "totalScore": score.get("totalScore", 0),
                "verdict": score.get("verdict", "PARTIAL_FIT"),
                "strengths": score.get("strengths", []),
                "gaps": score.get("gaps", []),
                "standoutFactors": score.get("standoutFactors", []),
                "recommendation": score.get("recommendation", ""),
                "scoreBreakdown": {
                    "skillsMatch": self._ensure_dimension(breakdown.get("skillsMatch", {}), weights.skillsMatch),
                    "experienceRelevance": self._ensure_dimension(breakdown.get("experienceRelevance", {}), weights.experienceRelevance),
                    "projectRelevance": self._ensure_dimension(breakdown.get("projectRelevance", {}), weights.projectRelevance),
                    "educationCertifications": self._ensure_dimension(breakdown.get("educationCertifications", {}), weights.educationCertifications),
                    "domainIndustryFit": self._ensure_dimension(breakdown.get("domainIndustryFit", {}), weights.domainIndustryFit),
                    "roleSeniorityFit": self._ensure_dimension(breakdown.get("roleSeniorityFit", {}), weights.roleSeniorityFit),
                    "culturalSoftSignals": self._ensure_dimension(breakdown.get("culturalSoftSignals", {}), weights.culturalSoftSignals),
                    "logisticsAvailability": self._ensure_dimension(breakdown.get("logisticsAvailability", {}), weights.logisticsAvailability),
                },
            }
            candidate_summaries.append(summary_entry)

        system_prompt = self._compare_template.render(
            title=jd.get("title", ""),
            summary=jd.get("summary", ""),
            skills=[s.model_dump() for s in skills] if skills else [],
            candidates=candidate_summaries,
        )

        user_prompt = (
            "Compare all candidates and produce the final ranked list with comparative notes. "
            "Return ONLY the JSON object."
        )

        response = await self.call_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=16384,
        )

        raw_text = response.get("content", "")

        try:
            parsed = self._parse_json_response(raw_text)
        except ValueError:
            logger.warning("First JSON parse failed for comparative ranking, retrying")
            retry_response = await self.call_claude(
                system_prompt="Fix this JSON and return ONLY valid JSON.",
                user_prompt=f"Fix this JSON:\n\n{raw_text}",
                max_tokens=16384,
            )
            raw_text = retry_response.get("content", "")
            parsed = self._parse_json_response(raw_text)

        return parsed

    def _ensure_dimension(self, raw: dict, max_score: int) -> dict:
        """Ensure a dimension dict has the required fields for template rendering."""
        if not isinstance(raw, dict):
            raw = {}
        return {
            "score": raw.get("score", 0),
            "maxScore": raw.get("maxScore", max_score),
            "evidence": raw.get("evidence", []),
            "comment": raw.get("comment", ""),
        }

    def _parse_breakdown(self, raw: dict, weights: ScoringWeights) -> ScoreBreakdown:
        """Parse a raw scoreBreakdown dict into a ScoreBreakdown with proper DimensionScore objects."""
        if not isinstance(raw, dict):
            raw = {}

        def _dim(key: str, max_score: int) -> DimensionScore:
            d = raw.get(key, {})
            if not isinstance(d, dict):
                d = {}
            return DimensionScore(
                score=max(0, min(max_score, d.get("score", 0))),
                maxScore=max_score,
                evidence=d.get("evidence", []) if isinstance(d.get("evidence"), list) else [],
                comment=d.get("comment", "") if isinstance(d.get("comment"), str) else "",
            )

        return ScoreBreakdown(
            skillsMatch=_dim("skillsMatch", weights.skillsMatch),
            experienceRelevance=_dim("experienceRelevance", weights.experienceRelevance),
            projectRelevance=_dim("projectRelevance", weights.projectRelevance),
            educationCertifications=_dim("educationCertifications", weights.educationCertifications),
            domainIndustryFit=_dim("domainIndustryFit", weights.domainIndustryFit),
            roleSeniorityFit=_dim("roleSeniorityFit", weights.roleSeniorityFit),
            culturalSoftSignals=_dim("culturalSoftSignals", weights.culturalSoftSignals),
            logisticsAvailability=_dim("logisticsAvailability", weights.logisticsAvailability),
        )

    def _compute_coverage(self, scores: list[dict], skills: list) -> dict:
        """Compute JD coverage statistics from individual scores."""
        must_have_skills = [s for s in skills if s.priority == "MUST_HAVE"]
        total_must_have = len(must_have_skills)

        if not scores:
            return {
                "totalMustHaveSkills": total_must_have,
                "avgMustHaveCoverage": 0.0,
                "strongFitCount": 0,
                "poolStrength": "WEAK",
            }

        # Estimate must-have coverage from skillsMatch scores
        coverages = []
        for s in scores:
            breakdown = s.get("scoreBreakdown", {})
            skills_dim = breakdown.get("skillsMatch", {})
            if isinstance(skills_dim, dict):
                score = skills_dim.get("score", 0)
                max_score = skills_dim.get("maxScore", 25)
                coverage = score / max_score if max_score > 0 else 0
            else:
                coverage = 0
            coverages.append(coverage)

        avg_coverage = sum(coverages) / len(coverages) if coverages else 0.0

        strong_verdicts = {"EXCELLENT_FIT", "STRONG_FIT"}
        strong_count = sum(1 for s in scores if s.get("verdict") in strong_verdicts)

        # Determine pool strength
        strong_ratio = strong_count / len(scores) if scores else 0
        if strong_ratio > 0.5:
            pool_strength = "EXCELLENT"
        elif strong_ratio >= 0.25:
            pool_strength = "GOOD"
        elif strong_count > 0:
            pool_strength = "FAIR"
        else:
            pool_strength = "WEAK"

        return {
            "totalMustHaveSkills": total_must_have,
            "avgMustHaveCoverage": round(avg_coverage, 2),
            "strongFitCount": strong_count,
            "poolStrength": pool_strength,
        }
