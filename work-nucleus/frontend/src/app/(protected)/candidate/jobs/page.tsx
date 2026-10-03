"use client";

import { useState, useEffect } from "react";
import { discoverJobs, getSavedJobs, toggleSaveJob, Mandate } from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { Loader2, Search, TrendingUp, Bookmark, ArrowLeft } from "lucide-react";
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
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 mb-5">
            <button
              onClick={() => router.push("/candidate/jobs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isSavedView
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Browse All Jobs
            </button>
            <button
              onClick={() => router.push("/candidate/jobs?saved=true")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSavedView
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              Saved Jobs
              {isSavedView && jobs.length > 0 && (
                <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {jobs.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isSavedView ? "Saved Jobs" : "Browse Jobs"}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isSavedView
                  ? "Jobs you've bookmarked to revisit later."
                  : "Discover top opportunities matching your profile."}
              </p>
            </div>
            {!isSavedView && (
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs by title or skill..."
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              {isSavedView ? (
                <Bookmark className="h-8 w-8 text-emerald-400" />
              ) : (
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              {isSavedView ? "No saved jobs yet" : "No jobs found"}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {isSavedView
                ? "Browse open jobs and click 'Save Job' to bookmark them here."
                : "Try adjusting your search criteria."}
            </p>
            {isSavedView && (
              <button
                onClick={() => router.push("/candidate/jobs")}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Browse Open Jobs
              </button>
            )}
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
