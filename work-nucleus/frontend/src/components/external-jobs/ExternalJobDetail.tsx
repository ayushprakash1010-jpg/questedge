"use client";

import { ExternalJob, ExternalJobMatchData } from "@/lib/external-jobs-api";
import { CompanyLogo } from "./CompanyLogo";
import {
  X,
  MapPin,
  Building2,
  Briefcase,
  Clock,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

interface ExternalJobDetailProps {
  job: ExternalJob | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (jobId: string) => void;
  onApply?: (job: ExternalJob) => void;
  isSaved?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  return "text-amber-600";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 65) return "bg-blue-50 border-blue-200";
  return "bg-amber-50 border-amber-200";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong Match";
  if (score >= 65) return "Good Match";
  if (score >= 40) return "Fair Match";
  return "Weak Match";
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

export function ExternalJobDetail({ job, isOpen, onClose, onSave, onApply, isSaved }: ExternalJobDetailProps) {
  if (!isOpen || !job) return null;

  const salary = formatSalary(job);
  const match = job.matchData;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <CompanyLogo
                companyName={job.companyName}
                logoUrl={job.companyLogoUrl}
                size="lg"
              />
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 text-lg leading-tight">
                  {job.title}
                </h2>
                <p className="text-sm text-slate-500">{job.companyName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Match Score Card */}
          {match && (
            <div className={`rounded-xl border p-4 ${getScoreBg(match.totalScore)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={`h-5 w-5 ${getScoreColor(match.totalScore)}`} />
                  <span className={`text-lg font-bold ${getScoreColor(match.totalScore)}`}>
                    {match.totalScore}% {getScoreLabel(match.totalScore)}
                  </span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Skills Fit", score: match.skillsScore, max: 40 },
                  { label: "Experience", score: match.experienceScore, max: 25 },
                  { label: "Role Fit", score: match.roleFitScore, max: 20 },
                  { label: "Preferences", score: match.preferencesScore, max: 15 },
                ].map((item) => (
                  <div key={item.label} className="bg-white/80 rounded-lg p-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-bold text-slate-800">
                        {item.score}/{item.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.score / item.max >= 0.7
                            ? "bg-emerald-500"
                            : item.score / item.max >= 0.5
                            ? "bg-blue-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${(item.score / item.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Matched / Missing Skills */}
              {match.matchedSkills.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Skills You Have
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {match.matchedSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-md font-medium border border-emerald-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {match.missingSkills.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                    <XCircle className="h-3 w-3 text-amber-600" /> Skills to Learn
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {match.missingSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-md font-medium border border-amber-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Job Meta */}
          <div className="grid grid-cols-2 gap-3">
            {(job.city || job.location) && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                {job.city || job.location}
              </div>
            )}
            {job.workplaceType && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="h-4 w-4 text-slate-400" />
                {job.workplaceType}
              </div>
            )}
            {job.employmentType && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Briefcase className="h-4 w-4 text-slate-400" />
                {job.employmentType}
              </div>
            )}
            {job.experienceLevel && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                {job.experienceLevel} level
              </div>
            )}
          </div>

          {salary && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">{salary}</span>
              {job.salaryPeriod && (
                <span className="text-xs text-emerald-600">per {job.salaryPeriod.toLowerCase()}</span>
              )}
            </div>
          )}

          {/* Skills */}
          {job.extractedSkills && job.extractedSkills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Skills & Technologies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.extractedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {(job.descriptionHtml || job.descriptionPlain || job.descriptionSnippet) && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Job Description
              </h4>
              {job.descriptionHtml ? (
                <div
                  className="prose prose-sm prose-slate max-w-none text-slate-600"
                  dangerouslySetInnerHTML={{
                    __html: job.descriptionHtml.includes('&lt;') && job.descriptionHtml.includes('&gt;')
                      ? job.descriptionHtml
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'")
                          .replace(/&amp;/g, '&')
                      : job.descriptionHtml,
                  }}
                />
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {(job.descriptionPlain || job.descriptionSnippet || '')
                    .replace(/<[^>]*>|<[^>]*$/g, '')
                    .replace(/&[a-z0-9#]+;?/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()}
                </p>
              )}
            </div>
          )}

          {/* External Redirect Disclaimer */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>External Listing:</strong> This is a job posted on{" "}
              <strong>
                {job.sourceName.charAt(0).toUpperCase() + job.sourceName.slice(1)}
              </strong>.
              Clicking &quot;Apply Now&quot; will redirect you to the company&apos;s career page.
            </p>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => onSave?.(job.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              isSaved
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" /> Save
              </>
            )}
          </button>
          <button
            onClick={() => onApply?.(job)}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300"
          >
            Apply Now <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

