"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getOrgMandates, publishMandate, pauseMandate, deleteMandate, Mandate } from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  FileText,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { CardGridSkeleton } from "@/components/ui/skeleton-states";
import { MarketplaceEmptyState } from "@/components/ui/marketplace-empty-state";
import { ErrorBanner } from "@/components/ui/error-state";

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Status filter pill ───────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Paused", value: "PAUSED" },
  { label: "Filled", value: "FILLED" },
  { label: "Closed", value: "CLOSED" },
];

// ── Page ─────────────────────────────────────────────────────────

export default function MandatesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search query to prevent backend request storms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMandates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Get token from Auth0 session
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const result = await getOrgMandates(accessToken, {
        q: debouncedSearch || undefined,
        status: (statusFilter as any) || undefined,
        page,
        limit: 12,
      });
      setMandates(result.data);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to load mandates", err);
      setError(err?.message || "Failed to load job mandates from server.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  // Computed stats
  const activeCount = mandates.filter((m) => m.status === "ACTIVE").length;
  const totalReferrals = mandates.reduce((acc, m) => acc + (m._count?.referrals ?? 0), 0);
  const totalApplications = mandates.reduce((acc, m) => acc + (m._count?.applications ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mandates</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage job postings, track referrals, and monitor your hiring pipeline.
              {activeCount > 0 && (
                <a
                  href="/candidates"
                  className="ml-2 inline-flex items-center gap-0.5 font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View pipeline →
                </a>
              )}
            </p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2"
            onClick={() => router.push("/mandates/create")}
          >
            <Plus className="h-4 w-4" />
            New Mandate
          </Button>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Mandates"
            value={activeCount}
            icon={TrendingUp}
            color="bg-indigo-500"
            sub={`of ${total} total`}
          />
          <StatCard
            label="Total Referrals"
            value={totalReferrals}
            icon={Users}
            color="bg-sky-500"
          />
          <StatCard
            label="Direct Applications"
            value={totalApplications}
            icon={FileText}
            color="bg-violet-500"
          />
          <StatCard
            label="Positions Filled"
            value={mandates.filter((m) => m.status === "FILLED").length}
            icon={CheckCircle2}
            color="bg-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 bg-white border-slate-200"
              placeholder="Search mandates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  statusFilter === opt.value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6">
            <ErrorBanner
              message={error}
              onRetry={fetchMandates}
              onResetFilters={
                searchQuery || statusFilter
                  ? () => {
                      setSearchQuery("");
                      setStatusFilter("");
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Screen Reader Live Status Announcement */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {loading
            ? "Loading job mandates..."
            : mandates.length === 0
            ? "No job mandates found."
            : `Showing ${mandates.length} job ${mandates.length === 1 ? "mandate" : "mandates"}${
                total ? ` of ${total}` : ""
              }`}
        </div>

        {/* Mandate grid */}
        {loading && mandates.length === 0 ? (
          <CardGridSkeleton count={6} columns={3} />
        ) : mandates.length === 0 ? (
          debouncedSearch || statusFilter ? (
            <MarketplaceEmptyState
              preset="search"
              title="No Mandates Found"
              description="No mandates match your active search keyword or status filter. Try clearing filters to see all postings."
              secondaryAction={{
                label: "Clear filters",
                onClick: () => {
                  setSearchQuery("");
                  setStatusFilter("");
                },
              }}
            />
          ) : (
            <MarketplaceEmptyState
              preset="mandates"
              primaryAction={{
                label: "Create First Mandate",
                onClick: () => router.push("/mandates/create"),
                icon: Plus,
              }}
            />
          )
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mandates.map((mandate) => (
                <MandateCard
                  key={mandate.id}
                  {...mandate}
                  recruiterCount={mandate._count?.participations}
                  referralCount={mandate._count?.referrals}
                  viewAs="company"
                  onClick={(id) => router.push(`/mandates/${id}`)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
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
    </div>
  );
}
