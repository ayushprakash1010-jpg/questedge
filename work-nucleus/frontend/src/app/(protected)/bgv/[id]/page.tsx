"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLoader } from "@/components/ui/brand-loader";
import { toast } from "@/components/ui/toaster";
import { readResponseError } from "@/lib/api";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";

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
  overall_recommendation?: string;
  key_findings?: string[];
  discrepancies?: Array<{ check: string; severity: string; recommended_action: string }>;
  executive_summary?: string;
  cancelledReason?: string;
  cancelledAt?: string;
}

interface ProfileDetail {
  id: string;
  status: string;
  vendor: string;
  consentToken?: string;
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

const bgvStatusVariant: Record<string, BadgeProps["variant"]> = {
  CONSENT_PENDING: "warning",
  IN_PROGRESS: "info",
  NEEDS_REVIEW: "warning",
  COMPLETED: "success",
  CANCELLED: "secondary",
};

const riskVariant: Record<string, BadgeProps["variant"]> = {
  GREEN: "success",
  AMBER: "warning",
  RED: "destructive",
};

const findingVariant: Record<string, BadgeProps["variant"]> = {
  PENDING: "secondary",
  CLEAR: "success",
  DISCREPANCY: "destructive",
  UNABLE_TO_VERIFY: "warning",
};

export default function BgvDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProfileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setError(null);
    try {
      const res = await fetch(`/api/v2/bgv/${id}`);
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to load BGV profile"));
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BGV profile");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function retry(checkId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/bgv/checks/${checkId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error(await readResponseError(res, "Retry failed"));
      await refresh();
      toast.success("Check retry queued");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  }

  async function override(checkId: string) {
    const finding = window.prompt(
      "Override finding (CLEAR | DISCREPANCY | UNABLE_TO_VERIFY)"
    );
    if (!finding) return;
    const justification = window.prompt("Justification (audit-logged):");
    if (!justification || justification.length < 5) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/bgv/checks/${checkId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding, justification }),
      });
      if (!res.ok) throw new Error(await readResponseError(res, "Override failed"));
      await refresh();
      toast.success("Finding overridden");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="border-rose-200 bg-rose-50/40">
          <CardHeader>
            <CardTitle className="text-rose-900">Unable to load BGV profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-rose-700">{error}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refresh}>
                Retry
              </Button>
              <Link href="/bgv">
                <Button variant="ghost" size="sm">
                  ← All BGV profiles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <BrandLoader fullscreen={false} message="Loading background verification profile..." />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/bgv"
        className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← All BGV profiles
      </Link>
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {data.candidate.name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {data.candidate.email} · vendor {data.vendor}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={bgvStatusVariant[data.status] ?? "outline"}>
            {data.status.replace(/_/g, " ")}
          </Badge>
          {data.riskScore && (
            <Badge variant={riskVariant[data.riskScore] ?? "outline"}>
              {data.riskScore}
            </Badge>
          )}
          {data.status === "CONSENT_PENDING" && data.consentToken && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}/bgv/consent/${data.consentToken}`;
                navigator.clipboard?.writeText(url).catch(() => {});
                toast.success("DPDP consent link copied");
              }}
            >
              Copy Consent Link
            </Button>
          )}
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
            <CardContent className="px-0 pb-0">
              <DataTable className="rounded-none border-0 shadow-none">
                <DataTableHeader>
                  <tr>
                    <DataTableHead>Type</DataTableHead>
                    <DataTableHead>Status</DataTableHead>
                    <DataTableHead>Finding</DataTableHead>
                    <DataTableHead>Cost</DataTableHead>
                    <DataTableHead>Actions</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {data.checks.map((c) => (
                    <DataTableRow key={c.id}>
                      <DataTableCell className="font-medium text-slate-900">
                        {c.type}
                      </DataTableCell>
                      <DataTableCell>{c.status}</DataTableCell>
                      <DataTableCell>
                        <Badge variant={findingVariant[c.finding] ?? "outline"}>
                          {c.finding.replace(/_/g, " ")}
                        </Badge>
                      </DataTableCell>
                      <DataTableCell>
                        {c.costInPaise ? `₹${(c.costInPaise / 100).toFixed(2)}` : "—"}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex gap-2">
                          {c.status === "FAILED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retry(c.id)}
                              disabled={busy}
                            >
                              <RefreshCw className="h-3.5 w-3.5" /> Retry
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => override(c.id)}
                            disabled={busy}
                          >
                            Override
                          </Button>
                          {c.reportUrl && (
                            <a
                              className="self-center text-xs text-indigo-600 underline"
                              href={c.reportUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Report
                            </a>
                          )}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                AI advisory (review only)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!data.aiSummary && (
                <p className="text-sm text-slate-500">
                  AI summary is generated once all checks reach a terminal state.
                </p>
              )}
              {data.aiSummary && (
                <>
                  {data.aiSummary.cancelledReason && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">Verification Cancelled</p>
                      <p className="mt-1">{data.aiSummary.cancelledReason}</p>
                      {data.aiSummary.cancelledAt && (
                        <p className="mt-1 text-xs text-slate-500">
                          Cancelled at {new Date(data.aiSummary.cancelledAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {data.aiSummary.overall_recommendation && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Recommendation
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {data.aiSummary.overall_recommendation}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Advisory only — final hiring decision rests with HR.
                      </p>
                    </div>
                  )}
                  {data.aiSummary.executive_summary && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Executive summary
                      </p>
                      <p className="text-sm text-slate-700">
                        {data.aiSummary.executive_summary}
                      </p>
                    </div>
                  )}
                  {Array.isArray(data.aiSummary.key_findings) &&
                    data.aiSummary.key_findings.length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Key findings
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                          {data.aiSummary.key_findings.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {Array.isArray(data.aiSummary.discrepancies) &&
                    data.aiSummary.discrepancies.length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Discrepancies
                        </p>
                        <ul className="space-y-2 text-sm">
                          {data.aiSummary.discrepancies.map((d, i) => (
                            <li
                              key={i}
                              className="rounded-md border border-slate-200/60 p-2"
                            >
                              <Badge variant="warning">{d.severity}</Badge>{" "}
                              <strong className="ml-1 text-slate-900">{d.check}</strong>
                              <p className="mt-1 text-slate-600">
                                {d.recommended_action}
                              </p>
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
            <CardContent className="space-y-1 text-sm text-slate-700">
              <p>
                Consent recorded:{" "}
                {data.consentedAt
                  ? new Date(data.consentedAt).toLocaleString()
                  : "—"}
              </p>
              <p>
                Started:{" "}
                {data.startedAt
                  ? new Date(data.startedAt).toLocaleString()
                  : "—"}
              </p>
              <p>
                Completed:{" "}
                {data.completedAt
                  ? new Date(data.completedAt).toLocaleString()
                  : "—"}
              </p>
              <p>Retention: {data.retentionDays} days post-completion</p>
              {data.offer && (
                <p>
                  Linked offer:{" "}
                  <Link
                    href={`/offers/${data.offer.id}`}
                    className="text-indigo-600 underline"
                  >
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
