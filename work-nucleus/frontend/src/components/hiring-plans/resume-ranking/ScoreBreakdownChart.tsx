"use client";

import React from "react";

interface DimensionScore {
  score: number;
  maxScore: number;
  evidence: string[];
  comment: string;
  criteria?: Array<{
    id: string;
    text: string;
    finding: string;
    score: number;
    maxPoints: number;
    required: boolean;
    qualification: string;
    explanation: string;
    evidence: Array<{ id: string; text: string }>;
    jdEvidence?: Array<{ id: string; text: string }>;
  }>;
}

interface ScoreBreakdown {
  skillsMatch: DimensionScore;
  experienceRelevance: DimensionScore;
  projectRelevance: DimensionScore;
  educationCertifications: DimensionScore;
  domainIndustryFit: DimensionScore;
  roleSeniorityFit: DimensionScore;
  culturalSoftSignals: DimensionScore;
  logisticsAvailability: DimensionScore;
}

const DIMENSION_CONFIG: Array<{
  key: keyof ScoreBreakdown;
  label: string;
  icon: string;
}> = [
  { key: "skillsMatch", label: "Skills Match", icon: "🛠️" },
  { key: "experienceRelevance", label: "Experience", icon: "💼" },
  { key: "projectRelevance", label: "Projects", icon: "📂" },
  { key: "educationCertifications", label: "Education", icon: "🎓" },
  { key: "domainIndustryFit", label: "Domain Fit", icon: "🏢" },
  { key: "roleSeniorityFit", label: "Seniority", icon: "📊" },
  { key: "culturalSoftSignals", label: "Cultural", icon: "🤝" },
  { key: "logisticsAvailability", label: "Location and work model", icon: "📍" },
];

function barColor(ratio: number): string {
  if (ratio >= 0.8) return "bg-emerald-500";
  if (ratio >= 0.6) return "bg-blue-500";
  if (ratio >= 0.4) return "bg-amber-500";
  return "bg-red-400";
}

interface ScoreBreakdownChartProps {
  reviewContext?: { source: "QUICK" | "MANDATE"; recordId: string; candidateId: string };
  scoreBreakdown: ScoreBreakdown;
  compact?: boolean;
  showEvidence?: boolean;
}

function FindingCorrection({ context, id, original }: {
  context: NonNullable<ScoreBreakdownChartProps["reviewContext"]>; id: string; original: string;
}) {
  const [finding, setFinding] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/resume-ranking/corrections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, requirementId: id, finding }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch { setStatus("error"); }
  };
  return <div className="mt-2">
    <label>Recruiter review <select aria-label="Correct evidence classification" value={finding} onChange={(e) => { setFinding(e.target.value); setStatus("idle"); }}>
      <option value="">Record a correction…</option>
      {["DEMONSTRATED","PARTIAL","PLAUSIBLE","TEAM_CONTEXT","LISTED_ONLY","NO_EVIDENCE","EXPLICIT_MISMATCH"].filter((f) => f !== original)
        .map((f) => <option key={f} value={f}>{f.toLowerCase().replace(/_/g, " ")}</option>)}
    </select></label>
    {finding && <button type="button" className="ml-2 text-blue-700" disabled={status === "saving" || status === "saved"} onClick={save}>
      {status === "saved" ? "Correction recorded" : status === "saving" ? "Saving…" : "Save review"}
    </button>}
    {status === "error" && <span role="alert"> Could not record the correction. Please retry.</span>}
  </div>;
}

export default function ScoreBreakdownChart({
  reviewContext,
  scoreBreakdown,
  compact = false,
  showEvidence = false,
}: ScoreBreakdownChartProps) {
  if (!scoreBreakdown) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {DIMENSION_CONFIG.map(({ key, label, icon }) => {
        const dim = scoreBreakdown[key];
        const eligibilityCheck = key === "educationCertifications" || key === "logisticsAvailability";
        if (key === "logisticsAvailability" && !dim?.criteria?.length) return null;
        if (!dim || (dim.criteria && dim.maxScore === 0 && dim.criteria.length === 0)) return null;

        const rawComment = (dim.comment || "").trim();
        const commentLower = rawComment.toLowerCase();

        const isExplicitConflict =
          commentLower.includes("conflict") ||
          commentLower.includes("mismatch") ||
          commentLower.includes("cannot") ||
          commentLower.includes("unwilling") ||
          commentLower.includes("refused") ||
          commentLower.includes("unavailable");

        // Omitted / not mentioned signals (e.g. logistics omitted in resume)
        const isUnspecified =
          !dim.criteria &&
          dim.score === 0 &&
          !isExplicitConflict &&
          (commentLower.includes("neutral") ||
            commentLower.includes("not specified") ||
            commentLower.includes("not mentioned") ||
            commentLower.includes("unspecified") ||
            commentLower.includes("no info") ||
            commentLower.includes("n/a") ||
            commentLower === "neutral." ||
            commentLower === "" ||
            key === "logisticsAvailability");

        const displayComment =
          isUnspecified && (commentLower === "neutral." || commentLower === "neutral" || !rawComment)
            ? "Not specified in resume"
            : rawComment;

        const ratio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0;
        const pct = isUnspecified ? 0 : Math.round(ratio * 100);

        return (
          <div key={key}>
            <div className="flex items-center gap-2">
              {!compact && <span className="text-sm">{icon}</span>}
              <span
                className={`${
                  compact ? "text-[11px] w-16" : "text-xs w-24"
                } text-gray-600 shrink-0`}
              >
                {label}
              </span>
              {!eligibilityCheck && <div
                className={`flex-1 ${
                  compact ? "h-2" : "h-3"
                } bg-gray-100 print:bg-slate-100 print:border print:border-slate-300 rounded-full overflow-hidden`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isUnspecified ? "bg-slate-200" : barColor(ratio)
                  }`}
                  style={{
                    width: `${pct}%`,
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                  }}
                />
              </div>}
              <span
                className={`${
                  compact ? "text-[10px]" : "text-xs"
                } ${
                  isUnspecified
                    ? "font-medium text-slate-400"
                    : "font-mono text-gray-700"
                } ml-auto w-10 text-right shrink-0`}
                title={isUnspecified ? "Not specified in resume (neutral)" : undefined}
              >
                {eligibilityCheck ? 'Checks' : isUnspecified ? "N/A" : `${dim.score}/${dim.maxScore}`}
              </span>
            </div>
            {showEvidence && displayComment && !dim.criteria && (
              <p
                className={`text-[11px] ${
                  isUnspecified ? "text-slate-400 italic" : "text-gray-500"
                } ml-8 mt-0.5`}
              >
                {displayComment}
              </p>
            )}
            {showEvidence && dim.criteria && (
              <div className="ml-8 mt-2 space-y-2">
                {dim.criteria.map((criterion) => (
                  <details key={criterion.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <summary className="cursor-pointer text-slate-800">
                      {criterion.text} · {eligibilityCheck
                        ? `${criterion.required ? 'Required' : 'Relaxed'} · ${criterion.qualification.replace(/_/g, ' ').toLowerCase()}`
                        : `${criterion.score}/${criterion.maxPoints} · ${criterion.finding.replace(/_/g, ' ').toLowerCase()}`}
                    </summary>
                    <p className="mt-2 text-slate-600">{criterion.explanation}</p>
                    {criterion.jdEvidence?.map((source) => (
                      <p key={source.id} className="mt-1 text-slate-500">JD requirement · {source.text}</p>
                    ))}
                    {criterion.required && !eligibilityCheck && (
                      <p className="mt-1 font-medium">Required · {criterion.qualification.replace(/_/g, ' ').toLowerCase()}</p>
                    )}
                    {criterion.evidence.map((source) => (
                      <blockquote key={source.id} className="mt-2 border-l-2 border-indigo-200 pl-2 text-slate-700">
                        “{source.text}” <span className="text-slate-400">[{source.id}]</span>
                      </blockquote>
                    ))}
                    {criterion.evidence.length === 0 && <p className="mt-1 text-slate-500">No supporting resume line was identified.</p>}
                    {reviewContext && <FindingCorrection context={reviewContext} id={criterion.id} original={criterion.finding} />}
                  </details>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { ScoreBreakdown, DimensionScore };
