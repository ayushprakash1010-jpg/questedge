"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronRight, Download, RefreshCw, CheckSquare,
  Square, Users, X, Clock, AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/skeletons";
import { EmptyState, ErrorState } from "@/components/feedback";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  userType: string;
  isActive: boolean;
  orgId: string;
  orgName: string;
  createdAt: string;
}

const ROLES = ["ADMIN", "HR", "HIRING_MANAGER", "INTERVIEWER", "VIEWER", "SUPPORT_REP", "SUPPORT_ADMIN"];
const USER_TYPES = ["COMPANY_ADMIN", "COMPANY_USER", "CANDIDATE", "RECRUITER", "PLATFORM_ADMIN"];
const POLL_INTERVAL = 30_000;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  // Bulk select state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"activate" | "deactivate">("deactivate");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, roleFilter, userTypeFilter, activeFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (userTypeFilter) params.set("userType", userTypeFilter);
      if (activeFilter) params.set("isActive", activeFilter);
      const res = await fetch(`/api/support/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      const json = await res.json();
      setUsers(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
      setTotalPages(json.meta?.totalPages ?? 1);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, userTypeFilter, activeFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useAutoRefresh(fetchUsers, POLL_INTERVAL, autoRefresh);

  function clearFilters() {
    setSearchInput(""); setRoleFilter(""); setUserTypeFilter(""); setActiveFilter("");
  }

  // --- Selection helpers ---
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  }

  function toggleUser(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // --- Bulk action ---
  async function executeBulkAction() {
    if (selected.size === 0 || !bulkReason.trim()) return;
    setBulkLoading(true); setBulkResult(null);
    try {
      const res = await fetch("/api/support/users/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selected),
          action: bulkAction,
          reason: bulkReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Bulk action failed");
      setBulkResult(json.message ?? "Done");
      setSelected(new Set());
      setShowBulkPanel(false);
      setBulkReason("");
      await fetchUsers();
    } catch (e: any) {
      setBulkResult(`Error: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  // --- CSV Export ---
  async function exportCsv() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (userTypeFilter) params.set("userType", userTypeFilter);
    if (activeFilter) params.set("isActive", activeFilter);
    try {
      const res = await fetch(`/api/support/users/export?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `platform-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  }

  const hasFilters = searchInput || roleFilter || userTypeFilter || activeFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Users
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-org user directory
            {!loading && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs" aria-live="polite">
                — {total.toLocaleString()} users
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Auto-refresh toggle */}
          <button
            id="users-toggle-refresh"
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
            id="users-refresh"
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 rounded-md border px-3 text-xs hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {someSelected && (
            <button
              id="users-bulk-action-btn"
              onClick={() => setShowBulkPanel(true)}
              className="flex items-center gap-1.5 h-9 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-600 px-3 text-xs font-medium hover:bg-amber-500/20 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Bulk Action ({selected.size})
            </button>
          )}
          <button
            id="users-export-csv"
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

      {/* Bulk result */}
      {bulkResult && (
        <div className={`rounded-md border px-4 py-2 text-sm flex items-center justify-between ${
          bulkResult.startsWith("Error") ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
        }`}>
          <span>{bulkResult}</span>
          <button onClick={() => setBulkResult(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Bulk Action Panel */}
      {showBulkPanel && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Bulk Action — {selected.size} user(s) selected
            </p>
            <button onClick={() => setShowBulkPanel(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2">
              <button
                id="bulk-deactivate-btn"
                onClick={() => setBulkAction("deactivate")}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${bulkAction === "deactivate" ? "bg-red-500 text-white border-red-500" : "hover:bg-accent"}`}
              >
                Deactivate
              </button>
              <button
                id="bulk-activate-btn"
                onClick={() => setBulkAction("activate")}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${bulkAction === "activate" ? "bg-emerald-500 text-white border-emerald-500" : "hover:bg-accent"}`}
              >
                Activate
              </button>
            </div>
            <input
              id="bulk-reason-input"
              type="text"
              placeholder="Reason (required, min 5 chars)…"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              className="flex-1 min-w-[200px] h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              id="bulk-execute-btn"
              onClick={executeBulkAction}
              disabled={bulkLoading || bulkReason.trim().length < 5}
              className="flex items-center gap-1.5 h-8 rounded-md bg-primary text-primary-foreground px-4 text-xs font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {bulkLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3" role="search" aria-label="Filter users">
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="user-search"
            type="search"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <label htmlFor="user-role-filter" className="sr-only">Role</label>
        <select
          id="user-role-filter"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label htmlFor="user-type-filter" className="sr-only">User Type</label>
        <select
          id="user-type-filter"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {USER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label htmlFor="user-status-filter" className="sr-only">Status</label>
        <select
          id="user-status-filter"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {hasFilters && (
          <button
            id="user-clear-filters"
            onClick={clearFilters}
            className="flex items-center gap-1.5 h-9 rounded-md border px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Users table" aria-busy={loading}>
          <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                <button
                  id="users-select-all"
                  onClick={toggleAll}
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Name</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Email</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Organization</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Role</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold sr-only">Actions</th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={7} rows={8} />
          ) : error ? (
            <tbody><tr><td colSpan={7}><ErrorState message={error} onRetry={fetchUsers} /></td></tr></tbody>
          ) : users.length === 0 ? (
            <tbody><tr><td colSpan={7}><EmptyState title="No users found" description="Try adjusting your search or filters." /></td></tr></tbody>
          ) : (
            <tbody className="divide-y">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-muted/20 transition-colors ${selected.has(user.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleUser(user.id)}
                      aria-label={`${selected.has(user.id) ? "Deselect" : "Select"} ${user.name}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      {selected.has(user.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.orgName ? (
                      <Link href={`/organizations/${user.orgId}`} className="text-primary hover:underline text-sm">
                        {user.orgName}
                      </Link>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={user.role} /></td>
                  <td className="px-4 py-3"><StatusBadge value={user.isActive ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/users/${user.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      aria-label={`View details for ${user.name}`}
                    >
                      View <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>

        {/* Pagination */}
        {!loading && !error && users.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span aria-live="polite">
              {someSelected && <span className="mr-3 text-primary font-medium">{selected.size} selected · </span>}
              Page {page} of {totalPages} — {total.toLocaleString()} users
            </span>
            <nav aria-label="Pagination">
              <div className="flex gap-2">
                <button
                  id="users-prev-page"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  ← Prev
                </button>
                <button
                  id="users-next-page"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  Next →
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
