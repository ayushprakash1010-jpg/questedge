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
  FileText,
  Briefcase,
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
  currentRole?: string;
  currentCompany?: string;
  experienceYears?: number | string;
  location?: string;
  skills?: string[];
  isDisqualified?: boolean;
  disqualificationReason?: string;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function verdictBadge(verdict: string, score?: number, isDisqualified?: boolean) {
  if (isDisqualified) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-rose-50 border-rose-300 text-rose-700">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        Knocked Out
      </span>
    );
  }

  let effectiveVerdict = verdict;
  if (typeof score === "number" && !isNaN(score)) {
    if (score >= 85) effectiveVerdict = "EXCELLENT_FIT";
    else if (score >= 70) effectiveVerdict = "STRONG_FIT";
    else if (score >= 55) effectiveVerdict = "PARTIAL_FIT";
    else effectiveVerdict = "WEAK_FIT";
  }

  const map: Record<string, { bg: string; text: string; label: string }> = {
    EXCELLENT_FIT: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Excellent Fit" },
    STRONG_FIT: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Strong Fit" },
    GOOD_FIT: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Strong Fit" },
    PARTIAL_FIT: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Moderate Fit" },
    WEAK_FIT: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", label: "Weak Fit / Mismatch" },
  };
  const v = map[effectiveVerdict] || map.PARTIAL_FIT;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${v.bg} ${v.text}`}>
      {v.label}
    </span>
  );
}

function scoreBadgeColor(score: number, isDisqualified?: boolean): string {
  if (isDisqualified) return "text-rose-700 bg-rose-50 border-rose-300";
  if (score >= 85) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 70) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 55) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
}

function getCardTierClasses(score: number, isDisqualified?: boolean): { leftBorder: string } {
  if (isDisqualified) return { leftBorder: "border-l-rose-500" };
  if (score >= 85) return { leftBorder: "border-l-emerald-500" };
  if (score >= 70) return { leftBorder: "border-l-blue-500" };
  if (score >= 55) return { leftBorder: "border-l-amber-500" };
  return { leftBorder: "border-l-rose-500" };
}

export function formatCandidateName(name?: string): string {
  if (!name) return "Candidate";
  const trimmed = name.trim();
  const lettersOnly = trimmed.replace(/[^A-Za-z]/g, "");
  if (
    lettersOnly.length > 0 &&
    (lettersOnly === lettersOnly.toUpperCase() ||
      lettersOnly === lettersOnly.toLowerCase())
  ) {
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return trimmed;
}

function getSubtitle(c: RankedCandidateData): string {
  const parts: string[] = [];
  if (c.currentRole && c.currentCompany) {
    parts.push(`${c.currentRole} @ ${c.currentCompany}`);
  } else if (c.currentRole) {
    parts.push(c.currentRole);
  } else if (c.currentCompany) {
    parts.push(c.currentCompany);
  }

  if (c.experienceYears !== undefined && c.experienceYears !== null && c.experienceYears !== "") {
    const yrStr = String(c.experienceYears).trim();
    parts.push(yrStr.toLowerCase().includes("exp") || yrStr.toLowerCase().includes("yr") ? yrStr : `${yrStr} yrs exp`);
  } else if (c.scoreBreakdown?.experienceRelevance?.evidence?.[0]) {
    parts.push(c.scoreBreakdown.experienceRelevance.evidence[0]);
  }

  if (c.location) {
    parts.push(c.location);
  }

  return parts.join(" • ");
}

function getTopSkills(c: RankedCandidateData): string[] {
  if (Array.isArray(c.skills) && c.skills.length > 0) {
    return c.skills.slice(0, 3);
  }
  if (Array.isArray(c.scoreBreakdown?.skillsMatch?.evidence)) {
    const extracted: string[] = [];
    for (const ev of c.scoreBreakdown.skillsMatch.evidence) {
      if (typeof ev === "string") {
        const cleaned = ev
          .replace(/^(strong|deep|hands-on|good|solid|proven)\s+/i, "")
          .replace(/\s+(skills|proficiency|expertise|experience|knowledge)$/i, "")
          .trim();
        if (cleaned && cleaned.length <= 25) extracted.push(cleaned);
      }
    }
    if (extracted.length > 0) return extracted.slice(0, 3);
  }
  return [];
}

interface RankedCandidateCardProps {
  reviewRecord?: {source: "QUICK" | "MANDATE"; recordId: string};
  candidate: RankedCandidateData;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onViewResume?: () => void;
  isCompared?: boolean;
  onToggleCompare?: () => void;
  isHighlighted?: boolean;
}

export default function RankedCandidateCard({
  reviewRecord,
  candidate,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggleExpand,
  onViewResume,
  isCompared = false,
  onToggleCompare,
  isHighlighted = false,
}: RankedCandidateCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };
  const [copied, setCopied] = useState(false);
  const c = candidate;
  const displayName = formatCandidateName(c.candidateName);

  const handleCopySummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    const summaryText = [
      `Candidate: ${displayName} (Rank #${c.rank})`,
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

  const isDisqualified = Boolean(
    c.isDisqualified || (c.scoreBreakdown as any)?.isDisqualified
  );
  const disqualificationReason =
    c.disqualificationReason ||
    (c.scoreBreakdown as any)?.disqualificationReason ||
    "Did not meet required criteria";

  const subtitle = getSubtitle(c);
  const topSkills = getTopSkills(c);
  const topStrength = c.strengths && c.strengths.length > 0 ? c.strengths[0] : null;
  const tier = getCardTierClasses(c.totalScore, isDisqualified);

  let borderStateClass = `border-gray-200 shadow-xs hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 ${
    isDisqualified
      ? "bg-rose-50/25 border-rose-200"
      : c.rank === 1
      ? "bg-gradient-to-r from-emerald-50/15 via-white to-white"
      : "bg-white"
  }`;

  if (isHighlighted) {
    borderStateClass =
      "border-indigo-500 ring-4 ring-indigo-400/30 shadow-lg shadow-indigo-500/10 scale-[1.008] bg-white";
  } else if (isCompared) {
    borderStateClass =
      "border-indigo-300 bg-indigo-50/25 ring-2 ring-indigo-500/20 shadow-xs hover:shadow-md hover:-translate-y-0.5";
  }

  return (
    <div
      id={`candidate-card-${c.candidateId}`}
      className={`rounded-xl border border-l-4 ${tier.leftBorder} ${borderStateClass} transition-all duration-200 ease-out print:shadow-none print:border-slate-300 print:bg-white print:transform-none break-inside-avoid print:mb-5`}
    >
      {/* Primary Card Bar (clickable to toggle expand) */}
      <div
        className="px-5 py-3.5 cursor-pointer print:cursor-default"
        onClick={toggle}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Checkbox + Rank Medal + Name/Badges + Subtitle */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Compare Checkbox */}
            {onToggleCompare && (
              <button
                type="button"
                role="checkbox"
                aria-checked={Boolean(isCompared)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onToggleCompare();
                }}
                className={`mt-1 shrink-0 flex items-center justify-center w-4.5 h-4.5 rounded border transition-all print:hidden cursor-pointer ${
                  isCompared
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                    : "bg-white border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
                }`}
                title={isCompared ? "Deselect candidate" : "Select candidate to compare (up to 4)"}
              >
                {isCompared && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
            )}

            {/* Rank Medal / Number */}
            <div className="flex flex-col items-center justify-center shrink-0 w-8 pt-0.5">
              <span
                className={`leading-none font-bold ${
                  isDisqualified
                    ? "text-xs font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300"
                    : "text-xl sm:text-2xl text-slate-800"
                }`}
              >
                {isDisqualified ? "KO" : (MEDAL[c.rank] || `#${c.rank}`)}
              </span>
            </div>

            {/* Name, Fit Badge, Subtitle */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {displayName}
                </h3>
                {verdictBadge(c.verdict, c.totalScore, isDisqualified)}
                {(c.scoreBreakdown as any)?.eligibility === 'NEEDS_VERIFICATION' && (
                  <span className="text-xs font-medium text-amber-700">Required conditions need verification</span>
                )}
              </div>

              {isDisqualified && (
                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <span className="font-semibold text-rose-700">Failed Required:</span>
                  <span className="truncate">{disqualificationReason}</span>
                </div>
              )}

              {subtitle ? (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate mt-0.5">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{subtitle}</span>
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Evaluated Candidate</p>
              )}
            </div>
          </div>

          {/* Right: Score Pill & Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {onViewResume && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewResume();
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg border border-indigo-200 font-medium transition-colors cursor-pointer print:hidden"
                title="View original resume"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px]">View Resume</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopySummary}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer print:hidden"
              title="Copy evaluation summary for Slack/Email"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 text-[11px] font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px]">Copy Summary</span>
                </>
              )}
            </button>

            <span
              className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold border ${scoreBadgeColor(
                c.totalScore,
                isDisqualified
              )}`}
            >
              {Math.round(c.totalScore)}/100
            </span>

            <div className="text-gray-400 pl-1 print:hidden">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </div>
          </div>
        </div>

        {/* Collapsed Signal Strip (ONLY visible when collapsed, hidden when expanded and hidden in print) */}
        {!isExpanded && (
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 print:hidden">
            {/* Top 3 Skill Chips */}
            {topSkills.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {topSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : <div />}

            {/* Top 1 Strength Preview */}
            {topStrength && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate min-w-0 flex-1 justify-end">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate italic max-w-md">{topStrength}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded details (shown on screen when expanded, ALWAYS visible in print so all candidates show full details) */}
      <div
        className={`border-t border-gray-100 print:border-slate-200 px-5 py-4 space-y-4 ${
          isExpanded ? "block" : "hidden print:block"
        }`}
      >
        {/* Contact links row */}
        {(c.email || c.phone || c.linkedin || c.github) && (
          <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-gray-100">
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                title={`Email ${displayName}`}
              >
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="truncate max-w-[160px] print:max-w-none">{c.email}</span>
              </a>
            )}
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                title={`Call ${displayName}`}
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
        )}

        {/* Strengths & Gaps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Strengths */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Strengths
            </h4>
            <div className="space-y-1.5">
              {(c.strengths || []).map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gaps */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Gaps & Missing Areas
            </h4>
            <div className="space-y-1.5">
              {(c.gaps || []).map((g, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed"
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
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Standout Factors
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(c.standoutFactors || []).map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50/80 border border-amber-200 rounded-lg text-xs font-medium text-amber-900"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Why This Rank */}
        {c.comparisonNote && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Why this rank
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">{c.comparisonNote}</p>
          </div>
        )}

        {/* Recommendation */}
        {c.recommendation && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
            <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
              Recommendation
            </h4>
            <p className="text-xs text-blue-900 leading-relaxed">{c.recommendation}</p>
          </div>
        )}

        {/* Detailed Score Breakdown */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Scoring Evidence and Qualification Checks
          </h4>
          <ScoreBreakdownChart
            reviewContext={reviewRecord ? {...reviewRecord, candidateId: c.candidateId} : undefined}
            scoreBreakdown={c.scoreBreakdown}
            showEvidence
          />
        </div>
      </div>
    </div>
  );
}

export type { RankedCandidateData };
