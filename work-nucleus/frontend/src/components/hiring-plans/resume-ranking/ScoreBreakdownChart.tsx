"use client";

import React from "react";

interface DimensionScore {
  score: number;
  maxScore: number;
  evidence: string[];
  comment: string;
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
  { key: "logisticsAvailability", label: "Logistics", icon: "📍" },
];

function barColor(ratio: number): string {
  if (ratio >= 0.8) return "bg-emerald-500";
  if (ratio >= 0.6) return "bg-blue-500";
  if (ratio >= 0.4) return "bg-amber-500";
  return "bg-red-400";
}

interface ScoreBreakdownChartProps {
  scoreBreakdown: ScoreBreakdown;
  compact?: boolean;
  showEvidence?: boolean;
}

export default function ScoreBreakdownChart({
  scoreBreakdown,
  compact = false,
  showEvidence = false,
}: ScoreBreakdownChartProps) {
  if (!scoreBreakdown) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {DIMENSION_CONFIG.map(({ key, label, icon }) => {
        const dim = scoreBreakdown[key];
        if (!dim) return null;
        const ratio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0;
        const pct = Math.round(ratio * 100);

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
              <div
                className={`flex-1 ${
                  compact ? "h-2" : "h-3"
                } bg-gray-100 rounded-full overflow-hidden`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(ratio)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={`${
                  compact ? "text-[10px]" : "text-xs"
                } font-mono text-gray-700 w-10 text-right shrink-0`}
              >
                {dim.score}/{dim.maxScore}
              </span>
            </div>
            {showEvidence && dim.comment && (
              <p className="text-[11px] text-gray-500 ml-8 mt-0.5">
                {dim.comment}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { ScoreBreakdown, DimensionScore };
