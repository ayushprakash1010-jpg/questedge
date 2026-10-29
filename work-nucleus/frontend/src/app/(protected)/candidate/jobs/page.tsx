"use client";

import { useState, useEffect } from "react";
import {
  discoverJobs,
  getSavedJobs,
  toggleSaveJob,
  getCandidateRecommendations,
  Mandate,
  MatchEvaluationResult,
} from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { AiMatchModal } from "@/components/marketplace/ai-match-modal";
import {
  Loader2,
  Search,
  TrendingUp,
  Bookmark,
  Briefcase,
  MapPin,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface EnhancedMandate extends Mandate {
  aiMatchScore?: number;
  aiMatchVerdict?: string;
  matchResult?: MatchEvaluationResult;
}

export default function CandidateJobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSavedParam = searchParams.get("saved") === "true";
  const isAiParam = searchParams.get("ai") === "true";

  const [viewMode, setViewMode] = useState<"all" | "ai" | "saved">(
    isSavedParam ? "saved" : isAiParam ? "ai" : "all",
  );

  const [jobs, setJobs] = useState<EnhancedMandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal State
  const [selectedMandate, setSelectedMandate] = useState<EnhancedMandate | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  useEffect(() => {
    if (isSavedParam) setViewMode("saved");
    else if (isAiParam) setViewMode("ai");
    else setViewMode("all");
  }, [isSavedParam, isAiParam]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      if (viewMode === "saved") {
        // Fetch saved jobs
        const savedRaw = await getSavedJobs(accessToken);
        const mandates = savedRaw.map((s: any) => ({
          ...s.mandate,
          isSaved: true,
        }));
        setJobs(mandates);
        setTotal(mandates.length);
        setTotalPages(1);
      } else if (viewMode === "ai") {
        // Fetch AI Recommended jobs with match scores
        const recommendations = await getCandidateRecommendations(accessToken, 15);
        const mapped: EnhancedMandate[] = recommendations
          .filter((item) => item?.mandate && item?.match)
          .map((item) => ({
            ...item.mandate,
            status: ((item.mandate as any).status as any) || "ACTIVE",
            organization: item.mandate.organization || { id: "", name: "Company" },
            aiMatchScore: item.match.matchScore,
            aiMatchVerdict: item.match.verdict,
            matchResult: item.match,
          }));
        setJobs(mapped);
        setTotal(mapped.length);
        setTotalPages(1);
      } else {
        // Fetch all jobs
        const result = await discoverJobs(accessToken, {
          q: search || undefined,
          page,
          limit: 12,
        });
        setJobs(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages || 1);
      }
    } catch (err) {
      console.error("Error loading candidate jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "saved" || viewMode === "ai") {
      fetchJobs();
      return;
    }
    const timer = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, viewMode]);

  const handleSave = async (mandateId: string) => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const { saved } = await toggleSaveJob(accessToken, mandateId);
      if (viewMode === "saved" && !saved) {
        setJobs((prev) => prev.filter((j) => j.id !== mandateId));
      } else {
        setJobs((prev) =>
          prev.map((j) => (j.id === mandateId ? { ...j, isSaved: saved } : j)),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardClick = (job: EnhancedMandate) => {
    setSelectedMandate(job);
    setIsMatchModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Premium Dark Hero Banner ────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 px-6 py-10 md:py-14">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-slate-900 to-slate-900" />
        <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute right-10 bottom-0 h-[200px] w-[200px] rounded-full bg-teal-500/8 blur-[60px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              {/* Tab switcher in banner */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <button
                  onClick={() => {
                    setPage(1);
                    setViewMode("all");
                    router.push("/candidate/jobs");
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "all"
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Browse All Jobs
                </button>

                <button
                  onClick={() => {
                    setPage(1);
                    setViewMode("ai");
                    router.push("/candidate/jobs?ai=true");
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "ai"
                      ? "bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-emerald-300 ring-1 ring-indigo-400/40 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  AI Recommended
                  <span className="bg-indigo-500/40 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    Gemini 2.5
                  </span>
                </button>

                <button
                  onClick={() => {
                    setPage(1);
                    setViewMode("saved");
                    router.push("/candidate/jobs?saved=true");
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "saved"
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  Saved Jobs
                  {viewMode === "saved" && jobs.length > 0 && (
                    <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {jobs.length}
                    </span>
                  )}
                </button>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                {viewMode === "saved" ? (
                  <>
                    Your{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                      Saved
                    </span>{" "}
                    Jobs
                  </>
                ) : viewMode === "ai" ? (
                  <>
                    AI{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                      Smart Matches
                    </span>{" "}
                    for You
                  </>
                ) : (
                  <>
                    Discover{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                      Opportunities
                    </span>
                  </>
                )}
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl">
                {viewMode === "saved"
                  ? "Jobs you've bookmarked to revisit later. Click any card to inspect AI competency fit."
                  : viewMode === "ai"
                  ? "Ranked in real time by Google Gemini AI based on your skills, experience, CTC expectations, and notice period."
                  : "Browse top opportunities across verified companies. Click any job to see your instant AI match score."}
              </p>
            </div>

            {/* Glassmorphic Search Bar */}
            {viewMode === "all" && (
              <div className="w-full md:w-[400px] lg:w-[450px]">
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 blur opacity-30 group-focus-within:opacity-100 transition duration-500" />
                  <div className="relative flex items-center w-full bg-slate-900/80 backdrop-blur-md rounded-xl ring-1 ring-white/10 overflow-hidden shadow-2xl transition-all focus-within:ring-emerald-500/50">
                    <div className="pl-4 pr-2 text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search jobs by title or skill..."
                      className="w-full py-3.5 bg-transparent border-0 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {viewMode === "ai"
                  ? "Evaluating talent pool with Google Gemini 2.5 AI..."
                  : "Searching for the best opportunities..."}
              </p>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-100 rounded-3xl rotate-6 scale-105 opacity-40" />
              <div className="absolute inset-0 bg-teal-50 rounded-3xl -rotate-3 scale-102 opacity-60" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-inner">
                {viewMode === "saved" ? (
                  <Bookmark className="h-10 w-10 text-emerald-400" />
                ) : viewMode === "ai" ? (
                  <Sparkles className="h-10 w-10 text-indigo-400" />
                ) : (
                  <Briefcase className="h-10 w-10 text-emerald-400" />
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {viewMode === "saved"
                ? "No saved jobs yet"
                : viewMode === "ai"
                ? "No AI recommendations yet"
                : "No jobs found"}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              {viewMode === "saved"
                ? "When you find a job you love, click the bookmark icon to save it here for later."
                : viewMode === "ai"
                ? "Complete your profile skills and preferences to unlock personalized AI matching."
                : "Try adjusting your search terms, or check back soon — new opportunities are posted daily."}
            </p>
            <button
              onClick={() => {
                if (viewMode === "ai") router.push("/candidate/profile");
                else {
                  setViewMode("all");
                  router.push("/candidate/jobs");
                }
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5"
            >
              {viewMode === "ai" ? (
                <>
                  <Sparkles className="h-4 w-4" /> Update Candidate Profile
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" /> Browse Open Jobs
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <MandateCard
                  key={job.id}
                  {...job}
                  viewAs="candidate"
                  isSaved={job.isSaved ?? viewMode === "saved"}
                  aiMatchScore={job.aiMatchScore}
                  aiMatchVerdict={job.aiMatchVerdict}
                  onSave={handleSave}
                  onClick={() => handleCardClick(job)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {viewMode === "all" && totalPages > 1 && (
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* AI Match Detail Modal */}
      <AiMatchModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        mandate={selectedMandate}
        onSave={handleSave}
        isSaved={selectedMandate?.isSaved ?? false}
        preloadedMatch={selectedMandate?.matchResult ?? null}
      />
    </div>
  );
}
