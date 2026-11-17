"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Star,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
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
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
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
  const [copied, setCopied] = useState(false);
  const c = candidate;

  const handleCopySummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    const summaryText = [
      `Candidate: ${c.candidateName} (Rank #${c.rank})`,
      `Score: ${Math.round(c.totalScore)}/100 • Verdict: ${c.verdict.replace(/_/g, " ")}`,
      c.email ? `Email: ${c.email}` : "",
      c.phone ? `Phone: ${c.phone}` : "",
      c.linkedin ? `LinkedIn: ${c.linkedin}` : "",
      c.github ? `GitHub: ${c.github}` : "",
      "",
      "Top Strengths:",
      ...(c.strengths || []).map((s) => `• ${s}`),
      "",
      "Identified Gaps:",
      ...(c.gaps || []).map((g) => `• ${g}`),
      c.recommendation ? `\nRecommendation: ${c.recommendation}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border-slate-300 break-inside-avoid print:mb-5">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer print:cursor-default"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <div className="flex flex-col items-center w-10 shrink-0">
          <span className="text-2xl leading-none">
            {MEDAL[c.rank] || `#${c.rank}`}
          </span>
        </div>

        {/* Name + verdict + contact links */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {c.candidateName}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {verdictBadge(c.verdict)}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                title={`Email ${c.candidateName}`}
              >
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="truncate max-w-[140px] print:max-w-none">{c.email}</span>
              </a>
            )}
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                title={`Call ${c.candidateName}`}
              >
                <Phone className="w-3 h-3 text-gray-400" />
                <span>{c.phone}</span>
              </a>
            )}
            {c.linkedin && (
              <a
                href={c.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                title="LinkedIn Profile"
              >
                <Globe className="w-3 h-3 text-blue-600" />
                <span>LinkedIn</span>
              </a>
            )}
            {c.github && (
              <a
                href={c.github}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded border border-gray-300 transition-colors"
                title="GitHub Profile"
              >
                <ExternalLink className="w-3 h-3 text-gray-700" />
                <span>GitHub</span>
              </a>
            )}
          </div>
        </div>

        {/* Score & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer print:hidden"
            title="Copy evaluation summary for Slack/Email"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 text-[11px] font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-gray-400" />
                <span className="text-[11px]">Copy Summary</span>
              </>
            )}
          </button>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold border ${scoreBadgeColor(
              c.totalScore
            )}`}
          >
            {Math.round(c.totalScore)}/100
          </span>
          <div className="print:hidden">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Compact breakdown (visible on screen when collapsed, hidden in print because full breakdown is printed below) */}
      <div className={`px-5 pb-3 ${expanded ? "hidden" : "block"} print:hidden`}>
        <ScoreBreakdownChart scoreBreakdown={c.scoreBreakdown} compact />
      </div>

      {/* Expanded details (shown on screen when expanded, ALWAYS visible in print so all candidates show full details) */}
      <div
        className={`border-t border-gray-100 print:border-slate-200 px-5 py-4 space-y-4 ${
          expanded ? "block" : "hidden print:block"
        }`}
      >
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded-full text-[11px] text-yellow-800 print:bg-yellow-50/70"
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
          <div className="bg-gray-50 rounded-lg p-3 print:bg-slate-50 print:border print:border-slate-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Why this rank
            </h4>
            <p className="text-xs text-gray-700">{c.comparisonNote}</p>
          </div>
        )}

        {/* Recommendation */}
        {c.recommendation && (
          <div className="bg-blue-50 rounded-lg p-3 print:bg-blue-50/60 print:border print:border-blue-200">
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
    </div>
  );
}

export type { RankedCandidateData };
