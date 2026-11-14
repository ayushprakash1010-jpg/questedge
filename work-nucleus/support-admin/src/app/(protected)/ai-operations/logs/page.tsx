"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

interface CallLog {
  id: string;
  orgId?: string;
  agentName: string;
  modelUsed: string;
  tokensInput?: number;
  tokensOutput?: number;
  costInPaise?: number;
  latencyMs?: number;
  status: string;
  createdAt: string;
}

export default function AiLogsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { setPage(1); }, [agentFilter, statusFilter]);
  useEffect(() => { fetchLogs(); }, [page, agentFilter, statusFilter]);

  async function fetchLogs() {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: "50" });
      if (agentFilter) p.set("agentName", agentFilter);
      if (statusFilter) p.set("status", statusFilter);
      const res = await fetch(`/api/support/ai-cost/logs?${p}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setLogs(json.data); setTotal(json.meta.total); setTotalPages(json.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <Link href="/ai-operations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to AI Operations
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Call Logs</h1>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} log entries</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input id="ai-log-agent-filter"
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Filter by agent name..." value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} />
        </div>
        <select id="ai-log-status-filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="ERROR">ERROR</option>
        </select>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm animate-pulse text-muted-foreground">Loading logs...</div>
          : logs.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No logs found.</div>
          : (
            <>
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">Timestamp</th>
                    <th scope="col" className="px-4 py-3 text-left">Agent</th>
                    <th scope="col" className="px-4 py-3 text-left">Model</th>
                    <th scope="col" className="px-4 py-3 text-right">Tokens In</th>
                    <th scope="col" className="px-4 py-3 text-right">Tokens Out</th>
                    <th scope="col" className="px-4 py-3 text-right">Cost</th>
                    <th scope="col" className="px-4 py-3 text-right">Latency</th>
                    <th scope="col" className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {logs.map((l) => (
                    <tr key={l.id} className={`hover:bg-muted/20 ${l.status === "ERROR" ? "bg-red-50/40" : ""}`}>
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs">{l.agentName}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{l.modelUsed}</td>
                      <td className="px-4 py-2 text-xs text-right text-muted-foreground">{l.tokensInput?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-right text-muted-foreground">{l.tokensOutput?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-right font-medium">{l.costInPaise != null ? `₹${(l.costInPaise / 100).toFixed(4)}` : "—"}</td>
                      <td className="px-4 py-2 text-xs text-right text-muted-foreground">{l.latencyMs != null ? `${l.latencyMs}ms` : "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.status === "ERROR" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                        }`}>{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>Page {page} of {totalPages} — {total.toLocaleString()} logs</span>
                <div className="flex gap-2">
                  <button id="ai-logs-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">← Prev</button>
                  <button id="ai-logs-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Next →</button>
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}
