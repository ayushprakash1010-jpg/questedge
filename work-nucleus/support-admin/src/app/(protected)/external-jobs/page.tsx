"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Briefcase,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Globe,
  Radio,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

interface ExternalJobItem {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  location?: string;
  isRemote: boolean;
  workplaceType?: string;
  sourceName: string;
  applyUrl: string;
  isActive: boolean;
  postedAt?: string;
  lastVerifiedAt?: string;
  lastSyncedAt?: string;
}

interface StatsData {
  total: number;
  active: number;
  inactive: number;
  sources: Array<{ sourceName: string; count: number }>;
  syncStatus?: {
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    message: string;
  };
}

export default function ExternalJobsPage() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === "SUPPORT_ADMIN";

  const [stats, setStats] = useState<StatsData | null>(null);
  const [jobs, setJobs] = useState<ExternalJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Actions state
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/support/external-jobs/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error("Failed to load stats", e);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (sourceFilter) params.set("sourceName", sourceFilter);
      if (statusFilter === "active") params.set("isActive", "true");
      if (statusFilter === "inactive") params.set("isActive", "false");

      const res = await fetch(`/api/support/external-jobs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setJobs(json.data || []);
      setTotal(json.meta?.total || 0);
      setTotalPages(json.meta?.totalPages || 1);
    } catch (e: any) {
      setError(e.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, statusFilter]);

  useEffect(() => {
    loadStats();
    loadJobs();
  }, [loadStats, loadJobs]);

  async function handleVerifyUrls() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/support/external-jobs/verify-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 30 }),
      });
      if (res.ok) {
        const result = await res.json();
        setVerifyResult(result);
        await Promise.all([loadStats(), loadJobs()]);
      } else {
        alert("Failed to run URL verification");
      }
    } catch (e: any) {
      alert(`Verification failed: ${e.message}`);
    } finally {
      setVerifying(false);
    }
  }

  async function handleTriggerSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/support/external-jobs/sync", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSyncMessage(data.message || "Sync initiated in background.");
        setTimeout(() => {
          loadStats();
          loadJobs();
        }, 5000);
      }
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleActive(job: ExternalJobItem) {
    if (!isAdmin) return;
    const actionLabel = job.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionLabel} "${job.title}" at ${job.companyName}?`)) {
      return;
    }
    setTogglingId(job.id);
    try {
      const res = await fetch(`/api/support/external-jobs/${job.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: `Admin manual ${actionLabel}`,
        }),
      });
      if (res.ok) {
        await Promise.all([loadStats(), loadJobs()]);
      }
    } catch (e) {
      console.error("Toggle error", e);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            External Jobs Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor aggregated ATS job feeds, on-demand link verification, and closed role deactivation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadStats();
              loadJobs();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 rounded-md border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Aggregated Jobs</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats?.total?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Across all connected job boards</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Live Active Jobs</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">{stats?.active?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Available for candidate search</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Deactivated / Closed</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-500">{stats?.inactive?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Dead links automatically culled</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active ATS Connectors</span>
            <Radio className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats?.sources?.length ?? "8"} Sources</p>
          <p className="text-xs text-muted-foreground mt-0.5">Greenhouse, Ashby, Lever, etc.</p>
        </div>
      </div>

      {/* Quick Action Operations Panel */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-semibold">Feed Health & Verification Actions</h2>
            <p className="text-xs text-muted-foreground">Trigger automated URL audits or refresh ATS postings</p>
          </div>
          {stats?.syncStatus && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 border text-slate-700">
              Sync: {stats.syncStatus.status}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Verify URLs Action */}
          <div className="rounded-lg border p-4 bg-muted/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-sm">Automated URL Verification Audit</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Probes active job URLs with HTTP head/get checks. Immediately deactivates confirmed 404/410 closed positions.
              </p>
            </div>
            <div>
              <button
                onClick={handleVerifyUrls}
                disabled={verifying}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
              >
                <Play className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
                {verifying ? "Auditing 30 Job URLs..." : "Run URL Health Audit (30 Jobs)"}
              </button>
            </div>
          </div>

          {/* Trigger Market Sync Action */}
          <div className="rounded-lg border p-4 bg-muted/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-sm">Full Market Sync & Ingestion</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fetches latest positions from all ATS and remote aggregators, seeds new sources, and recomputes match vectors.
              </p>
            </div>
            <div>
              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Initiating Market Sync..." : "Trigger Market Sync"}
              </button>
            </div>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {verifyResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Audit Completed:</strong> Checked {verifyResult.checked} jobs • {verifyResult.deactivated} closed roles deactivated • {verifyResult.verified} live roles confirmed in {verifyResult.durationMs}ms.
              </span>
            </div>
            <button onClick={() => setVerifyResult(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}

        {/* Sync message banner */}
        {syncMessage && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-blue-700 hover:text-blue-900 font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by job title or company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-2 text-xs font-medium focus:outline-none"
          >
            <option value="">All Sources</option>
            {stats?.sources?.map((s) => (
              <option key={s.sourceName} value={s.sourceName}>
                {s.sourceName} ({s.count})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-2 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Live Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Jobs Directory Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No external jobs match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Role & Company</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Location / Work Mode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Verified</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground">{job.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {job.companyName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 border px-2 py-0.5 text-xs font-mono text-slate-700">
                        {job.sourceName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>{job.location || "Remote / Unspecified"}</div>
                      {job.isRemote && (
                        <span className="inline-block mt-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5">
                          Remote
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {job.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border px-2 py-0.5 text-xs font-medium text-slate-500">
                          <XCircle className="h-3 w-3" /> Closed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {job.lastVerifiedAt ? (
                        <span title={new Date(job.lastVerifiedAt).toLocaleString()}>
                          {new Date(job.lastVerifiedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-muted"
                          title="Open original application link in new tab"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleActive(job)}
                            disabled={togglingId === job.id}
                            className={`text-xs px-2.5 py-1 rounded border font-medium transition ${
                              job.isActive
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-green-200 text-green-600 hover:bg-green-50"
                            } disabled:opacity-50`}
                          >
                            {togglingId === job.id
                              ? "..."
                              : job.isActive
                              ? "Deactivate"
                              : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && jobs.length > 0 && (
          <div className="flex items-center justify-between border-t px-5 py-3 bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing {jobs.length} of {total.toLocaleString()} external jobs (Page {page} of {totalPages})
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded border px-2.5 py-1 hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded border px-2.5 py-1 hover:bg-accent disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
