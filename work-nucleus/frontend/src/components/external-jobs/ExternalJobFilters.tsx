"use client";

import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useState } from "react";

interface ExternalJobFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: {
    location: string;
    workplaceType: string;
    experienceLevel: string;
    employmentType: string;
    sourceName: string;
    postedWithin: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
}

const workplaceOptions = [
  { label: "All Types", value: "" },
  { label: "Remote", value: "Remote" },
  { label: "Hybrid", value: "Hybrid" },
  { label: "Onsite", value: "Onsite" },
];

const experienceOptions = [
  { label: "All Levels", value: "" },
  { label: "Intern", value: "intern" },
  { label: "Fresher / Entry", value: "entry" },
  { label: "Junior", value: "junior" },
  { label: "Mid Level", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Lead", value: "lead" },
];

const employmentOptions = [
  { label: "All Types", value: "" },
  { label: "Full Time", value: "FullTime" },
  { label: "Part Time", value: "PartTime" },
  { label: "Contract", value: "Contract" },
  { label: "Internship", value: "Internship" },
];

const sourceOptions = [
  { label: "All Sources", value: "" },
  { label: "Greenhouse", value: "greenhouse" },
  { label: "Lever", value: "lever" },
  { label: "Ashby", value: "ashby" },
  { label: "Jobicy", value: "jobicy" },
  { label: "Remotive", value: "remotive" },
  { label: "RemoteOK", value: "remoteok" },
  { label: "Careerjet", value: "careerjet" },
  { label: "JSearch", value: "jsearch" },
];

const postedWithinOptions = [
  { label: "Any Time", value: "" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 3 days", value: "3d" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
];

const indianCities = [
  "", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Gurgaon", "Noida",
  "Jaipur", "Chandigarh", "Kochi", "Indore", "Coimbatore",
];

export function ExternalJobFilters({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onClearAll,
}: ExternalJobFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, company, or skill..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            showFilters || activeCount > 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-200">
          {/* Location */}
          <select
            value={filters.location}
            onChange={(e) => onFilterChange("location", e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Locations</option>
            {indianCities.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Workplace Type */}
          <select
            value={filters.workplaceType}
            onChange={(e) => onFilterChange("workplaceType", e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {workplaceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Experience Level */}
          <select
            value={filters.experienceLevel}
            onChange={(e) => onFilterChange("experienceLevel", e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {experienceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Employment Type */}
          <select
            value={filters.employmentType}
            onChange={(e) => onFilterChange("employmentType", e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {employmentOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Source */}
          <select
            value={filters.sourceName}
            onChange={(e) => onFilterChange("sourceName", e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {sourceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Posted Within */}
          <select
            value={filters.postedWithin}
            onChange={(e) => onFilterChange("postedWithin", e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {postedWithinOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {activeCount > 0 && (
            <button
              onClick={onClearAll}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

