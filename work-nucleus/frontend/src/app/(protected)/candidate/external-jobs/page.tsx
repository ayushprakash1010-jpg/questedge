"use client";

import { useState, useEffect, useCallback } from "react";
import {
  searchExternalJobs,
  getRecommendedExternalJobs,
  getSavedExternalJobs,
  toggleExternalJobSave,
  recordExternalJobClick,
  reportExternalJobApplied,
  getExternalJobById,
  triggerExternalJobsSync,
  ExternalJob,
  ExternalJobSearchParams,
} from "@/lib/external-jobs-api";
import { ExternalJobCard } from "@/components/external-jobs/ExternalJobCard";
import { ExternalJobDetail } from "@/components/external-jobs/ExternalJobDetail";
import { ExternalJobFilters } from "@/components/external-jobs/ExternalJobFilters";
import { ExternalJobSkeletonGrid } from "@/components/external-jobs/ExternalJobSkeleton";
import { ExternalJobHistory } from "@/components/external-jobs/ExternalJobHistory";
import {
  Loader2,
  Globe,
  Sparkles,
  Bookmark,
  History,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Search,
  RefreshCw,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "@/components/ui/toaster";

type ViewMode = "browse" | "recommended" | "saved" | "history";

export default function ExternalJobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const initialTab: ViewMode =
    tabParam === "recommended"
      ? "recommended"
      : tabParam === "saved"
      ? "saved"
      : tabParam === "history"
      ? "history"
      : "browse";

  const [viewMode, setViewMode] = useState<ViewMode>(initialTab);
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  // Filters
  const [filters, setFilters] = useState({
    location: "",
    workplaceType: "",
    experienceLevel: "",
    employmentType: "",
    sourceName: "",
    postedWithin: "",
  });

  // Detail slide-over
  const [selectedJob, setSelectedJob] = useState<ExternalJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const getToken = async (): Promise<string> => {
    const res = await fetch("/api/auth/token");
    const data = await res.json();
    return data.accessToken;
  };

  const fetchJobs = useCallback(async () => {
    if (viewMode === "history") return; // History component handles its own fetching
    try {
      setLoading(true);
      const token = await getToken();

      if (viewMode === "recommended") {
        const result = await getRecommendedExternalJobs(token);
        setJobs(result.jobs || []);
        setTotal(result.jobs?.length || 0);
        setTotalPages(1);
      } else if (viewMode === "saved") {
        const result = await getSavedExternalJobs(token, page);
        setJobs(result.savedJobs || []);
        setTotal(result.pagination?.total || 0);
        setTotalPages(result.pagination?.totalPages || 1);
        setSavedJobIds(
          new Set((result.savedJobs || []).map((j: ExternalJob) => j.id))
        );
      } else {
        const params: ExternalJobSearchParams = {
          page,
          limit: 15,
          search: search || undefined,
          ...Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v !== "")
          ),
        };
        const result = await searchExternalJobs(token, params);
        setJobs(result.jobs || []);
        setTotal(result.pagination?.total || 0);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      console.error("Failed to fetch external jobs:", err);
      if (err?.status !== 401) {
        toast.error("Failed to load jobs. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [viewMode, page, search, filters]);

  useEffect(() => {
    if (viewMode === "browse") {
      const timer = setTimeout(() => fetchJobs(), 350);
      return () => clearTimeout(timer);
    }
    fetchJobs();
  }, [fetchJobs, viewMode]);

  const handleTabChange = (tab: ViewMode) => {
    setViewMode(tab);
    setPage(1);
    setSearch("");
    router.push(
      `/candidate/external-jobs${tab !== "browse" ? `?tab=${tab}` : ""}`
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      location: "",
      workplaceType: "",
      experienceLevel: "",
      employmentType: "",
      sourceName: "",
      postedWithin: "",
    });
    setPage(1);
  };

  const handleSave = async (jobId: string) => {
    try {
      const token = await getToken();
      const { saved } = await toggleExternalJobSave(token, jobId);
      if (saved) {
        setSavedJobIds((prev) => new Set(prev).add(jobId));
        toast.success("Job saved!");
      } else {
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        if (viewMode === "saved") {
          setJobs((prev) => prev.filter((j) => j.id !== jobId));
        }
        toast.success("Job removed from saved.");
      }
    } catch (err) {
      toast.error("Failed to save job.");
    }
  };

  const handleCardClick = async (job: ExternalJob) => {
    setSelectedJob(job);
    setDetailOpen(true);
    // Fetch full details with match data
    try {
      const token = await getToken();
      const fullJob = await getExternalJobById(token, job.id);
      setSelectedJob(fullJob);
    } catch {
      // Keep partial data if full fetch fails
    }
  };

  const handleApply = async (job: ExternalJob) => {
    if (!job.applyUrl) {
      toast.error("No application URL available for this job.");
      return;
    }
    // Open immediately to guarantee popup blockers never block the new tab
    window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    toast.success(
      "Redirecting to application page. Tracked in your Activity tab!"
    );

    // Track click telemetry in the background
    try {
      const token = await getToken();
      await recordExternalJobClick(token, job.id);
    } catch (err) {
      console.warn("Click tracking notice:", err);
    }
  };

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      toast.info(
        "Connecting to Greenhouse, Lever, Ashby, Remotive, RemoteOK, Careerjet, JSearch... Ingesting live jobs."
      );
      const token = await getToken();
      await triggerExternalJobsSync(token);

      // Poll until jobs appear
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const freshToken = await getToken();
          const res = await searchExternalJobs(freshToken, {
            page: 1,
            limit: 15,
          });
          if ((res.jobs && res.jobs.length > 0) || attempts >= 8) {
            clearInterval(interval);
            setSyncing(false);
            if (res.jobs && res.jobs.length > 0) {
              setJobs(res.jobs);
              setTotal(res.pagination?.total || res.jobs.length);
              setTotalPages(res.pagination?.totalPages || 1);
              toast.success(
                `Successfully loaded ${res.pagination?.total || res.jobs.length} live market jobs!`
              );
            }
          }
        } catch {
          if (attempts >= 8) {
            clearInterval(interval);
            setSyncing(false);
          }
        }
      }, 3000);
    } catch (err: any) {
      setSyncing(false);
      toast.error("Failed to initiate sync. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 px-6 py-10 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-slate-900 to-slate-900" />
        <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute right-10 bottom-0 h-[200px] w-[200px] rounded-full bg-teal-500/8 blur-[60px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <button
                  onClick={() => handleTabChange("browse")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "browse"
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  Explore Market
                </button>

                <button
                  onClick={() => handleTabChange("recommended")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "recommended"
                      ? "bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-emerald-300 ring-1 ring-indigo-400/40 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  For You
                  <span className="bg-indigo-500/40 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    AI
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange("saved")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "saved"
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  Saved
                </button>

                <button
                  onClick={() => handleTabChange("history")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "history"
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <History className="h-4 w-4" />
                  Activity
                </button>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                {viewMode === "recommended" ? (
                  <>
                    Jobs{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                      Matched for You
                    </span>
                  </>
                ) : viewMode === "saved" ? (
                  <>
                    Your{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                      Saved
                    </span>{" "}
                    Jobs
                  </>
                ) : viewMode === "history" ? (
                  <>
                    Application{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                      Activity
                    </span>
                  </>
                ) : (
                  <>
                    Explore the{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                      Job Market
                    </span>
                  </>
                )}
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl">
                {viewMode === "recommended"
                  ? "AI-ranked roles based on your skills, experience, and preferences."
                  : viewMode === "saved"
                  ? "Jobs you've bookmarked across the market."
                  : viewMode === "history"
                  ? "Track the external jobs you've visited and applied to."
                  : "Discover jobs from Greenhouse, Lever, Ashby, Jobicy, Remotive, Careerjet & more — aggregated in one place."}
              </p>
            </div>

            {/* Stats & Sync */}
            {viewMode === "browse" && (
              <div className="flex items-center gap-3">
                {!loading && (
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-white">{total}</span> jobs found
                  </div>
                )}
                <button
                  onClick={handleTriggerSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 ring-1 ring-emerald-500/40 transition-all disabled:opacity-50 cursor-pointer"
                  title="Fetch fresh jobs from live ATS boards and aggregators"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Market'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters (only for browse mode) */}
        {viewMode === "browse" && (
          <div className="mb-6">
            <ExternalJobFilters
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearFilters}
            />
          </div>
        )}

        {/* History Tab */}
        {viewMode === "history" ? (
          <ExternalJobHistory getToken={getToken} />
        ) : loading && jobs.length === 0 ? (
          <div className="py-4">
            <ExternalJobSkeletonGrid count={6} />
          </div>
        ) : jobs.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-100 rounded-3xl rotate-6 scale-105 opacity-40" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-inner">
                {viewMode === "recommended" ? (
                  <Sparkles className="h-10 w-10 text-indigo-400" />
                ) : viewMode === "saved" ? (
                  <Bookmark className="h-10 w-10 text-emerald-400" />
                ) : (
                  <Search className="h-10 w-10 text-emerald-400" />
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {viewMode === "recommended"
                ? "No matches computed yet"
                : viewMode === "saved"
                ? "No saved jobs"
                : "No jobs found"}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {viewMode === "recommended"
                ? "Complete your profile with skills and preferences to get AI-powered job matches."
                : viewMode === "saved"
                ? "Explore the market and bookmark jobs you're interested in."
                : "Try different search terms or adjust your filters."}
            </p>
            {viewMode === "browse" ? (
              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 cursor-pointer"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Ingesting Live Jobs...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Fetch Live Market Jobs
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => handleTabChange("browse")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200 cursor-pointer"
              >
                <Globe className="h-4 w-4" /> Explore Market
              </button>
            )}
          </div>
        ) : (
          /* Job Grid */
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {jobs.map((job) => (
                <ExternalJobCard
                  key={job.id}
                  job={job}
                  isSaved={savedJobIds.has(job.id) || viewMode === "saved"}
                  onSave={handleSave}
                  onClick={handleCardClick}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Job Detail Slide-over */}
      <ExternalJobDetail
        job={selectedJob}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedJob(null);
        }}
        onSave={handleSave}
        onApply={handleApply}
        isSaved={selectedJob ? savedJobIds.has(selectedJob.id) : false}
      />
    </div>
  );
}

