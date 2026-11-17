"use client";

import React, { useState } from "react";
import { X, Trophy, AlertTriangle, TrendingUp } from "lucide-react";

interface ComparisonCandidate {
  candidateId: string;
  candidateName: string;
  rank: number;
  totalScore: number;
  verdict: string;
  scores: Array<{
    dimension: string;
    score: number;
    maxScore: number;
    comment: string;
  }>;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

interface DimensionLeader {
  dimension: string;
  leader: string;
  score: number;
}

interface ComparisonViewProps {
  sessionId?: string;
  rankings: any[];
  onClose: () => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  skillsMatch: "Skills Match",
  experienceRelevance: "Experience",
  projectRelevance: "Projects",
  educationCertifications: "Education",
  domainIndustryFit: "Domain Fit",
  roleSeniorityFit: "Role Fit",
  culturalSoftSignals: "Culture",
  logisticsAvailability: "Logistics",
};

const VERDICT_COLORS: Record<string, string> = {
  EXCELLENT_FIT: "text-emerald-600 bg-emerald-50",
  STRONG_FIT: "text-blue-600 bg-blue-50",
  GOOD_FIT: "text-cyan-600 bg-cyan-50",
  PARTIAL_FIT: "text-amber-600 bg-amber-50",
  WEAK_FIT: "text-red-600 bg-red-50",
};

const CANDIDATE_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
];

export default function ComparisonView({
  sessionId,
  rankings,
  onClose,
}: ComparisonViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<{
    candidates: ComparisonCandidate[];
    dimensionLeaders: DimensionLeader[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // Max 4
      return [...prev, id];
    });
    setComparisonData(null);
  };

  const runComparison = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      if (sessionId) {
        const res = await fetch(
          `/api/resume-ranking/session/${sessionId}/compare`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateIds: selectedIds }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setComparisonData(data);
          return;
        }
      }

      // Standalone / client-side instant computation fallback
      const dims = [
        "skillsMatch",
        "experienceRelevance",
        "projectRelevance",
        "educationCertifications",
        "domainIndustryFit",
        "roleSeniorityFit",
        "culturalSoftSignals",
        "logisticsAvailability",
      ];

      const selected = rankings.filter((r: any) =>
        selectedIds.includes(String(r.candidateId || r.id))
      );

      const candidates: ComparisonCandidate[] = selected.map((r: any) => ({
        candidateId: String(r.candidateId || r.id),
        candidateName: r.candidateName,
        rank: r.rank,
        totalScore: Number(r.totalScore) || 0,
        verdict: r.verdict || "GOOD_FIT",
        scores: dims.map((dim) => ({
          dimension: dim,
          score: Number(r.scoreBreakdown?.[dim]?.score) || 0,
          maxScore: Number(r.scoreBreakdown?.[dim]?.maxScore) || 10,
          comment: r.scoreBreakdown?.[dim]?.comment || "",
        })),
        strengths: Array.isArray(r.strengths) ? r.strengths : [],
        gaps: Array.isArray(r.gaps) ? r.gaps : [],
        recommendation: r.recommendation || "",
      }));

      const dimensionLeaders: DimensionLeader[] = dims.map((dim) => {
        const scores = candidates.map((c) => ({
          name: c.candidateName,
          score: c.scores.find((s) => s.dimension === dim)?.score || 0,
        }));
        scores.sort((a, b) => b.score - a.score);
        return {
          dimension: dim,
          leader: scores[0]?.score > 0 ? scores[0]?.name : "Tie",
          score: scores[0]?.score || 0,
        };
      });

      setComparisonData({ candidates, dimensionLeaders });
    } catch (err: any) {
      setError(err.message || "Failed to compare candidates");
    } finally {
      setLoading(false);
    }
  };

  const dimensions = Object.keys(DIMENSION_LABELS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Side-by-Side Comparison
            </h2>
            <p className="text-sm text-gray-500">
              Select 2-4 candidates to compare
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Candidate Selector */}
        {!comparisonData && (
          <div className="p-6">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {rankings.map((r: any) => {
                const isSelected = selectedIds.includes(
                  r.candidateId || r.id
                );
                return (
                  <button
                    key={r.candidateId || r.id}
                    onClick={() =>
                      toggleCandidate(r.candidateId || r.id)
                    }
                    className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                        isSelected ? "bg-indigo-600" : "bg-gray-300"
                      }`}
                    >
                      #{r.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {r.candidateName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Score: {Number(r.totalScore).toFixed(0)}/100
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={runComparison}
                disabled={selectedIds.length < 2 || loading}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-300"
              >
                {loading ? "Comparing..." : `Compare ${selectedIds.length} Candidates`}
              </button>
              {selectedIds.length < 2 && (
                <span className="text-sm text-gray-500">
                  Select at least 2 candidates
                </span>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Comparison Results */}
        {comparisonData && (
          <div className="p-6">
            <button
              onClick={() => setComparisonData(null)}
              className="mb-4 text-sm text-indigo-600 hover:underline"
            >
              ← Select different candidates
            </button>

            {/* Score Bar Chart */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-40 p-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dimension
                    </th>
                    {comparisonData.candidates.map(
                      (c: ComparisonCandidate, i: number) => (
                        <th
                          key={c.candidateId}
                          className="p-3 text-center text-sm font-semibold"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`h-3 w-3 rounded-full ${CANDIDATE_COLORS[i]}`}
                            />
                            <span className="truncate max-w-[120px]">
                              {c.candidateName}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_COLORS[c.verdict] || "text-gray-600 bg-gray-50"}`}
                            >
                              {c.verdict.replace("_", " ")}
                            </span>
                          </div>
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dimensions.map((dim) => {
                    const leader = comparisonData.dimensionLeaders.find(
                      (l: DimensionLeader) => l.dimension === dim
                    );
                    return (
                      <tr key={dim} className="border-t">
                        <td className="p-3 text-sm font-medium text-gray-700">
                          {DIMENSION_LABELS[dim]}
                          {leader && (
                            <span className="ml-1 text-xs text-emerald-600">
                              👑
                            </span>
                          )}
                        </td>
                        {comparisonData.candidates.map(
                          (c: ComparisonCandidate, i: number) => {
                            const dimScore = c.scores.find(
                              (s) => s.dimension === dim
                            );
                            const score = dimScore?.score ?? 0;
                            const maxScore = dimScore?.maxScore ?? 10;
                            const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            const isLeader = leader?.leader === c.candidateName;

                            return (
                              <td key={c.candidateId} className="p-3">
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={`text-sm font-semibold ${isLeader ? "text-emerald-600" : "text-gray-700"}`}
                                  >
                                    {score}/{maxScore}
                                  </span>
                                  <div className="h-2 w-full max-w-[100px] rounded-full bg-gray-100">
                                    <div
                                      className={`h-2 rounded-full ${CANDIDATE_COLORS[i]}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  {dimScore?.comment && (
                                    <span className="text-xs text-gray-400 text-center line-clamp-1">
                                      {dimScore.comment}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          }
                        )}
                      </tr>
                    );
                  })}

                  {/* Total Score Row */}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="p-3 text-sm text-gray-900">Total Score</td>
                    {comparisonData.candidates.map(
                      (c: ComparisonCandidate) => (
                        <td
                          key={c.candidateId}
                          className="p-3 text-center text-lg text-gray-900"
                        >
                          {Number(c.totalScore).toFixed(0)}/100
                        </td>
                      )
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Strengths & Gaps */}
            <div className="grid gap-4 md:grid-cols-2">
              {comparisonData.candidates.map(
                (c: ComparisonCandidate, i: number) => (
                  <div
                    key={c.candidateId}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${CANDIDATE_COLORS[i]}`}
                      />
                      <h4 className="font-semibold text-gray-900">
                        {c.candidateName}
                      </h4>
                      <span className="ml-auto text-sm text-gray-500">
                        Rank #{c.rank}
                      </span>
                    </div>

                    {c.strengths.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <TrendingUp className="h-3 w-3" /> Strengths
                        </p>
                        <ul className="space-y-0.5">
                          {c.strengths.slice(0, 3).map((s, j) => (
                            <li
                              key={j}
                              className="text-xs text-gray-600"
                            >
                              • {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.gaps.length > 0 && (
                      <div className="mb-2">
                        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                          <AlertTriangle className="h-3 w-3" /> Gaps
                        </p>
                        <ul className="space-y-0.5">
                          {c.gaps.slice(0, 3).map((g, j) => (
                            <li
                              key={j}
                              className="text-xs text-gray-600"
                            >
                              • {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.recommendation && (
                      <p className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600 italic">
                        {c.recommendation}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
