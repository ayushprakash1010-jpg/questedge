"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

interface OfferRow {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  application: { candidate: { id: string; name: string; email: string } };
  template: { id: string; name: string };
  compensation: { fixedAnnual: string; currency: string } | null;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SENT: "bg-indigo-100 text-indigo-700",
  VIEWED: "bg-purple-100 text-purple-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-rose-100 text-rose-700",
  REVOKED: "bg-slate-200 text-slate-600",
  EXPIRED: "bg-slate-200 text-slate-600",
};

export default function OffersListPage() {
  const [data, setData] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/v2/offers${qs}`)
      .then((r) => r.json())
      .then((j) => setData(j.data ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Offers</h1>
          <p className="text-sm text-slate-500">Generate, approve, and track offer letters end-to-end.</p>
        </div>
        <Link href="/offers/templates">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" /> Templates
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {["", "DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "ACCEPTED", "DECLINED"].map((s) => (
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
          <CardTitle>{loading ? "Loading…" : `${data.length} offers`}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Compensation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link className="text-blue-600 hover:underline" href={`/offers/${o.id}`}>
                      {o.application.candidate.name}
                    </Link>
                    <div className="text-xs text-slate-500">{o.application.candidate.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.template.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {o.compensation ? `${o.compensation.currency} ${Number(o.compensation.fixedAnnual).toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[o.status] ?? ""}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No offers yet. Create one from a SELECTED candidate&apos;s decision page.
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
