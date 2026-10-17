"use client";

import { useEffect, useState } from "react";
import { Bot, TrendingUp, Zap, AlertCircle, BarChart2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface AiDashboard {
  period: { from: string; to: string; days: number };
  totalCalls: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCostPaise: number;
  errorRate: number;
  byAgent: Array<{ agentName: string; calls: number; costPaise: number }>;
  byOrg: Array<{ orgId: string; orgName: string; calls: number; costPaise: number }>;
  byDay: Array<{ date: string; calls: number; costPaise: number }>;
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AiOperationsPage() {
  const [data, setData] = useState<AiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState("30");

  useEffect(() => { fetchDashboard(); }, [days]);

  async function fetchDashboard() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/support/ai-cost?days=${days}`);
      if (!res.ok) throw new Error("Failed to load AI data");
      setData(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const totalTokens = (data?.totalTokensInput ?? 0) + (data?.totalTokensOutput ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Operations</h1>
            <p className="text-sm text-muted-foreground">Platform-wide AI usage and cost visibility</p>
          </div>
        </div>
        <select id="ai-days-filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} <button onClick={fetchDashboard} className="underline ml-1">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard label="Total AI Calls" value={loading ? "—" : data?.totalCalls.toLocaleString() ?? "0"}
          icon={Bot} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Total Tokens" value={loading ? "—" : (totalTokens / 1000).toFixed(0) + "K"}
          sub={`${((data?.totalTokensInput ?? 0) / 1000).toFixed(0)}K in / ${((data?.totalTokensOutput ?? 0) / 1000).toFixed(0)}K out`}
          icon={Zap} color="bg-cyan-50 text-cyan-600" />
        <KpiCard label="Est. Cost" value={loading ? "—" : `₹${((data?.totalCostPaise ?? 0) / 100).toFixed(2)}`}
          sub={`Last ${days} days`} icon={TrendingUp} color="bg-green-50 text-green-600" />
        <KpiCard label="Error Rate" value={loading ? "—" : `${((data?.errorRate ?? 0) * 100).toFixed(1)}%`}
          icon={AlertCircle} color="bg-red-50 text-red-500" />
      </div>

      {!loading && data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* By Agent */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Cost by Agent</h2>
            </div>
            <div className="divide-y">
              {data.byAgent.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground text-center">No data for this period.</p>
              ) : data.byAgent.map((a) => {
                const maxCost = Math.max(...data.byAgent.map(x => x.costPaise), 1);
                const pct = (a.costPaise / maxCost) * 100;
                return (
                  <div key={a.agentName} className="px-5 py-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-mono text-xs">{a.agentName}</span>
                      <span className="text-muted-foreground text-xs">₹{(a.costPaise / 100).toFixed(2)} · {a.calls} calls</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Org */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-sm">Cost by Organization (Top 20)</h2>
              <Link href="/ai-operations/logs" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                View Logs <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-2 text-left">Organization</th>
                  <th scope="col" className="px-5 py-2 text-right">Calls</th>
                  <th scope="col" className="px-5 py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.byOrg.map((o) => (
                  <tr key={o.orgId ?? "internal"} className="hover:bg-muted/20">
                    <td className="px-5 py-2.5">
                      {o.orgId ? (
                        <Link href={`/organizations/${o.orgId}`} className="text-primary hover:underline text-xs">{o.orgName}</Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">{o.orgName}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">{o.calls}</td>
                    <td className="px-5 py-2.5 text-right text-xs font-medium">₹{(o.costPaise / 100).toFixed(2)}</td>
                  </tr>
                ))}
                {data.byOrg.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-muted-foreground">No data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
