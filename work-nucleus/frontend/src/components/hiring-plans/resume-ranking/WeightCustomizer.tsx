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

  const activeHoveredSlice = hoveredKey ? slices.find((s) => s.key === hoveredKey) : null;

  return (
    <div className="space-y-3.5">
      {/* Header with Total status and Reset */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Weight Distribution
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono transition-colors ${
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
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
        >
          Reset defaults
        </button>
      </div>

      {/* Main Container: Donut Wheel on Left + Sliders on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-50/70 p-4.5 rounded-xl border border-slate-200/80 shadow-2xs">
        {/* Left: Donut Wheel (4 cols on lg, centered) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center relative py-2">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Hover Tooltip Pill pointing to active slice */}
            {activeHoveredSlice && (
              <div className="absolute -top-3 z-20 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold shadow-md flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeHoveredSlice.color }}
                />
                <span className="truncate max-w-[110px]">{activeHoveredSlice.label}</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {activeHoveredSlice.value}%
                </span>
              </div>
            )}

            <svg
              viewBox="0 0 200 200"
              className="w-full h-full transform -rotate-90 filter drop-shadow-xs"
            >
              {slices.map((slice) => {
                if (slice.sweepAngle <= 0.1) return null;
                const isHovered = hoveredKey === slice.key;
                const path = describeDonutSlice(
                  100,
                  100,
                  54,
                  isHovered ? 86 : 80,
                  slice.startAngle,
                  slice.endAngle
                );

                return (
                  <path
                    key={slice.key}
                    d={path}
                    fill={slice.color}
                    opacity={hoveredKey && !isHovered ? 0.35 : 1}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredKey(slice.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })}
            </svg>

            {/* Center Donut Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span
                className={`text-2xl font-black font-mono leading-none tracking-tight transition-colors ${
                  activeHoveredSlice
                    ? "text-slate-900"
                    : isValid
                    ? "text-slate-800"
                    : "text-red-600"
                }`}
              >
                {hoveredKey ? `${weights[hoveredKey]}%` : `${total}%`}
              </span>
              <span
                className={`text-[10px] font-bold mt-1 uppercase tracking-wider transition-colors max-w-[85px] truncate ${
                  activeHoveredSlice
                    ? "text-indigo-600"
                    : isValid
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                {hoveredKey ? DIMENSION_LABELS[hoveredKey] : "Allocated"}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-2.5">
            Adjust sliders to reallocate criteria weights
          </p>
        </div>

        {/* Right: Sliders (8 cols on lg, 2 cols clean card layout) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {keys.map((key) => {
            const isHovered = hoveredKey === key;
            const colorMeta = DIMENSION_COLORS[key];

            return (
              <div
                key={key}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`p-2.5 rounded-xl border transition-all ${
                  isHovered
                    ? "bg-white border-indigo-300 shadow-sm ring-2 ring-indigo-50"
                    : "bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs"
                }`}
              >
                {/* Row 1: Label + Percentage */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ${colorMeta.dot}`}
                      style={{ backgroundColor: colorMeta.fill }}
                    />
                    <label className="text-xs font-semibold text-slate-800 truncate cursor-pointer">
                      {DIMENSION_LABELS[key]}
                    </label>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 transition-colors ${
                      isHovered
                        ? "bg-indigo-600 text-white"
                        : weights[key] > 0
                        ? "bg-slate-100 text-slate-800 border border-slate-200/80"
                        : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {weights[key]}%
                  </span>
                </div>

                {/* Row 2: Full Width Range Slider */}
                <div className="relative flex items-center pt-0.5">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={weights[key]}
                    onChange={(e) =>
                      handleChange(key, parseInt(e.target.value, 10))
                    }
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                  />
                </div>
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
