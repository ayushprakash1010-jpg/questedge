"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Briefcase, DollarSign, Filter, X,
  Building2, Clock, Users, ArrowRight, Sparkles, Target,
  ChevronLeft, ChevronRight, SlidersHorizontal,
} from "lucide-react";
import type { Mandate, MandateFilters } from "@/lib/marketplace-api";
import { publicDiscoverMandates } from "@/lib/marketplace-api";

// ─── Filter Config ────────────────────────────────────────────────

const WORK_MODELS = ["Remote", "Hybrid", "On-site"];
const EXPERIENCE_LEVELS = ["0-2 years", "2-5 years", "5-10 years", "10+ years"];
const DOMAINS = [
  "Engineering", "Product", "Design", "Sales", "Marketing",
  "Operations", "Finance", "HR", "Data", "Legal",
];

// ─── Mandate Card ─────────────────────────────────────────────────

function MandateCard({ mandate }: { mandate: Mandate }) {
  const router = useRouter();

  const reward = mandate.referralRewardAmount;
  const skills = mandate.mandatorySkills.slice(0, 3);
  const hasMore = mandate.mandatorySkills.length > 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group spring-lift flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-400 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm">
          {mandate.organization.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {mandate.title}
          </h3>
          <p className="text-sm text-slate-500">{mandate.organization.name}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {mandate.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {mandate.location}
          </span>
        )}
        {mandate.workModel && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> {mandate.workModel}
          </span>
        )}
        {mandate.requiredExperience && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {mandate.requiredExperience}
          </span>
        )}
        {mandate._count && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {mandate._count.referrals} referrals
          </span>
        )}
      </div>

      {/* Skills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
          >
            {skill}
          </span>
        ))}
        {hasMore && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            +{mandate.mandatorySkills.length - 3} more
          </span>
        )}
      </div>

      {/* Reward + CTA */}
      <div className="mt-auto pt-4 flex items-center justify-between">
        {reward ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">
              ₹{reward.toLocaleString("en-IN")} reward
            </span>
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={() => router.push("/auth/login")}
          className="group/btn flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-700"
        >
          Refer a Candidate
          <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="col-span-full py-24 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Search className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">No mandates found</h3>
      <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or search term.</p>
      <button
        onClick={onReset}
        className="mt-6 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Clear all filters
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function JobsPage() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [domain, setDomain] = useState("");
  const [experience, setExperience] = useState("");
  const [minReward, setMinReward] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: MandateFilters = {
        page,
        limit: 12,
        ...(search && { q: search }),
        ...(workModel && { workModel }),
        ...(domain && { department: domain }),
        ...(minReward && { minReward }),
      };
      const result = await publicDiscoverMandates(filters);
      setMandates(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch {
      setError("Unable to load mandates. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, workModel, domain, minReward]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  const resetFilters = () => {
    setSearch("");
    setWorkModel("");
    setDomain("");
    setExperience("");
    setMinReward(undefined);
    setPage(1);
  };

  const activeFilterCount = [search, workModel, domain, experience, minReward].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ─── Hero strip ─── */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 py-14 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-200">
            <Sparkles className="h-3 w-3" /> Live Marketplace
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
            Browse Open Mandates
          </h1>
          <p className="mt-3 text-base text-indigo-200">
            {total > 0 ? (
              <><span className="font-bold text-white">{total}</span> active roles — refer a great candidate and earn a reward</>
            ) : (
              "Find roles and refer trusted candidates from your network"
            )}
          </p>
        </motion.div>

        {/* Search bar */}
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by role, skill, or company..."
              className="w-full rounded-2xl border-0 bg-white py-4 pl-11 pr-4 text-sm text-slate-800 shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {/* Quick filter chips */}
        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
          {WORK_MODELS.map((wm) => (
            <button
              key={wm}
              onClick={() => { setWorkModel(workModel === wm ? "" : wm); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                workModel === wm
                  ? "bg-white text-indigo-700"
                  : "bg-white/10 text-indigo-100 hover:bg-white/20"
              }`}
            >
              {wm}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Recruiter Banner ─── */}
      <div className="bg-violet-50 border-b border-violet-100 py-4 px-4 text-center">
        <p className="text-sm text-violet-800">
          <Target className="inline h-4 w-4 mr-1 mb-0.5" />
          <strong>Are you a recruiter?</strong> Join the marketplace to refer candidates and earn referral rewards.{" "}
          <a href="/auth/login" className="font-semibold underline underline-offset-2 hover:text-violet-600">
            Join free →
          </a>
        </p>
      </div>

      {/* ─── Content ─── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{total}</span> mandates
            </p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="text-xs text-indigo-600 hover:underline">
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-6">
          {/* ─── Sidebar Filters ─── */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="w-56 shrink-0"
              >
                <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                    {activeFilterCount > 0 && (
                      <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-slate-600">
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Domain */}
                  <div className="mb-5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Domain</label>
                    <div className="space-y-1.5">
                      {DOMAINS.map((d) => (
                        <button
                          key={d}
                          onClick={() => { setDomain(domain === d ? "" : d); setPage(1); }}
                          className={`w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                            domain === d
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Min Reward */}
                  <div className="mb-5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Min Reward (₹)
                    </label>
                    <input
                      type="number"
                      value={minReward ?? ""}
                      onChange={(e) => { setMinReward(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
                      placeholder="e.g. 50000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Experience</label>
                    <div className="space-y-1.5">
                      {EXPERIENCE_LEVELS.map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => { setExperience(experience === lvl ? "" : lvl); setPage(1); }}
                          className={`w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                            experience === lvl
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ─── Cards Grid ─── */}
          <div className="flex-1">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-slate-200" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-full rounded bg-slate-100" />
                      <div className="h-3 w-2/3 rounded bg-slate-100" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-6 w-16 rounded-full bg-slate-100" />
                      <div className="h-6 w-20 rounded-full bg-slate-100" />
                    </div>
                    <div className="mt-4 flex justify-between">
                      <div className="h-7 w-28 rounded-lg bg-slate-100" />
                      <div className="h-7 w-28 rounded-lg bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
                {error}
              </div>
            ) : (
              <>
                <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {mandates.length === 0 ? (
                      <EmptyState onReset={resetFilters} />
                    ) : (
                      mandates.map((m) => <MandateCard key={m.id} mandate={m} />)
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
