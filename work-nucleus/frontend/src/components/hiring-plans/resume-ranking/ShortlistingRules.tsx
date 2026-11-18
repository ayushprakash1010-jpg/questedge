"use client";

import React from "react";
import { ShieldCheck, Lock, SlidersHorizontal } from "lucide-react";

export interface ShortlistingRules {
  locationCompatibility: "REQUIRED" | "RELAXED";
  mandatorySkills: "REQUIRED" | "RELAXED";
  minimumExperience: "REQUIRED" | "RELAXED";
  seniorityLevel: "REQUIRED" | "RELAXED";
  requiredEducation: "REQUIRED" | "RELAXED";
  requiredCertification: "REQUIRED" | "RELAXED";
  workAuthorization: "REQUIRED" | "RELAXED";
}

export const DEFAULT_SHORTLISTING_RULES: ShortlistingRules = {
  locationCompatibility: "RELAXED",
  mandatorySkills: "RELAXED",
  minimumExperience: "RELAXED",
  seniorityLevel: "RELAXED",
  requiredEducation: "RELAXED",
  requiredCertification: "RELAXED",
  workAuthorization: "RELAXED",
};

const RULE_CONFIG: Array<{
  key: keyof ShortlistingRules;
  label: string;
  description: string;
}> = [
  {
    key: "locationCompatibility",
    label: "Location compatibility",
    description: "Location & work model (onsite/hybrid/remote)",
  },
  {
    key: "mandatorySkills",
    label: "Mandatory skills",
    description: "Core must-have technical/functional skills",
  },
  {
    key: "minimumExperience",
    label: "Minimum experience",
    description: "Must meet or exceed required minimum years",
  },
  {
    key: "seniorityLevel",
    label: "Seniority level",
    description: "Career level & title alignment",
  },
  {
    key: "requiredEducation",
    label: "Required education",
    description: "Degree, branch, or academic level",
  },
  {
    key: "requiredCertification",
    label: "Required certification",
    description: "Mandatory licenses, certifications, credentials",
  },
  {
    key: "workAuthorization",
    label: "Work authorization",
    description: "Visa, work permit, or legal eligibility",
  },
];

interface ShortlistingRulesProps {
  rules: ShortlistingRules;
  onChange: (rules: ShortlistingRules) => void;
}

export default function ShortlistingRulesComponent({
  rules,
  onChange,
}: ShortlistingRulesProps) {
  const handleToggle = (key: keyof ShortlistingRules, mode: "REQUIRED" | "RELAXED") => {
    onChange({
      ...rules,
      [key]: mode,
    });
  };

  const requiredCount = Object.values(rules).filter((v) => v === "REQUIRED").length;

  return (
    <div className="space-y-3 pt-2">
      {/* Header with Title, Subtitle, and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-200/80 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Shortlisting Rules (Knockout Criteria)
            </h4>
            {requiredCount > 0 && (
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                {requiredCount} {requiredCount === 1 ? "knockout gate" : "knockout gates"} active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose how strictly each JD requirement should affect candidate shortlisting.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs shrink-0 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-slate-700 font-medium text-[11px]">
              <span className="font-semibold text-emerald-700">Required</span> — must match (Knockout)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-slate-700 font-medium text-[11px]">
              <span className="font-semibold text-indigo-700">Relaxed</span> — ranking preference
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
        {RULE_CONFIG.map(({ key, label, description }) => {
          const isRequired = rules[key] === "REQUIRED";

          return (
            <div
              key={key}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                isRequired
                  ? "bg-emerald-50/60 border-emerald-300 shadow-2xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {label}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {description}
                </p>
              </div>

              {/* Segmented Pill Toggle */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggle(key, "REQUIRED")}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    isRequired
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Candidate is rejected outright if this criteria is not met"
                >
                  <Lock className={`w-2.5 h-2.5 ${isRequired ? "text-white" : "text-slate-400"}`} />
                  Required
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(key, "RELAXED")}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                    !isRequired
                      ? "bg-white text-indigo-700 font-semibold shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Soft criteria: factored into score breakdown without disqualifying candidate"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5 opacity-60" />
                  Relaxed
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {requiredCount > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-center gap-2">
          <span className="font-bold shrink-0">⚠️ Gatekeeper Active:</span>
          <span>
            Candidates failing any <strong>Required</strong> criteria will be tagged as <em>Knocked Out</em> and excluded from the main interview shortlist.
          </span>
        </div>
      )}
    </div>
  );
}
