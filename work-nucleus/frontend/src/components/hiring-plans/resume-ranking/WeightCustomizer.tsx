"use client";

import React from "react";

interface ScoringWeights {
  skillsMatch: number;
  experienceRelevance: number;
  projectRelevance: number;
  educationCertifications: number;
  domainIndustryFit: number;
  roleSeniorityFit: number;
  culturalSoftSignals: number;
  logisticsAvailability: number;
}

const DIMENSION_LABELS: Record<keyof ScoringWeights, string> = {
  skillsMatch: "Skills Match",
  experienceRelevance: "Experience",
  projectRelevance: "Projects",
  educationCertifications: "Education",
  domainIndustryFit: "Domain Fit",
  roleSeniorityFit: "Seniority Fit",
  culturalSoftSignals: "Cultural Signals",
  logisticsAvailability: "Logistics",
};

const DEFAULT_WEIGHTS: ScoringWeights = {
  skillsMatch: 25,
  experienceRelevance: 20,
  projectRelevance: 15,
  educationCertifications: 10,
  domainIndustryFit: 10,
  roleSeniorityFit: 8,
  culturalSoftSignals: 7,
  logisticsAvailability: 5,
};

interface WeightCustomizerProps {
  weights: ScoringWeights;
  onChange: (weights: ScoringWeights) => void;
}

export default function WeightCustomizer({ weights, onChange }: WeightCustomizerProps) {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  const isValid = total === 100;

  const handleChange = (key: keyof ScoringWeights, value: number) => {
    onChange({ ...weights, [key]: value });
  };

  const handleReset = () => onChange({ ...DEFAULT_WEIGHTS });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Total:</span>
          <span
            className={`text-sm font-bold ${
              isValid
                ? "text-emerald-600"
                : "text-red-600"
            }`}
          >
            {total}% / 100%
          </span>
          {!isValid && (
            <span className="text-xs text-red-500 font-medium">Must equal 100%</span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
        >
          Reset defaults
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(DIMENSION_LABELS) as Array<keyof ScoringWeights>).map(
          (key) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-xs text-gray-600 w-28 shrink-0">
                {DIMENSION_LABELS[key]}
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={weights[key]}
                onChange={(e) =>
                  handleChange(key, parseInt(e.target.value, 10))
                }
                className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-mono font-medium w-9 text-right text-gray-700">
                {weights[key]}%
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export { DEFAULT_WEIGHTS };
export type { ScoringWeights };
