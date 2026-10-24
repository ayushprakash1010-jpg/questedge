"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield, Search, Download, RefreshCw, ChevronLeft, ChevronRight,
  Filter, X, Clock, User, Database, Zap,
} from "lucide-react";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  changes?: Record<string, unknown>;
}

const ENTITY_TYPES = ["USER", "ORGANIZATION", "TICKET", "HIRING_PLAN", "APPLICATION", "JOB"];
const POLL_INTERVAL = 30_000; // 30 s

function actionColor(action: string) {
  if (action.includes("DEACTIVAT") || action.includes("DELETE") || action.includes("SUSPEND"))
    return "text-red-500 bg-red-500/10";
  if (action.includes("ACTIVAT") || action.includes("CREAT") || action.includes("ADD"))
    return "text-emerald-500 bg-emerald-500/10";
  if (action.includes("UPDATE") || action.includes("EDIT") || action.includes("CHANGE"))
    return "text-amber-500 bg-amber-500/10";
  return "text-blue-500 bg-blue-500/10";
}

export default function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [entityType, setEntityType] = useState("");
  const [orgId, setOrgId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Expanded row for changes
  const [expanded, setExpanded] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, entityType, orgId, from, to]);

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("action", search);
      if (entityType) params.set("entityType", entityType);
      if (orgId) params.set("orgId", orgId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/support/audit-log?${params}`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      const json = await res.json();
      setEntries(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
      setTotalPages(json.meta?.totalPages ?? 1);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, entityType, orgId, from, to]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useAutoRefresh(fetchLogs, POLL_INTERVAL, autoRefresh);

  function clearFilters() {
    setSearchInput(""); setEntityType(""); setOrgId(""); setFrom(""); setTo("");
  }

  function downloadCsv() {
    const params = new URLSearchParams();
    if (search) params.set("action", search);
    if (entityType) params.set("entityType", entityType);
    if (orgId) params.set("orgId", orgId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/support/audit-log/export?${params}`, "_blank");
  }

  const hasFilters = searchInput || entityType || orgId || from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-org admin action trail
            {!loading && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs">
                — <span aria-live="polite">{total.toLocaleString()} entries</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            id="audit-toggle-refresh"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? "Pause auto-refresh" : "Enable auto-refresh"}
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
            id="audit-refresh"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 rounded-md border px-3 text-xs hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            id="audit-export-csv"
            onClick={downloadCsv}
            className="flex items-center gap-1.5 h-9 rounded-md bg-primary text-primary-foreground px-3 text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {lastRefreshed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
          {autoRefresh && <span className="ml-1 text-emerald-500">(auto-refreshing every 30s)</span>}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3" role="search" aria-label="Filter audit logs">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="audit-search"
            type="search"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Filter by action…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <label htmlFor="audit-entity-filter" className="sr-only">Entity type</label>
        <select
          id="audit-entity-filter"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All Entities</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          id="audit-orgid-filter"
          type="text"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
          placeholder="Org ID (optional)"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
        />
        <div className="flex items-center gap-1">
          <label htmlFor="audit-from" className="text-xs text-muted-foreground">From</label>
          <input
            id="audit-from"
            type="date"
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <label htmlFor="audit-to" className="text-xs text-muted-foreground">To</label>
          <input
            id="audit-to"
            type="date"
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {hasFilters && (
          <button
            id="audit-clear-filters"
            onClick={clearFilters}
            className="flex items-center gap-1.5 h-9 rounded-md border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Audit log table" aria-busy={loading}>
          <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Action</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Entity</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Actor</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">IP</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">When</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold sr-only">Details</th>
            </tr>
          </thead>
          {loading ? (
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : error ? (
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-destructive">
                  {error}
                  <button onClick={fetchLogs} className="ml-3 underline text-primary">Retry</button>
                </td>
              </tr>
            </tbody>
          ) : entries.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  No audit log entries found.
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y">
              {entries.map((entry) => (
                <>
                  <tr
                    key={entry.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${actionColor(entry.action)}`}>
                        <Zap className="h-3 w-3" />
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{entry.entityType}</span>
                        {entry.entityId && (
                          <span className="text-muted-foreground font-mono">
                            #{entry.entityId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.user ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-xs">{entry.user.name}</p>
                            <p className="text-muted-foreground text-xs">{entry.user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {entry.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <span title={new Date(entry.createdAt).toISOString()}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-primary">
                      {entry.changes ? (expanded === entry.id ? "▲ Hide" : "▼ Show") : "—"}
                    </td>
                  </tr>
                  {expanded === entry.id && entry.changes && (
                    <tr key={`${entry.id}-expanded`} className="bg-muted/30">
                      <td colSpan={6} className="px-6 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Changes / Payload</p>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80 bg-background rounded-md p-3 border max-h-48 overflow-auto">
                          {JSON.stringify(entry.changes, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          )}
        </table>

        {/* Pagination */}
        {!loading && !error && entries.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span aria-live="polite">Page {page} of {totalPages} — {total.toLocaleString()} entries</span>
            <nav aria-label="Pagination" className="flex gap-2">
              <button
                id="audit-prev-page"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                id="audit-next-page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
