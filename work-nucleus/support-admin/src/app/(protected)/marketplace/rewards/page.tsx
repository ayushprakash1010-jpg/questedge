"use client";

import { useEffect, useState } from "react";
import { Trophy, Search } from "lucide-react";

interface Reward {
  id: string;
  status: string;
  currency: string;
  rewardAmount: number | null;
  recruiterName: string;
  recruiterEmail: string;
  mandateTitle: string;
  orgName: string;
  candidateName: string;
  candidateEmail: string;
  hiredAt?: string;
  paidAt?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ELIGIBLE: "bg-blue-100 text-blue-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  DISPUTED: "bg-red-100 text-red-600",
};

const STATUSES = ["PENDING", "ELIGIBLE", "APPROVED", "PAID", "CANCELLED", "DISPUTED"];

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetchRewards(); }, [page, statusFilter]);

  async function fetchRewards() {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) p.set("status", statusFilter);
      const res = await fetch(`/api/support/rewards?${p}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setRewards(json.data); setTotal(json.meta.total); setTotalPages(json.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reward Tracking</h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} reward entries across all organizations</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <select id="reward-status-filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm animate-pulse text-muted-foreground">Loading...</div>
          : error ? <div className="p-8 text-center text-sm text-red-600">{error} <button onClick={fetchRewards} className="underline text-primary">Retry</button></div>
          : rewards.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No rewards found.</div>
          : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">Recruiter</th>
                    <th scope="col" className="px-4 py-3 text-left">Mandate</th>
                    <th scope="col" className="px-4 py-3 text-left">Candidate</th>
                    <th scope="col" className="px-4 py-3 text-left">Status</th>
                    <th scope="col" className="px-4 py-3 text-left">Amount</th>
                    <th scope="col" className="px-4 py-3 text-left">Hired</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rewards.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{r.recruiterName}</p>
                        <p className="text-xs text-muted-foreground">{r.recruiterEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium truncate max-w-[160px]">{r.mandateTitle}</p>
                        <p className="text-xs text-muted-foreground">{r.orgName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{r.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{r.candidateEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {r.rewardAmount != null ? `₹${r.rewardAmount.toLocaleString()}` : <span className="text-muted-foreground text-xs">Hidden</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.hiredAt ? new Date(r.hiredAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>Page {page} of {totalPages} — {total.toLocaleString()} rewards</span>
                <div className="flex gap-2">
                  <button id="rewards-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">← Prev</button>
                  <button id="rewards-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Next →</button>
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
