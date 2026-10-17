"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/skeletons";
import { EmptyState, ErrorState } from "@/components/feedback";

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, roleFilter, userTypeFilter, activeFilter]);
  useEffect(() => { fetchUsers(); }, [page, search, roleFilter, userTypeFilter, activeFilter]);

  async function fetchUsers() {
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
      setUsers(json.data); setTotal(json.meta.total); setTotalPages(json.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function clearFilters() {
    setSearchInput(""); setRoleFilter(""); setUserTypeFilter(""); setActiveFilter("");
  }

  const hasFilters = searchInput || roleFilter || userTypeFilter || activeFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Cross-org user directory
          {!loading && <> — <span aria-live="polite">{total.toLocaleString()} users</span></>}
        </p>
      </div>

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
            aria-label="Search users by name or email"
          />
        </div>
        <label htmlFor="user-role-filter" className="sr-only">Filter by role</label>
        <select
          id="user-role-filter"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label htmlFor="user-type-filter" className="sr-only">Filter by user type</label>
        <select
          id="user-type-filter"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {USER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label htmlFor="user-status-filter" className="sr-only">Filter by status</label>
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
            aria-label="Clear all filters"
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
              <th scope="col" className="px-4 py-3 text-left font-semibold">Name</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Email</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Organization</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Role</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold sr-only">Actions</th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton cols={6} rows={8} />
          ) : error ? (
            <tbody><tr><td colSpan={6}><ErrorState message={error} onRetry={fetchUsers} /></td></tr></tbody>
          ) : users.length === 0 ? (
            <tbody><tr><td colSpan={6}><EmptyState title="No users found" description="Try adjusting your search or filters." /></td></tr></tbody>
          ) : (
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
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
                      View <ChevronRight className="h-3 w-3" aria-hidden="true" />
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
            <span aria-live="polite">Page {page} of {totalPages} — {total.toLocaleString()} users</span>
            <nav aria-label="Pagination">
              <div className="flex gap-2">
                <button
                  id="users-prev-page"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent transition-colors"
                  aria-label="Previous page"
                >
                  ← Prev
                </button>
                <button
                  id="users-next-page"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent transition-colors"
                  aria-label="Next page"
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
