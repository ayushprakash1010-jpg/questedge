"use client";

import React, { useState } from "react";

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

const DIMENSION_COLORS: Record<
  keyof ScoringWeights,
  { fill: string; dot: string; activeStroke: string }
> = {
  skillsMatch: { fill: "#10B981", dot: "bg-emerald-500", activeStroke: "#059669" },
  experienceRelevance: { fill: "#3B82F6", dot: "bg-blue-500", activeStroke: "#2563EB" },
  projectRelevance: { fill: "#6366F1", dot: "bg-indigo-500", activeStroke: "#4F46E5" },
  educationCertifications: { fill: "#8B5CF6", dot: "bg-purple-500", activeStroke: "#7C3AED" },
  domainIndustryFit: { fill: "#F59E0B", dot: "bg-amber-500", activeStroke: "#D97706" },
  roleSeniorityFit: { fill: "#06B6D4", dot: "bg-cyan-500", activeStroke: "#0891B2" },
  culturalSoftSignals: { fill: "#F43F5E", dot: "bg-rose-500", activeStroke: "#E11D48" },
  logisticsAvailability: { fill: "#14B8A6", dot: "bg-teal-500", activeStroke: "#0D9488" },
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

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const rad = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
) {
  if (endAngle - startAngle >= 359.99) {
    endAngle = startAngle + 359.99;
  }
  const outerStart = polarToCartesian(cx, cy, rOuter, startAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

interface WeightCustomizerProps {
  weights: ScoringWeights;
  onChange: (weights: ScoringWeights) => void;
}

export default function WeightCustomizer({ weights, onChange }: WeightCustomizerProps) {
  const [hoveredKey, setHoveredKey] = useState<keyof ScoringWeights | null>(null);

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  const isValid = total === 100;

  const handleChange = (key: keyof ScoringWeights, value: number) => {
    onChange({ ...weights, [key]: value });
  };

  const handleReset = () => onChange({ ...DEFAULT_WEIGHTS });

  // Calculate slice angles for the Donut Chart
  const keys = Object.keys(DIMENSION_LABELS) as Array<keyof ScoringWeights>;
  const divisor = total > 0 ? total : 100;

  let currentAngle = 0;
  const slices = keys.map((key) => {
    const val = Math.max(0, weights[key]);
    const sweepAngle = (val / divisor) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    currentAngle = endAngle;

    return {
      key,
      label: DIMENSION_LABELS[key],
      value: val,
      color: DIMENSION_COLORS[key].fill,
      activeColor: DIMENSION_COLORS[key].activeStroke,
      startAngle,
      endAngle,
      sweepAngle,
    };
  });

  return (
    <div className="space-y-4">
      {/* Header with Total status and Reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Weight Distribution
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
              isValid
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {total}% allocated
          </span>
          {!isValid && (
            <span className="text-xs text-red-500 font-medium">Must equal 100%</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer"
        >
          Reset defaults
        </button>
      </div>

      {/* Main Container: Donut Wheel on Left + Sliders on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
        {/* Left: Donut Wheel (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center relative">
          <div className="relative w-44 h-44">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full transform -rotate-90 filter drop-shadow-xs"
            >
              {slices.map((slice) => {
                if (slice.sweepAngle <= 0.1) return null;
                const isHovered = hoveredKey === slice.key;
                const path = describeDonutSlice(100, 100, 52, isHovered ? 84 : 80, slice.startAngle, slice.endAngle);

                return (
                  <path
                    key={slice.key}
                    d={path}
                    fill={slice.color}
                    opacity={hoveredKey && !isHovered ? 0.45 : 1}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(slice.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })}
            </svg>

            {/* Center Donut Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span
                className={`text-2xl font-black font-mono leading-none ${
                  isValid ? "text-slate-800" : "text-red-600"
                }`}
              >
                {hoveredKey ? `${weights[hoveredKey]}%` : `${total}%`}
              </span>
              <span
                className={`text-[11px] font-medium mt-1 uppercase tracking-wider ${
                  hoveredKey
                    ? "text-indigo-600 font-semibold"
                    : isValid
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                {hoveredKey ? DIMENSION_LABELS[hoveredKey] : "Allocated"}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-2">
            Adjust sliders to reallocate criteria weights
          </p>
        </div>

        {/* Right: Sliders (8 cols) */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
          {keys.map((key) => {
            const isHovered = hoveredKey === key;
            const colorMeta = DIMENSION_COLORS[key];

            return (
              <div
                key={key}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all ${
                  isHovered ? "bg-white shadow-xs ring-1 ring-slate-200" : ""
                }`}
              >
                {/* Color Dot */}
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMeta.dot}`}
                  style={{ backgroundColor: colorMeta.fill }}
                />

                {/* Dimension Label */}
                <label className="text-xs text-gray-700 font-medium w-24 shrink-0 truncate">
                  {DIMENSION_LABELS[key]}
                </label>

                {/* Range Slider */}
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={weights[key]}
                  onChange={(e) =>
                    handleChange(key, parseInt(e.target.value, 10))
                  }
                  className="flex-1 h-1.5 accent-indigo-600 cursor-pointer"
                />

                {/* Value Pill */}
                <span className="text-xs font-mono font-semibold w-8 text-right text-slate-800 shrink-0">
                  {weights[key]}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_WEIGHTS };
export type { ScoringWeights };
