"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";

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

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="AI cost dashboard"
        subtitle="Anthropic spend across all agents in the last 30 days."
      />

      {data.anomaly && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle />
          <AlertDescription>
            Today&apos;s spend exceeds 2× the rolling daily average. Investigate.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Total spend (30d)"
          value={`₹${data.totalRupees.toLocaleString("en-IN")}`}
        />
        <Stat label="Total calls" value={data.totalCalls.toLocaleString("en-IN")} />
        <Stat
          label="Cache hit rate"
          value={`${(data.cacheHitRate * 100).toFixed(1)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By agent</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {Object.keys(data.byAgent).length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">No AI calls logged yet.</p>
          ) : (
            <DataTable className="rounded-none border-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Agent</DataTableHead>
                  <DataTableHead>Calls</DataTableHead>
                  <DataTableHead>Spend</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {Object.entries(data.byAgent)
                  .sort((a, b) => b[1].paise - a[1].paise)
                  .map(([agent, row]) => (
                    <DataTableRow key={agent}>
                      <DataTableCell className="font-medium text-slate-900">
                        {agent}
                      </DataTableCell>
                      <DataTableCell>{row.calls}</DataTableCell>
                      <DataTableCell>₹{(row.paise / 100).toFixed(2)}</DataTableCell>
                    </DataTableRow>
                  ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
