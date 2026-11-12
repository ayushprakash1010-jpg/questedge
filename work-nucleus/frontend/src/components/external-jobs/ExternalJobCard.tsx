"use client";

import { ExternalJob } from "@/lib/external-jobs-api";
import { CompanyLogo } from "./CompanyLogo";
import {
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Sparkles,
  Banknote,
  Briefcase,
} from "lucide-react";

interface ExternalJobCardProps {
  job: ExternalJob;
  onSave?: (jobId: string) => void;
  onClick?: (job: ExternalJob) => void;
  isSaved?: boolean;
}

function getSourceBadgeConfig(source: string): { bg: string; text: string; border: string; dot: string } {
  const configs: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    greenhouse: { bg: "bg-emerald-50/70", text: "text-emerald-700", border: "border-emerald-200/60", dot: "bg-emerald-500" },
    lever: { bg: "bg-blue-50/70", text: "text-blue-700", border: "border-blue-200/60", dot: "bg-blue-500" },
    ashby: { bg: "bg-purple-50/70", text: "text-purple-700", border: "border-purple-200/60", dot: "bg-purple-500" },
    jobicy: { bg: "bg-amber-50/70", text: "text-amber-700", border: "border-amber-200/60", dot: "bg-amber-500" },
    remotive: { bg: "bg-cyan-50/70", text: "text-cyan-700", border: "border-cyan-200/60", dot: "bg-cyan-500" },
    remoteok: { bg: "bg-orange-50/70", text: "text-orange-700", border: "border-orange-200/60", dot: "bg-orange-500" },
    careerjet: { bg: "bg-rose-50/70", text: "text-rose-700", border: "border-rose-200/60", dot: "bg-rose-500" },
    jsearch: { bg: "bg-indigo-50/70", text: "text-indigo-700", border: "border-indigo-200/60", dot: "bg-indigo-500" },
  };
  return configs[source.toLowerCase()] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" };
}

function getMatchScoreColor(score: number): string {
  if (score >= 80) return "from-emerald-500 to-green-500 text-white";
  if (score >= 65) return "from-blue-500 to-indigo-500 text-white";
  return "from-amber-500 to-orange-500 text-white";
}

function formatSalary(job: ExternalJob): string | null {
  if (job.salaryRaw) return job.salaryRaw;
  if (!job.salaryMin && !job.salaryMax) return null;
  const currency = job.salaryCurrency === "INR" ? "₹" : (job.salaryCurrency || "$");
  const fmt = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };
  if (job.salaryMin && job.salaryMax) return `${currency}${fmt(job.salaryMin)} - ${currency}${fmt(job.salaryMax)}`;
  if (job.salaryMin) return `${currency}${fmt(job.salaryMin)}+`;
  if (job.salaryMax) return `Up to ${currency}${fmt(job.salaryMax)}`;
  return null;
}

function formatWorkplaceType(value: string): string {
  if (/^on\s?-?\s?site$/i.test(value.replace(/[_-]/g, ' '))) return 'On-site';
  return value;
}

function formatEmploymentType(value: string): string {
  const spaced = value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  const normalized = spaced.toLowerCase();
  if (normalized === 'full time' || normalized === 'fulltime') return 'Full-time';
  if (normalized === 'part time' || normalized === 'parttime') return 'Part-time';
  return spaced.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPostingFreshness(dateStr?: string | null): string {
  if (!dateStr) return "";
  const posted = new Date(dateStr);
  const postedTime = posted.getTime();
  if (!Number.isFinite(postedTime)) return "";

  const ageMs = Date.now() - postedTime;
  if (ageMs < 0) return "";

  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1d ago";
  if (days < 7) return `Posted ${days}d ago`;
  if (days < 30) return `Posted ${Math.floor(days / 7)}w ago`;

  const postedYear = posted.getUTCFullYear();
  const currentYear = new Date().getUTCFullYear();
  const dateLabel = posted.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(postedYear !== currentYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
  return `Posted ${dateLabel}`;
}

function cleanSnippetText(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>|<[^>]*$/g, "")
    .replace(/&[a-z0-9#]+;?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ExternalJobCard({ job, onSave, onClick, isSaved }: ExternalJobCardProps) {
  const salary = formatSalary(job);
  const postingFreshness = formatPostingFreshness(job.postedAt);
  const sourceConfig = getSourceBadgeConfig(job.sourceName);

  const isWorkplaceRemote = job.workplaceType?.toLowerCase() === "remote";
  const rawLoc = (job.city || job.location || "").trim();
  const isLocRemote = rawLoc.toLowerCase() === "remote";
  const displayLocation = isLocRemote && isWorkplaceRemote ? null : (rawLoc || null);

  return (
    <div
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-xl hover:shadow-slate-200/50 hover:border-emerald-300/80 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
      onClick={() => onClick?.(job)}
    >
      {/* Match Score Badge */}
      {job.matchScore != null && job.matchScore > 0 && (
        <div className={`absolute -top-2.5 right-4 flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold shadow-md bg-gradient-to-r ${getMatchScoreColor(job.matchScore)}`}>
          <Sparkles className="h-3 w-3" />
          {job.matchScore}% Match
        </div>
      )}

      <div>
        {/* Header: Logo, Title, Company, Bookmark Button */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <CompanyLogo
              companyName={job.companyName}
              logoUrl={job.companyLogoUrl}
              size="md"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <h3
                className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors"
                title={job.title}
              >
                {job.title}
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                {job.companyName}
              </p>
            </div>
          </div>

          {/* Circular Action Bookmark */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(job.id);
            }}
            className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all shrink-0 ${
              isSaved
                ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs"
                : "bg-slate-50/80 border-slate-200/60 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 hover:border-emerald-200"
            }`}
            title={isSaved ? "Remove from saved" : "Save job"}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4 fill-emerald-600" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Metadata Badges: Location, Workplace, Employment */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {displayLocation && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200/70">
              <MapPin className="h-3 w-3 text-sky-500" />
              {displayLocation === "IN" ? "India" : displayLocation === "US" ? "United States" : displayLocation}
            </span>
          )}
          {job.workplaceType && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                isWorkplaceRemote
                  ? "bg-lime-50 text-lime-800 border-lime-200/70"
                  : job.workplaceType.toLowerCase() === "hybrid"
                  ? "bg-amber-50 text-amber-700 border-amber-200/70"
                  : "bg-orange-50 text-orange-700 border-orange-200/70"
              }`}
            >
              {isWorkplaceRemote && (
                <span className="h-1.5 w-1.5 rounded-full bg-lime-600 animate-pulse" />
              )}
              {formatWorkplaceType(job.workplaceType)}
            </span>
          )}
          {job.employmentType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/70">
              <Briefcase className="h-3 w-3 text-indigo-500" />
              {formatEmploymentType(job.employmentType)}
            </span>
          )}
          {job.requiredExperience && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200/70">
              <Clock className="h-3 w-3" />
              {job.requiredExperience} required
            </span>
          )}
        </div>

        {/* Salary Pill (if provided) */}
        {salary && (
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg mb-3">
            <Banknote className="h-3 w-3" />
            {salary}
            {job.salaryPeriod && (
              <span className="ml-0.5 font-medium text-emerald-600">per {job.salaryPeriod.toLowerCase()}</span>
            )}
          </div>
        )}

        {/* Skills Chips */}
        {job.extractedSkills && job.extractedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.extractedSkills.slice(0, 5).map((skill) => {
              const isMatch = job.matchedSkills?.includes(skill);
              return (
                <span
                  key={skill}
                  className={`px-2.5 py-0.5 text-[11px] rounded-lg font-medium border transition-colors ${
                    isMatch
                      ? "bg-teal-100 text-teal-800 border-teal-300/80 shadow-2xs"
                      : "bg-teal-50 text-teal-700 border-teal-200/70"
                  }`}
                >
                  {skill}
                </span>
              );
            })}
            {job.extractedSkills.length > 5 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-teal-50 text-teal-600 border border-teal-200/70">
                +{job.extractedSkills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Description Snippet */}
        {cleanSnippetText(job.descriptionSnippet) && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4 group-hover:text-slate-600 transition-colors">
            {cleanSnippetText(job.descriptionSnippet)}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-md border ${sourceConfig.bg} ${sourceConfig.text} ${sourceConfig.border}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sourceConfig.dot}`} />
            via {job.sourceName.charAt(0).toUpperCase() + job.sourceName.slice(1)}
          </span>
          {postingFreshness && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <Clock className="h-3 w-3" />
              {postingFreshness}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick?.(job);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label={`View ${job.title} at ${job.companyName}`}
        >
          View Job
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
