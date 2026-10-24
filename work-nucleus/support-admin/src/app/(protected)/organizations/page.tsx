"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Search, Users, ClipboardList, Ticket,
  ChevronLeft, ChevronRight, Download, RefreshCw, Clock, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

interface Org {
  id: string;
  name: string;
  industry: string | null;
  createdAt: string;
  _count: { users: number; hiringPlans: number; supportTickets: number };
  healthScore: number | null;
  riskFlags: string[];
}

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail",
  "Manufacturing", "Media", "Consulting", "Real Estate", "Other",
];

const POLL_INTERVAL = 30_000;

function HealthBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="outline" className="text-xs">N/A</Badge>;
  if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-800 text-xs">{score}</Badge>;
  if (score >= 50) return <Badge className="bg-amber-100 text-amber-800 text-xs">{score}</Badge>;
  return <Badge className="bg-red-100 text-red-800 text-xs">{score}</Badge>;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [riskOnly, setRiskOnly] = useState(false);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, industry, riskOnly]);

  const fetchOrgs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (industry) params.set("industry", industry);
      const res = await fetch(`/api/support/organizations?${params}`);
      if (!res.ok) throw new Error("Failed to load organizations");
      const json = await res.json();
      let data: Org[] = json.data ?? [];
      if (riskOnly) data = data.filter((o) => o.riskFlags?.length > 0 || (o.healthScore !== null && o.healthScore < 50));
      setOrgs(data);
      setTotal(json.meta?.total ?? 0);
      setTotalPages(json.meta?.totalPages ?? 1);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, industry, riskOnly]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);
  useAutoRefresh(fetchOrgs, POLL_INTERVAL, autoRefresh);

  async function exportCsv() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (industry) params.set("industry", industry);
    try {
      const res = await fetch(`/api/support/organizations/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `organizations-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Organizations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and inspect client organizations
            {!loading && (
              <span className="ml-2 text-xs" aria-live="polite">— {total.toLocaleString()} total</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="orgs-toggle-refresh"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 h-9 rounded-md border px-3 text-xs font-medium transition-colors ${
              autoRefresh
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                : "border-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button
            id="orgs-refresh"
            onClick={fetchOrgs}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 rounded-md border px-3 text-xs hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            id="orgs-export-csv"
            onClick={exportCsv}
            className="flex items-center gap-1.5 h-9 rounded-md bg-primary text-primary-foreground px-3 text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Last refreshed */}
      {lastRefreshed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
          {autoRefresh && <span className="ml-1 text-emerald-500">(auto-refreshing every 30s)</span>}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="orgs-search"
            type="search"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search organizations…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <label htmlFor="orgs-industry-filter" className="sr-only">Industry</label>
        <select
          id="orgs-industry-filter"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            id="orgs-risk-filter"
            type="checkbox"
            className="rounded"
            checked={riskOnly}
            onChange={(e) => setRiskOnly(e.target.checked)}
          />
          <span className="flex items-center gap-1 text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Risk only
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button onClick={fetchOrgs} className="ml-3 underline text-primary">Retry</button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">No organizations found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <CardTitle className="text-base truncate">{org.name}</CardTitle>
                    </div>
                    <HealthBadge score={org.healthScore} />
                  </div>
                  {org.industry && (
                    <p className="text-xs text-muted-foreground">{org.industry}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {org._count.users}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5" /> {org._count.hiringPlans}
                    </span>
                    <span className="flex items-center gap-1">
                      <Ticket className="h-3.5 w-3.5" /> {org._count.supportTickets}
                    </span>
                  </div>
                  {org.riskFlags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(org.riskFlags as string[]).map((flag, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">{flag}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Added {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            id="orgs-prev-page"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            id="orgs-next-page"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-accent transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
