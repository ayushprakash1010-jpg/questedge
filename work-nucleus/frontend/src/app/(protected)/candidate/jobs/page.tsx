"use client";

import { useState, useEffect } from "react";
import { discoverJobs, getSavedJobs, toggleSaveJob, Mandate } from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { Loader2, Search, TrendingUp, Bookmark, Briefcase, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CandidateJobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSavedView = searchParams.get("saved") === "true";

  const [jobs, setJobs] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      if (isSavedView) {
        // Fetch only saved jobs
        const savedRaw = await getSavedJobs(accessToken);
        // savedRaw is array of { id, mandate: {...}, ... }
        const mandates = savedRaw.map((s: any) => ({ ...s.mandate, isSaved: true }));
        setJobs(mandates);
      } else {
        // Fetch all jobs
        const result = await discoverJobs(accessToken, { q: search || undefined });
        setJobs(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSavedView) {
      fetchJobs();
      return;
    }
    const timer = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isSavedView]);

  const handleSave = async (mandateId: string) => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const { saved } = await toggleSaveJob(accessToken, mandateId);
      if (isSavedView && !saved) {
        // Remove from saved view if unsaved
        setJobs((prev) => prev.filter((j) => j.id !== mandateId));
      } else {
        setJobs((prev) => prev.map((j) => (j.id === mandateId ? { ...j, isSaved: saved } : j)));
      }
    } catch (err) {
      console.error(err);
    }
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
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => router.push("/candidate/jobs")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !isSavedView
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Browse All Jobs
                </button>
                <button
                  onClick={() => router.push("/candidate/jobs?saved=true")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSavedView
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  Saved Jobs
                  {isSavedView && jobs.length > 0 && (
                    <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {jobs.length}
                    </span>
                  )}
                </button>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                {isSavedView ? (
                  <>Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Saved</span> Jobs</>
                ) : (
                  <>Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Opportunities</span></>
                )}
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl">
                {isSavedView
                  ? "Jobs you've bookmarked to revisit later. Apply when you're ready."
                  : "Browse top opportunities that match your profile. Save the ones you love, get referred by top recruiters."}
              </p>
            </div>

            {/* Glassmorphic Search Bar */}
            {!isSavedView && (
              <div className="w-full md:w-[400px] lg:w-[450px]">
                <div className="relative group">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 blur opacity-30 group-focus-within:opacity-100 transition duration-500" />
                  <div className="relative flex items-center w-full bg-slate-900/80 backdrop-blur-md rounded-xl ring-1 ring-white/10 overflow-hidden shadow-2xl transition-all focus-within:ring-emerald-500/50">
                    <div className="pl-4 pr-2 text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
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
              <p className="text-sm text-slate-400">Searching for the best opportunities...</p>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {/* Premium empty state with layered card effect */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-100 rounded-3xl rotate-6 scale-105 opacity-40" />
              <div className="absolute inset-0 bg-teal-50 rounded-3xl -rotate-3 scale-102 opacity-60" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-inner">
                {isSavedView ? (
                  <Bookmark className="h-10 w-10 text-emerald-400" />
                ) : (
                  <Briefcase className="h-10 w-10 text-emerald-400" />
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {isSavedView ? "No saved jobs yet" : "No jobs found"}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              {isSavedView
                ? "When you find a job you love, click the bookmark icon to save it here for later."
                : "Try adjusting your search terms, or check back soon — new opportunities are posted daily."}
            </p>
            <button
              onClick={() => isSavedView ? router.push("/candidate/jobs") : router.push("/candidate/dashboard")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5"
            >
              {isSavedView ? (
                <><TrendingUp className="h-4 w-4" /> Browse Open Jobs</>
              ) : (
                <><ArrowRight className="h-4 w-4" /> Back to Dashboard</>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <MandateCard
                key={job.id}
                {...job}
                viewAs="candidate"
                isSaved={job.isSaved ?? isSavedView}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
