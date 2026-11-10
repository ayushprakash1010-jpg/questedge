"use client";

import { ExternalJob } from "@/lib/external-jobs-api";
import { CompanyLogo } from "./CompanyLogo";
import {
  MapPin,
  Building2,
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  IndianRupee,
  Briefcase,
} from "lucide-react";

interface ExternalJobCardProps {
  job: ExternalJob;
  onSave?: (jobId: string) => void;
  onClick?: (job: ExternalJob) => void;
  isSaved?: boolean;
}

function getSourceBadgeColor(source: string): string {
  const colors: Record<string, string> = {
    greenhouse: "bg-green-50 text-green-700 border-green-200",
    lever: "bg-blue-50 text-blue-700 border-blue-200",
    ashby: "bg-purple-50 text-purple-700 border-purple-200",
    jobicy: "bg-amber-50 text-amber-700 border-amber-200",
    remotive: "bg-cyan-50 text-cyan-700 border-cyan-200",
    remoteok: "bg-orange-50 text-orange-700 border-orange-200",
    careerjet: "bg-rose-50 text-rose-700 border-rose-200",
    jsearch: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return colors[source] || "bg-slate-50 text-slate-700 border-slate-200";
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

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const posted = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - posted.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
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

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer"
      onClick={() => onClick?.(job)}
    >
      {/* Match Score Badge */}
      {job.matchScore != null && job.matchScore > 0 && (
        <div className={`absolute -top-2.5 -right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg bg-gradient-to-r ${getMatchScoreColor(job.matchScore)}`}>
          <Sparkles className="h-3 w-3" />
          {job.matchScore}% Match
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo
            companyName={job.companyName}
            logoUrl={job.companyLogoUrl}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate group-hover:text-emerald-700 transition-colors">
              {job.title}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {job.companyName}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave?.(job.id);
          }}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          title={isSaved ? "Remove from saved" : "Save job"}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4.5 w-4.5 text-emerald-600 fill-emerald-600" />
          ) : (
            <Bookmark className="h-4.5 w-4.5 text-slate-400 group-hover:text-slate-600" />
          )}
        </button>
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 mb-3">
        {(job.city || job.location) && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {job.city || job.location}
          </span>
        )}
        {job.workplaceType && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            job.workplaceType === 'Remote'
              ? 'bg-emerald-50 text-emerald-700'
              : job.workplaceType === 'Hybrid'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-slate-50 text-slate-600'
          }`}>
            {job.workplaceType}
          </span>
        )}
        {job.employmentType && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
            {job.employmentType}
          </span>
        )}
      </div>

      {/* Salary */}
      {salary && (
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg w-fit mb-3">
          <IndianRupee className="h-3 w-3" />
          {salary}
        </div>
      )}

      {/* Skills */}
      {job.extractedSkills && job.extractedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.extractedSkills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className={`px-2 py-0.5 text-[10px] rounded-md font-medium ${
                job.matchedSkills?.includes(skill)
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {skill}
            </span>
          ))}
          {job.extractedSkills.length > 5 && (
            <span className="px-2 py-0.5 text-[10px] rounded-md bg-slate-50 text-slate-400">
              +{job.extractedSkills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Description Snippet */}
      {cleanSnippetText(job.descriptionSnippet) && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
          {cleanSnippetText(job.descriptionSnippet)}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md border ${getSourceBadgeColor(job.sourceName)}`}>
            via {job.sourceName.charAt(0).toUpperCase() + job.sourceName.slice(1)}
          </span>
          {job.postedAt && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="h-3 w-3" />
              {timeAgo(job.postedAt)}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View Details <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

