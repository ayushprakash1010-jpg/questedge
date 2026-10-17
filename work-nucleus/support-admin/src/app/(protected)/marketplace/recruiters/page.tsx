"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, BadgeCheck, BadgeX, ChevronRight } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

interface Recruiter {
  id: string;
  name: string;
  email: string;
  headline?: string;
  specializations: string[];
  experienceYears?: number;
  isVerified: boolean;
  isActive: boolean;
  referralCount: number;
  rewardCount: number;
  createdAt: string;
}

export default function RecruitersPage() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === "SUPPORT_ADMIN";

  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, verifiedFilter, activeFilter]);
  useEffect(() => { fetchRecruiters(); }, [page, search, verifiedFilter, activeFilter]);

  async function fetchRecruiters() {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) p.set("search", search);
      if (verifiedFilter) p.set("isVerified", verifiedFilter);
      if (activeFilter) p.set("isActive", activeFilter);
      const res = await fetch(`/api/support/recruiters?${p}`);
      if (!res.ok) throw new Error("Failed to load recruiters");
      const json = await res.json();
      setRecruiters(json.data); setTotal(json.meta.total); setTotalPages(json.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleVerify(r: Recruiter) {
    if (!confirm(`Verify ${r.name} as a recruiter?`)) return;
    setVerifyingId(r.id);
    try {
      const res = await fetch(`/api/support/recruiters/${r.id}/verify`, { method: "PATCH" });
      if (!res.ok) throw new Error("Verification failed");
      setToast(`${r.name} verified successfully.`);
      setTimeout(() => setToast(""), 4000);
      fetchRecruiters();
    } catch (e: any) { alert(e.message); }
    finally { setVerifyingId(null); }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          ✓ {toast}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recruiters</h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} recruiter profiles</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="recruiter-search"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select id="recruiter-verified-filter" className="h-9 rounded-md border bg-background px-3 text-sm"
          value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
          <option value="">All Verified Status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select id="recruiter-active-filter" className="h-9 rounded-md border bg-background px-3 text-sm"
          value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="">All Activity</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>
          : error ? <div className="p-8 text-center text-sm text-red-600">{error} <button onClick={fetchRecruiters} className="underline text-primary">Retry</button></div>
          : recruiters.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No recruiters match your filters.</div>
          : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">Name</th>
                    <th scope="col" className="px-4 py-3 text-left">Specializations</th>
                    <th scope="col" className="px-4 py-3 text-left">Exp</th>
                    <th scope="col" className="px-4 py-3 text-left">Referrals</th>
                    <th scope="col" className="px-4 py-3 text-left">Verified</th>
                    <th scope="col" className="px-4 py-3 text-left">Active</th>
                    {isAdmin && <th scope="col" className="px-4 py-3 text-left">Actions</th>}
                    <th scope="col" className="px-4 py-3 text-left sr-only">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recruiters.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.specializations.slice(0, 2).map((s) => (
                            <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
                          ))}
                          {r.specializations.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{r.specializations.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.experienceYears ? `${r.experienceYears}y` : "—"}</td>
                      <td className="px-4 py-3 text-center">{r.referralCount}</td>
                      <td className="px-4 py-3">
                        {r.isVerified
                          ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
                          : <span className="inline-flex items-center gap-1 text-slate-400 text-xs"><BadgeX className="h-3.5 w-3.5" /> Unverified</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${r.isActive ? "text-green-600" : "text-slate-400"}`}>
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          {!r.isVerified && (
                            <button
                              id={`verify-recruiter-${r.id}`}
                              disabled={verifyingId === r.id}
                              onClick={() => handleVerify(r)}
                              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {verifyingId === r.id ? "Verifying…" : "Verify"}
                            </button>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Link href={`/marketplace/recruiters/${r.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          View <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>Page {page} of {totalPages} — {total.toLocaleString()} recruiters</span>
                <div className="flex gap-2">
                  <button id="recruiters-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">← Prev</button>
                  <button id="recruiters-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Next →</button>
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
