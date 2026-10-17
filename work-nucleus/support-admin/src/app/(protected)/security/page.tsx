"use client";

import { useEffect, useState } from "react";
import { Shield, Clock, Search } from "lucide-react";

interface AuditEntry {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  organization?: { id: string; name: string };
}

interface SecurityEntry {
  id: string;
  orgId: string;
  eventType: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

type Tab = "audit" | "security";

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>("audit");
  const [auditData, setAuditData] = useState<AuditEntry[]>([]);
  const [secData, setSecData] = useState<SecurityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");

  useEffect(() => { setPage(1); }, [tab, actionFilter, orgFilter]);
  useEffect(() => { fetch2(); }, [tab, page, actionFilter, orgFilter]);

  async function fetch2() {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: "50" });
      if (orgFilter) p.set("orgId", orgFilter);
      if (tab === "audit") {
        if (actionFilter) p.set("action", actionFilter);
        const res = await fetch(`/api/support/audit-log?${p}`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setAuditData(json.data); setTotal(json.meta.total); setTotalPages(json.meta.totalPages);
      } else {
        if (actionFilter) p.set("eventType", actionFilter);
        const res = await fetch(`/api/support/security-log?${p}`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setSecData(json.data); setTotal(json.meta.total); setTotalPages(json.meta.totalPages);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security</h1>
          <p className="text-sm text-muted-foreground">Platform-wide audit and security event logs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {(["audit", "security"] as Tab[]).map((t) => (
          <button key={t} id={`security-tab-${t}`} onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "audit" ? "Audit Log" : "Security Events"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input id="security-action-filter" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={tab === "audit" ? "Filter by action..." : "Filter by event type..."}
            value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        </div>
        <input id="security-org-filter" className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Filter by org ID..." value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Audit Table */}
      {tab === "audit" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center text-sm animate-pulse text-muted-foreground">Loading audit log...</div> : auditData.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No audit entries found.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">Timestamp</th>
                    <th scope="col" className="px-4 py-3 text-left">User</th>
                    <th scope="col" className="px-4 py-3 text-left">Action</th>
                    <th scope="col" className="px-4 py-3 text-left">Entity</th>
                    <th scope="col" className="px-4 py-3 text-left">Org</th>
                    <th scope="col" className="px-4 py-3 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditData.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(a.createdAt).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {a.user ? <div><p className="text-xs font-medium">{a.user.name}</p><p className="text-xs text-muted-foreground">{a.user.email}</p></div> : <span className="text-xs text-muted-foreground">{a.userId.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">{a.action}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.entityType}{a.entityId ? ` · ${a.entityId.slice(0, 8)}…` : ""}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.organization?.name ?? a.orgId.slice(0, 8) + "…"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.ipAddress ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>Page {page} of {totalPages} — {total.toLocaleString()} entries</span>
                <div className="flex gap-2">
                  <button id="audit-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">← Prev</button>
                  <button id="audit-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Next →</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Security Events Table */}
      {tab === "security" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center text-sm animate-pulse text-muted-foreground">Loading security events...</div> : secData.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No security events found.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">Timestamp</th>
                    <th scope="col" className="px-4 py-3 text-left">Event Type</th>
                    <th scope="col" className="px-4 py-3 text-left">Org ID</th>
                    <th scope="col" className="px-4 py-3 text-left">User ID</th>
                    <th scope="col" className="px-4 py-3 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {secData.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(s.createdAt).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-amber-700">{s.eventType}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.orgId?.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.userId ? s.userId.slice(0, 8) + "…" : "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.ipAddress ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>Page {page} of {totalPages} — {total.toLocaleString()} events</span>
                <div className="flex gap-2">
                  <button id="sec-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">← Prev</button>
                  <button id="sec-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Next →</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
