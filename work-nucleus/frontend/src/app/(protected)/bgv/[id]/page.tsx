"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Sparkles } from "lucide-react";

interface Check {
  id: string;
  type: string;
  status: string;
  finding: string;
  reportUrl: string | null;
  costInPaise: number | null;
  retryCount: number;
  failureReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface AiSummary {
  overall_recommendation: string;
  key_findings: string[];
  discrepancies: Array<{ check: string; severity: string; recommended_action: string }>;
  executive_summary: string;
}

interface ProfileDetail {
  id: string;
  status: string;
  vendor: string;
  riskScore: string | null;
  consentedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  retentionDays: number;
  candidate: { id: string; name: string; email: string; phone: string | null };
  offer: { id: string; status: string } | null;
  checks: Check[];
  aiSummary: AiSummary | null;
}

const statusColor: Record<string, string> = {
  CONSENT_PENDING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  NEEDS_REVIEW: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-200 text-slate-600",
};

const findingColor: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  CLEAR: "bg-emerald-100 text-emerald-700",
  DISCREPANCY: "bg-rose-100 text-rose-700",
  UNABLE_TO_VERIFY: "bg-amber-100 text-amber-700",
};

export default function BgvDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProfileDetail | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/v2/bgv/${id}`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function retry(checkId: string) {
    setBusy(true);
    try {
      await fetch(`/api/v2/bgv/checks/${checkId}/retry`, { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function override(checkId: string) {
    const finding = window.prompt("Override finding (CLEAR | DISCREPANCY | UNABLE_TO_VERIFY)");
    if (!finding) return;
    const justification = window.prompt("Justification (audit-logged):");
    if (!justification || justification.length < 5) return;
    setBusy(true);
    try {
      await fetch(`/api/v2/bgv/checks/${checkId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding, justification }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/bgv" className="text-sm text-slate-500 hover:underline">
        ← All BGV profiles
      </Link>
      <header className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold">{data.candidate.name}</h1>
        <p className="text-sm text-slate-500">{data.candidate.email} · vendor {data.vendor}</p>
        <div className="mt-2 flex gap-2">
          <Badge className={statusColor[data.status]}>{data.status}</Badge>
          {data.riskScore && <Badge>{data.riskScore}</Badge>}
        </div>
      </header>

      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="ai">AI summary</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <CardTitle>Verification checks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Finding</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.checks.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{c.type}</td>
                      <td className="px-4 py-3">{c.status}</td>
                      <td className="px-4 py-3">
                        <Badge className={findingColor[c.finding]}>{c.finding}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.costInPaise ? `₹${(c.costInPaise / 100).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {c.status === "FAILED" && (
                          <Button size="sm" variant="outline" onClick={() => retry(c.id)} disabled={busy}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => override(c.id)} disabled={busy}>
                          Override
                        </Button>
                        {c.reportUrl && (
                          <a className="text-xs text-blue-600 underline self-center" href={c.reportUrl} target="_blank" rel="noreferrer">
                            Report
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI advisory (review only)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.aiSummary && (
                <p className="text-sm text-slate-500">
                  AI summary is generated once all checks reach a terminal state.
                </p>
              )}
              {data.aiSummary && (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">Recommendation</p>
                    <p className="text-2xl font-semibold mt-1">{data.aiSummary.overall_recommendation}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Advisory only — final hiring decision rests with HR.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Executive summary</p>
                    <p className="text-sm text-slate-700">{data.aiSummary.executive_summary}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Key findings</p>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                      {data.aiSummary.key_findings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  {data.aiSummary.discrepancies.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Discrepancies</p>
                      <ul className="space-y-2 text-sm">
                        {data.aiSummary.discrepancies.map((d, i) => (
                          <li key={i} className="border rounded-md p-2">
                            <Badge>{d.severity}</Badge>{" "}
                            <strong className="ml-1">{d.check}</strong>
                            <p className="text-slate-600 mt-1">{d.recommended_action}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Consent &amp; retention</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 space-y-1">
              <p>Consent recorded: {data.consentedAt ? new Date(data.consentedAt).toLocaleString() : "—"}</p>
              <p>Started: {data.startedAt ? new Date(data.startedAt).toLocaleString() : "—"}</p>
              <p>Completed: {data.completedAt ? new Date(data.completedAt).toLocaleString() : "—"}</p>
              <p>Retention: {data.retentionDays} days post-completion</p>
              {data.offer && (
                <p>
                  Linked offer:{" "}
                  <Link href={`/offers/${data.offer.id}`} className="text-blue-600 underline">
                    {data.offer.id.slice(0, 8)}…
                  </Link>{" "}
                  ({data.offer.status})
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
