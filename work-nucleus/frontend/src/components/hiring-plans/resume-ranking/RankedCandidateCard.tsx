"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Star } from "lucide-react";
import ScoreBreakdownChart, { type ScoreBreakdown } from "./ScoreBreakdownChart";

interface RankedCandidateData {
  rank: number;
  candidateId: string;
  candidateName: string;
  totalScore: number;
  verdict: string;
  scoreBreakdown: ScoreBreakdown;
  strengths: string[];
  gaps: string[];
  standoutFactors: string[];
  comparisonNote: string;
  recommendation: string;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function verdictBadge(verdict: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    EXCELLENT_FIT: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Excellent Fit" },
    STRONG_FIT: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Strong Fit" },
    GOOD_FIT: { bg: "bg-teal-50 border-teal-200", text: "text-teal-700", label: "Good Fit" },
    PARTIAL_FIT: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Partial Fit" },
    WEAK_FIT: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Weak Fit" },
  };
  const v = map[verdict] || map.PARTIAL_FIT;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${v.bg} ${v.text}`}>
      {v.label}
    </span>
  );
}

function scoreBadgeColor(score: number): string {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

interface RankedCandidateCardProps {
  candidate: RankedCandidateData;
  defaultExpanded?: boolean;
}

export default function RankedCandidateCard({
  candidate,
  defaultExpanded = false,
}: RankedCandidateCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const c = candidate;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <div className="flex flex-col items-center w-10 shrink-0">
          <span className="text-2xl leading-none">
            {MEDAL[c.rank] || `#${c.rank}`}
          </span>
        </div>

        {/* Name + verdict */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {c.candidateName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {verdictBadge(c.verdict)}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold border ${scoreBadgeColor(
              c.totalScore
            )}`}
          >
            {Math.round(c.totalScore)}/100
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Compact breakdown (always visible) */}
      <div className="px-5 pb-3">
        <ScoreBreakdownChart scoreBreakdown={c.scoreBreakdown} compact />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Strengths & Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strengths */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Strengths
              </h4>
              <div className="space-y-1">
                {(c.strengths || []).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-gray-700"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Gaps
              </h4>
              <div className="space-y-1">
                {(c.gaps || []).map((g, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-gray-700"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Standout Factors */}
          {c.standoutFactors && c.standoutFactors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Standout Factors
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(c.standoutFactors || []).map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded-full text-[11px] text-yellow-800"
                  >
                    <Star className="w-3 h-3" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Why This Rank */}
          {c.comparisonNote && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Why this rank
              </h4>
              <p className="text-xs text-gray-700">{c.comparisonNote}</p>
            </div>
          )}

          {/* Recommendation */}
          {c.recommendation && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-600 uppercase mb-1">
                Recommendation
              </h4>
              <p className="text-xs text-gray-700">{c.recommendation}</p>
            </div>
          )}

          {/* Detailed Score Breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Detailed Score Breakdown
            </h4>
            <ScoreBreakdownChart
              scoreBreakdown={c.scoreBreakdown}
              showEvidence
            />
          </div>
        </div>
      )}
    </div>
  );
}

export type { RankedCandidateData };
