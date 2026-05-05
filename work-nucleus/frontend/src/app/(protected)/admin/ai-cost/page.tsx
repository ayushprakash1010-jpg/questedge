"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Dashboard {
  totalCalls: number;
  totalRupees: number;
  cacheHitRate: number;
  anomaly: boolean;
  todayPaise: number;
  rollingAvgPaise: number;
  byDay: Record<string, { paise: number; calls: number; cacheHits: number }>;
  byAgent: Record<string, { paise: number; calls: number }>;
}

export default function AiCostPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    fetch("/api/v2/ai-cost/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">AI cost dashboard</h1>
        <p className="text-sm text-slate-500">Anthropic spend across all agents in the last 30 days.</p>
      </header>

      {data.anomaly && (
        <Card className="mb-4 border-amber-300">
          <CardContent className="p-3 flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" /> Today's spend exceeds 2× the rolling daily average. Investigate.
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Total spend (30d)" value={`₹${data.totalRupees.toLocaleString("en-IN")}`} />
        <Stat label="Total calls" value={data.totalCalls.toLocaleString("en-IN")} />
        <Stat label="Cache hit rate" value={`${(data.cacheHitRate * 100).toFixed(1)}%`} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>By agent</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-2">Agent</th>
                <th className="px-4 py-2">Calls</th>
                <th className="px-4 py-2">Spend</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byAgent)
                .sort((a, b) => b[1].paise - a[1].paise)
                .map(([agent, row]) => (
                  <tr key={agent} className="border-t">
                    <td className="px-4 py-2">{agent}</td>
                    <td className="px-4 py-2">{row.calls}</td>
                    <td className="px-4 py-2">₹{(row.paise / 100).toFixed(2)}</td>
                  </tr>
                ))}
              {Object.keys(data.byAgent).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    No AI calls logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
