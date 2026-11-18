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
    description: "Location & work model (onsite, hybrid, or remote)",
  },
  {
    key: "mandatorySkills",
    label: "Mandatory skills",
    description: "Core must-have technical and functional skills",
  },
  {
    key: "minimumExperience",
    label: "Minimum experience",
    description: "Must meet or exceed required minimum years",
  },
  {
    key: "seniorityLevel",
    label: "Seniority level",
    description: "Career level, scope, and title alignment",
  },
  {
    key: "requiredEducation",
    label: "Required education",
    description: "Degree, academic branch, or level",
  },
  {
    key: "requiredCertification",
    label: "Required certification",
    description: "Mandatory licenses, certifications, credentials",
  },
  {
    key: "workAuthorization",
    label: "Work authorization",
    description: "Work visa, permit, or legal eligibility",
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
    <div className="space-y-3.5 pt-1">
      {/* Header with Title, Subtitle, and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-t border-slate-200/80 pt-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Shortlisting Rules (Knockout Criteria)
            </h4>
            {requiredCount > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                {requiredCount} {requiredCount === 1 ? "knockout gate" : "knockout gates"} active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose how strictly each JD requirement should affect candidate shortlisting.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs shrink-0 self-start sm:self-auto bg-slate-100/70 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-2xs" />
            <span className="text-slate-700 font-medium text-[11px]">
              <span className="font-bold text-emerald-700">Required</span> — must match (Knockout)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-2xs" />
            <span className="text-slate-700 font-medium text-[11px]">
              <span className="font-bold text-indigo-700">Relaxed</span> — ranking preference
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Rules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        {RULE_CONFIG.map(({ key, label, description }, idx) => {
          const isRequired = rules[key] === "REQUIRED";

          return (
            <div
              key={key}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                idx === 6 ? "sm:col-span-2 sm:max-w-none" : ""
              } ${
                isRequired
                  ? "bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-200/60"
                  : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
              }`}
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {label}
                </p>
                <p className="text-[11px] text-gray-500 leading-snug line-clamp-1 sm:line-clamp-2 mt-0.5">
                  {description}
                </p>
              </div>

              {/* Segmented Pill Toggle matching Aditya's mockup */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleToggle(key, "REQUIRED")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    isRequired
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  title="Candidate is rejected outright if this criteria is not met"
                >
                  <Lock className={`w-3 h-3 ${isRequired ? "text-white" : "text-slate-400"}`} />
                  <span>Required</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(key, "RELAXED")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    !isRequired
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                  title="Soft criteria: factored into score breakdown without disqualifying candidate"
                >
                  <SlidersHorizontal className={`w-3 h-3 ${!isRequired ? "text-white" : "text-slate-400"}`} />
                  <span>Relaxed</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {requiredCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2.5 shadow-2xs">
          <span className="text-base shrink-0">⚠️</span>
          <span>
            <strong>Gatekeeper Active:</strong> {requiredCount}{" "}
            {requiredCount === 1 ? "rule is" : "rules are"} set to <strong>Required</strong>.
            Candidates failing {requiredCount === 1 ? "this requirement" : "any of these requirements"} will be tagged as{" "}
            <em>Knocked Out</em> and partitioned from the main interview shortlist.
          </span>
        </div>
      )}
    </div>
  );
}
