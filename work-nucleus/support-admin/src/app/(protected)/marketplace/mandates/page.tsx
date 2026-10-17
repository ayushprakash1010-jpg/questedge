"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";

interface Mandate {
  id: string;
  title: string;
  orgId: string;
  orgName: string;
  status: string;
  participationType: string;
  referralRewardAmount?: number;
  numberOfOpenings: number;
  participationCount: number;
  referralCount: number;
  applicationCount: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  DRAFT: "bg-amber-100 text-amber-700",
  PAUSED: "bg-orange-100 text-orange-700",
  CLOSED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-red-100 text-red-600",
};

const STATUSES = ["ACTIVE", "DRAFT", "PAUSED", "CLOSED", "CANCELLED"];

export default function MandatesPage() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 300); return () => clearTimeout(t); }, [searchInput]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => { fetchMandates(); }, [page, search, statusFilter]);

  async function fetchMandates() {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) p.set("search", search);
      if (statusFilter) p.set("status", statusFilter);
      const res = await fetch(`/api/support/mandates?${p}`);
      if (!res.ok) throw new Error("Failed to load mandates");
      const json = await res.json();
      setMandates(json.data); setTotal(json.meta.total); setTotalPages(json.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mandates</h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} mandates across all organizations</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input id="mandate-search" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by title..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <select id="mandate-status-filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm animate-pulse text-muted-foreground">Loading...</div>
          : error ? <div className="p-8 text-center text-sm text-red-600">{error} <button onClick={fetchMandates} className="underline text-primary">Retry</button></div>
          : mandates.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No mandates found.</div>
          : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">Title</th>
                    <th scope="col" className="px-4 py-3 text-left">Organization</th>
                    <th scope="col" className="px-4 py-3 text-left">Status</th>
                    <th scope="col" className="px-4 py-3 text-left">Openings</th>
                    <th scope="col" className="px-4 py-3 text-left">Referrals</th>
                    <th scope="col" className="px-4 py-3 text-left">Reward</th>
                    <th scope="col" className="px-4 py-3 text-left sr-only">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mandates.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium max-w-xs truncate">{m.title}</td>
                      <td className="px-4 py-3">
                        <Link href={`/organizations/${m.orgId}`} className="text-primary hover:underline text-xs">{m.orgName}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[m.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{m.numberOfOpenings}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{m.referralCount}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {m.referralRewardAmount ? `₹${m.referralRewardAmount.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/marketplace/mandates/${m.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          View <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>Page {page} of {totalPages} — {total.toLocaleString()} mandates</span>
                <div className="flex gap-2">
                  <button id="mandates-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">← Prev</button>
                  <button id="mandates-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Next →</button>
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
