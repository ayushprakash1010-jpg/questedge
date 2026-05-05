"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, Send, RefreshCw, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";

interface OfferDetail {
  id: string;
  status: string;
  candidateToken: string | null;
  expiresAt: string | null;
  approvalChain: Array<{
    role: string;
    userId?: string;
    status: string;
    comment?: string;
    actedAt?: string;
  }>;
  template: { id: string; name: string; version: number; body: string };
  compensation: {
    fixedAnnual: string;
    variableAnnual: string;
    joiningBonus: string;
    retentionBonus: string;
    currency: string;
  } | null;
  application: {
    id: string;
    candidate: { id: string; name: string; email: string };
    hiringPlan: { id: string; designation: string; department: string };
  };
  signatureRequest: {
    provider: string;
    status: string;
    signedAt: string | null;
  } | null;
  generatedDocUrl: string | null;
  docVersions: Array<{ version: number; renderedAt: string }>;
}

const offerStatusVariant: Record<string, BadgeProps["variant"]> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  SENT: "default",
  VIEWED: "default",
  ACCEPTED: "success",
  DECLINED: "destructive",
  REVOKED: "secondary",
  EXPIRED: "secondary",
};

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBody, setAiBody] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/v2/offers/${id}`);
    if (res.ok) setOffer(await res.json());
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function action(path: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/offers/${id}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function draftBody() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/offers/${id}/draft-body`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "warm" }),
      });
      const data = await res.json();
      setAiBody(data.body ?? "");
    } finally {
      setBusy(false);
    }
  }

  if (!offer) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const candidateUrl = offer.candidateToken ? `/offer/${offer.candidateToken}` : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/offers"
          className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          ← All offers
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Offer for {offer.application.candidate.name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {offer.application.hiringPlan.designation} ·{" "}
          {offer.application.hiringPlan.department} · Template{" "}
          <em>{offer.template.name}</em> v{offer.template.version}
        </p>
        <Badge
          variant={offerStatusVariant[offer.status] ?? "outline"}
          className="mt-2"
        >
          {offer.status.replace("_", " ")}
        </Badge>
      </div>

      <Tabs defaultValue="comp">
        <TabsList>
          <TabsTrigger value="comp">Compensation</TabsTrigger>
          <TabsTrigger value="preview">Letter preview</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="send">Send &amp; sign</TabsTrigger>
        </TabsList>

        <TabsContent value="comp">
          <Card>
            <CardHeader>
              <CardTitle>Compensation</CardTitle>
            </CardHeader>
            <CardContent>
              {offer.compensation ? (
                <div className="grid grid-cols-2 gap-4">
                  <Row
                    label="Fixed (annual)"
                    v={`${offer.compensation.currency} ${money(offer.compensation.fixedAnnual)}`}
                  />
                  <Row
                    label="Variable (annual)"
                    v={`${offer.compensation.currency} ${money(offer.compensation.variableAnnual)}`}
                  />
                  <Row
                    label="Joining bonus"
                    v={`${offer.compensation.currency} ${money(offer.compensation.joiningBonus)}`}
                  />
                  <Row
                    label="Retention bonus"
                    v={`${offer.compensation.currency} ${money(offer.compensation.retentionBonus)}`}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No compensation attached. Edit the offer to add one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Letter preview</span>
                <div className="flex gap-2">
                  <Button variant="ai" size="sm" onClick={draftBody} disabled={busy}>
                    <Sparkles className="h-3.5 w-3.5" /> Draft body with AI
                  </Button>
                  <Button size="sm" onClick={() => action("/render")} disabled={busy}>
                    <RefreshCw className="h-3.5 w-3.5" /> Render new version
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiBody !== null && (
                <div>
                  <p className="mb-1 text-xs text-slate-500">
                    AI-drafted body (editable copy below)
                  </p>
                  <Textarea
                    value={aiBody}
                    onChange={(e) => setAiBody(e.target.value)}
                    rows={8}
                  />
                </div>
              )}
              <div className="whitespace-pre-wrap rounded-md border border-slate-200/60 bg-slate-50 p-4 text-sm text-slate-700">
                {offer.template.body}
              </div>
              {offer.docVersions.length > 0 && (
                <div className="text-xs text-slate-500">
                  {offer.docVersions.length} rendered version
                  {offer.docVersions.length > 1 ? "s" : ""} on file.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Approval chain</span>
                {offer.status === "DRAFT" && (
                  <Button size="sm" onClick={() => action("/submit")} disabled={busy}>
                    Submit for approval
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {offer.approvalChain.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between rounded-lg border border-slate-200/60 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{step.role}</p>
                    <p className="text-xs text-slate-500">
                      Status: {step.status}
                      {step.actedAt
                        ? ` · ${new Date(step.actedAt).toLocaleString()}`
                        : ""}
                    </p>
                    {step.comment && (
                      <p className="mt-1 text-xs text-slate-600">
                        &ldquo;{step.comment}&rdquo;
                      </p>
                    )}
                  </div>
                  {step.status === "PENDING" && offer.status === "PENDING_APPROVAL" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => action("/approve", { decision: "APPROVED" })}
                        disabled={busy}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const c = window.prompt("Comment for changes requested?");
                          if (c) action("/approve", { decision: "CHANGES_REQUESTED", comment: c });
                        }}
                        disabled={busy}
                      >
                        Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const c = window.prompt("Reason for rejection?");
                          if (c) action("/approve", { decision: "REJECTED", comment: c });
                        }}
                        disabled={busy}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send to candidate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                When ready, send the offer for e-signature. The candidate
                receives an email with the offer link and signature flow.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => action("/send")}
                  disabled={busy || offer.status !== "APPROVED"}
                >
                  <Send className="h-4 w-4" /> Send via e-sign
                </Button>
                <Button
                  variant="outline"
                  onClick={() => action("/refresh-esign")}
                  disabled={busy || !offer.signatureRequest}
                >
                  <RefreshCw className="h-4 w-4" /> Refresh status
                </Button>
                {candidateUrl && (
                  <Link
                    href={candidateUrl}
                    target="_blank"
                    className="self-center text-sm text-indigo-600 underline"
                  >
                    Preview candidate view
                  </Link>
                )}
              </div>
              {offer.signatureRequest && (
                <div className="text-xs text-slate-500">
                  E-sign provider: {offer.signatureRequest.provider} · status:{" "}
                  <strong>{offer.signatureRequest.status}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900">{v}</p>
    </div>
  );
}

function money(s: string) {
  return Number(s).toLocaleString("en-IN");
}
