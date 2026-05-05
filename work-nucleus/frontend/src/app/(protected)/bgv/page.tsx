"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, IndianRupee } from "lucide-react";

interface BgvRow {
  id: string;
  status: string;
  vendor: string;
  riskScore: string | null;
  candidate: { id: string; name: string; email: string };
  checks: Array<{ id: string; type: string; status: string; finding: string; costInPaise: number | null }>;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  CONSENT_PENDING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  NEEDS_REVIEW: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-200 text-slate-600",
};

const riskColor: Record<string, string> = {
  GREEN: "bg-emerald-100 text-emerald-700",
  AMBER: "bg-amber-100 text-amber-700",
  RED: "bg-rose-100 text-rose-700",
};

export default function BgvListPage() {
  const [rows, setRows] = useState<BgvRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/v2/bgv${qs}`)
      .then((r) => r.json())
      .then((j) => setRows(Array.isArray(j) ? j : []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" /> Background Verification
          </h1>
          <p className="text-sm text-slate-500">DPDP-compliant orchestration across vendors and check types.</p>
        </div>
        <Link href="/bgv/cost">
          <Button variant="outline">
            <IndianRupee className="w-4 h-4 mr-1" /> Cost report
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["", "CONSENT_PENDING", "IN_PROGRESS", "NEEDS_REVIEW", "COMPLETED", "CANCELLED"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs rounded-full border ${
              statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{loading ? "Loading…" : `${rows.length} BGV profiles`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Checks</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link className="text-blue-600 hover:underline" href={`/bgv/${r.id}`}>
                      {r.candidate.name}
                    </Link>
                    <div className="text-xs text-slate-500">{r.candidate.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.vendor}</td>
                  <td className="px-4 py-3 text-slate-700">{r.checks.length}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusColor[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {r.riskScore ? <Badge className={riskColor[r.riskScore]}>{r.riskScore}</Badge> : "—"}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No BGV profiles. Initiate one from the candidate detail page.
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
