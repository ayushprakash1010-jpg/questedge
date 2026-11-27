"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Send,
  RefreshCw,
  Check,
  Download,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { readResponseError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { QuestEdgeLogo } from "@/components/QuestEdgeLogo";

// Offer detail surface — design-system-v2/ui-kit/07-Offer-Letter.html.
// Two-pane layout: 340 px form/metadata column on the left, serif letter
// preview on the right. All existing actions (submit, approve/reject,
// render new version, send for e-sign, AI body draft) preserved.

interface OfferDetail {
  id: string;
  status: string;
  candidateToken: string | null;
  expiresAt: string | null;
  approvalChain: Array<{
    role: string;
    userId?: string;
    userName?: string;
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

function money(s: string | undefined | null): string {
  if (!s) return "—";
  return Number(s).toLocaleString("en-IN");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBody, setAiBody] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  async function refresh() {
    setError(null);
    try {
      const res = await fetch(`/api/v2/offers/${id}`);
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to load offer"));
      }
      setOffer(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offer");
    }
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
      if (!res.ok) throw new Error(await readResponseError(res, "Action failed"));
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
      if (!res.ok) throw new Error(await readResponseError(res, "Failed to draft offer body"));
      const data = await res.json();
      setAiBody(data.body ?? "");
      toast.success("AI offer body draft generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to draft offer body");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-6 space-y-3">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
          <Link href="/offers"><Button variant="ghost" size="sm">Back to Offers</Button></Link>
        </div>
      </div>
    );
  }

  if (!offer) {
    return <BrandLoader fullscreen={false} message="Loading offer details..." />;
  }

  const candidateUrl = offer.candidateToken ? `/offer/${offer.candidateToken}` : null;

  return (
    // Break out of the protected layout's p-4/p-6 so the two panes stretch to
    // the viewport edges on desktop while scrolling cleanly on mobile.
    <div className="-m-4 sm:-m-6 flex min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] flex-col lg:overflow-hidden lg:flex-row">
      {/* ── Form column ─────────────────────────────────────────── */}
      <FormColumn
        offer={offer}
        busy={busy}
        candidateUrl={candidateUrl}
        onSubmit={() => action("/submit")}
        onSend={() => action("/send")}
        onAi={draftBody}
        onApprove={(decision, comment) =>
          action("/approve", { decision, comment })
        }
        onRefreshEsign={() => action("/refresh-esign")}
        onRender={() =>
          action("/render", aiBody !== null ? { customBody: aiBody } : undefined)
        }
        onDownload={async () => {
          setBusy(true);
          try {
            const res = await fetch(`/api/v2/offers/${id}/document`);
            if (!res.ok) throw new Error(await readResponseError(res, "Failed to get offer document"));
            const d = await res.json();
            if (!d?.url) throw new Error("No document link returned");
            window.open(d.url, "_blank", "noopener,noreferrer");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Download failed");
          } finally {
            setBusy(false);
          }
        }}
        onRevoke={() => setRevokeOpen(true)}
      />

      {/* ── Letter preview ──────────────────────────────────────── */}
      <LetterPreviewColumn
        offer={offer}
        aiBody={aiBody}
        onChangeAiBody={setAiBody}
      />

      <ConfirmDialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={async () => {
          await action("/revoke");
          setRevokeOpen(false);
          toast.success("Offer revoked");
        }}
        variant="danger"
        title="Revoke offer letter?"
        description="This immediately withdraws the offer from the candidate and invalidates pending e-signature acceptance."
        confirmLabel="Revoke Offer"
        loading={busy}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Form column
// ─────────────────────────────────────────────────────────────────────────

function FormColumn({
  offer,
  busy,
  candidateUrl,
  onSubmit,
  onSend,
  onAi,
  onApprove,
  onRefreshEsign,
  onRender,
  onDownload,
  onRevoke,
}: {
  offer: OfferDetail;
  busy: boolean;
  candidateUrl: string | null;
  onSubmit: () => void;
  onSend: () => void;
  onAi: () => void;
  onApprove: (
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
    comment?: string
  ) => void;
  onRefreshEsign: () => void;
  onRender: () => void;
  onDownload: () => void;
  onRevoke: () => void;
}) {
  const c = offer.application.candidate;
  const plan = offer.application.hiringPlan;
  const comp = offer.compensation;
  const expires = offer.expiresAt ? new Date(offer.expiresAt) : null;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-slate-200 bg-white lg:w-[340px]">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-4">
        <Link
          href="/offers"
          className="-ml-1 mb-1.5 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Offers
        </Link>
        <h1 className="text-[15px] font-bold text-slate-900">
          Offer Letter
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {c.name} · {plan.designation}
        </p>
        <Badge
          variant={offerStatusVariant[offer.status] ?? "outline"}
          className="mt-2 text-[10px]"
        >
          {offer.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {/* Candidate */}
        <FormSection label="Candidate">
          <FormField label="Full Name" value={c.name} />
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Role" value={plan.designation} />
            <FormField label="Department" value={plan.department} />
          </div>
          <FormField
            label="Email"
            value={
              <span className="truncate font-mono text-[11px]">{c.email}</span>
            }
          />
          {expires && (
            <FormField
              label="Offer Expiry"
              value={expires.toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
          )}
        </FormSection>

        {/* Compensation */}
        <FormSection label="Compensation">
          {comp ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  label="Fixed (LPA)"
                  value={`${comp.currency} ${money(comp.fixedAnnual)}`}
                />
                <FormField
                  label="Variable (LPA)"
                  value={`${comp.currency} ${money(comp.variableAnnual)}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  label="Joining Bonus"
                  value={`${comp.currency} ${money(comp.joiningBonus)}`}
                />
                <FormField
                  label="Retention"
                  value={`${comp.currency} ${money(comp.retentionBonus)}`}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">
              No compensation attached. Edit the offer to add one.
            </p>
          )}
        </FormSection>

        {/* Letter Settings */}
        <FormSection label="Letter Settings">
          <FormField
            label="Template"
            value={`${offer.template.name} (v${offer.template.version})`}
          />
          {offer.docVersions.length > 0 && (
            <p className="text-[11px] text-slate-400">
              {offer.docVersions.length} rendered version
              {offer.docVersions.length > 1 ? "s" : ""} on file.
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRender}
            disabled={busy}
            className="w-full justify-center"
          >
            <RefreshCw className="h-3 w-3" />
            Render new version
          </Button>
        </FormSection>

        {/* Approval Chain */}
        <FormSection label="Approval Chain">
          <ApprovalChain
            chain={offer.approvalChain}
            offerStatus={offer.status}
            busy={busy}
            onApprove={onApprove}
          />
        </FormSection>

        {/* E-sign status */}
        {offer.signatureRequest && (
          <FormSection label="E-Signature">
            <FormField
              label="Provider"
              value={offer.signatureRequest.provider}
            />
            <FormField
              label="Status"
              value={
                <span className="font-semibold text-slate-700">
                  {offer.signatureRequest.status}
                </span>
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshEsign}
              disabled={busy}
              className="w-full justify-center"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh status
            </Button>
          </FormSection>
        )}
      </div>

      {/* Footer actions */}
      <div className="space-y-2 border-t border-slate-200 px-5 py-4">
        <Button
          variant="ai"
          size="sm"
          onClick={onAi}
          disabled={busy}
          className="w-full justify-center"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Draft body with AI
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={busy}
            className="flex-1 justify-center"
          >
            <Download className="h-3.5 w-3.5" />
            Download Offer
          </Button>

          {offer.status === "DRAFT" && (
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={busy}
              className="flex-1 justify-center"
            >
              <Send className="h-3.5 w-3.5" />
              Submit for Approval
            </Button>
          )}
          {offer.status === "APPROVED" && (
            <Button
              size="sm"
              onClick={onSend}
              disabled={busy}
              className="flex-1 justify-center"
            >
              <Send className="h-3.5 w-3.5" />
              Send via e-sign
            </Button>
          )}
          {offer.status !== "DRAFT" && offer.status !== "APPROVED" && (
            <Button
              size="sm"
              disabled
              className="flex-1 justify-center opacity-60"
            >
              {offer.status.replace("_", " ")}
            </Button>
          )}
        </div>
        {offer.status !== "ACCEPTED" &&
          offer.status !== "REVOKED" &&
          offer.status !== "DECLINED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevoke}
              disabled={busy}
              className="w-full justify-center text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
            >
              Revoke Offer
            </Button>
          )}
        {candidateUrl && (
          <Link
            href={candidateUrl}
            target="_blank"
            className="block text-center text-[11px] text-indigo-600 hover:underline"
          >
            Preview candidate view ↗
          </Link>
        )}
      </div>
    </aside>
  );
}

function FormSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="border-b border-slate-100 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FormField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[11px] font-semibold text-slate-700">{label}</Label>
      <div className="mt-1 rounded-md border border-slate-200 bg-slate-50/40 px-2.5 py-1.5 text-xs text-slate-700">
        {value}
      </div>
    </div>
  );
}

// Approval steps display + per-step action buttons
function ApprovalChain({
  chain,
  offerStatus,
  busy,
  onApprove,
}: {
  chain: OfferDetail["approvalChain"];
  offerStatus: string;
  busy: boolean;
  onApprove: (
    decision: "APPROVED" | "CHANGES_REQUESTED" | "REJECTED",
    comment?: string
  ) => void;
}) {
  const [promptDecision, setPromptDecision] = useState<"CHANGES_REQUESTED" | "REJECTED" | null>(null);

  if (chain.length === 0) {
    return <p className="text-xs text-slate-400">No approval chain.</p>;
  }

  return (
    <>
      <ol className="space-y-0">
      {chain.map((step, idx) => {
        const isDone = step.status === "APPROVED";
        const isReject =
          step.status === "REJECTED" || step.status === "CHANGES_REQUESTED";
        const isPending = step.status === "PENDING";
        const showActions =
          isPending && offerStatus === "PENDING_APPROVAL";

        return (
          <li
            key={idx}
            className="flex items-center gap-2.5 border-b border-slate-50 py-2 last:border-b-0"
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                isDone && "bg-emerald-100 text-emerald-600",
                isReject && "bg-red-100 text-red-600",
                isPending &&
                  (showActions
                    ? "border-2 border-indigo-600 bg-indigo-50 text-indigo-600"
                    : "bg-slate-100 text-slate-400")
              )}
            >
              {isDone ? "✓" : isReject ? "✕" : idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700">
                {step.userName || step.role}
              </p>
              <p className="text-[11px] text-slate-400">
                {step.userName ? step.role : "Approver"}
                {step.actedAt
                  ? ` · ${new Date(step.actedAt).toLocaleDateString()}`
                  : ""}
              </p>
              {step.comment && (
                <p className="mt-1 text-[11px] italic text-slate-500">
                  &ldquo;{step.comment}&rdquo;
                </p>
              )}
            </div>
            {!showActions && (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  isDone && "bg-emerald-50 text-emerald-700",
                  isReject && "bg-red-50 text-red-700",
                  isPending && "bg-slate-100 text-slate-500"
                )}
              >
                {step.status === "PENDING"
                  ? "Waiting"
                  : step.status.replace("_", " ")}
              </span>
            )}
          </li>
        );
      })}

      {/* Inline approve/reject for whichever step is active */}
      {chain.find(
        (s) => s.status === "PENDING" && offerStatus === "PENDING_APPROVAL"
      ) && (
        <li className="pt-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              onClick={() => onApprove("APPROVED")}
              disabled={busy}
              className="flex-1 justify-center"
            >
              <Check className="h-3 w-3" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPromptDecision("CHANGES_REQUESTED")}
              disabled={busy}
              className="flex-1 justify-center"
            >
              Changes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPromptDecision("REJECTED")}
              disabled={busy}
              className="flex-1 justify-center"
            >
              Reject
            </Button>
          </div>
        </li>
      )}
    </ol>
    <ConfirmDialog
      open={Boolean(promptDecision)}
      onClose={() => setPromptDecision(null)}
      onConfirm={async (comment) => {
        if (!promptDecision) return;
        await onApprove(promptDecision, comment);
        setPromptDecision(null);
      }}
      variant={promptDecision === "REJECTED" ? "danger" : "default"}
      title={
        promptDecision === "REJECTED"
          ? "Reject offer?"
          : "Request changes to offer?"
      }
      confirmLabel={promptDecision === "REJECTED" ? "Reject Offer" : "Request Changes"}
      loading={busy}
      input={{
        label:
          promptDecision === "REJECTED"
            ? "Reason for rejection"
            : "Comment for changes requested",
        type: "textarea",
        required: true,
        placeholder: "Add explanation for the approval log...",
      }}
    />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Letter preview column
// ─────────────────────────────────────────────────────────────────────────

function LetterPreviewColumn({
  offer,
  aiBody,
  onChangeAiBody,
}: {
  offer: OfferDetail;
  aiBody: string | null;
  onChangeAiBody: (v: string) => void;
}) {
  const c = offer.application.candidate;
  const plan = offer.application.hiringPlan;
  const comp = offer.compensation;
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );
  const totalFixed = comp
    ? Number(comp.fixedAnnual) + Number(comp.variableAnnual)
    : 0;

  return (
    <div className="flex flex-1 overflow-y-auto bg-slate-100 p-8 lg:p-10">
      <div className="mx-auto w-full max-w-[640px]">
        <article className="relative rounded-xl bg-white px-12 py-12 shadow-[0_4px_24px_rgba(0,0,0,0.08)]" style={{ fontFamily: "Georgia, serif" }}>
          {/* Stamp */}
          <div className="absolute right-12 top-12 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-indigo-100 opacity-60">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
          </div>

          {/* Header */}
          <header className="mb-8 flex items-center gap-3">
            <QuestEdgeLogo size="sm" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-2 border-l border-slate-200">
              Technologies Pvt. Ltd.
            </span>
          </header>

          {/* Gradient divider */}
          <div className="mb-6 h-px bg-gradient-to-r from-indigo-500 via-cyan-500 to-transparent" />

          {/* Date */}
          <p
            className="mb-5 text-[13px] text-slate-400"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {today}
          </p>

          {/* Address */}
          <p
            className="mb-6 text-[13px] leading-relaxed text-slate-700"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <strong>{c.name}</strong>
          </p>

          {/* Subject */}
          <p
            className="mb-5 text-sm font-bold text-slate-900"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Subject: Offer of Employment —{" "}
            <PlaceholderField>{plan.designation}</PlaceholderField>
          </p>

          {/* Greeting + paragraph */}
          <p className="mb-4 text-sm leading-loose text-slate-700">
            Dear <PlaceholderField>{c.name.split(" ")[0]}</PlaceholderField>,
          </p>

          {/* AI-drafted body (editable) — replaces the static paragraph when present */}
          {aiBody !== null ? (
            <div
              className="mb-5"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-400">
                AI-drafted body (editable)
              </p>
              <Textarea
                rows={Math.max(6, aiBody.split("\n").length)}
                value={aiBody}
                onChange={(e) => onChangeAiBody(e.target.value)}
                className="w-full resize-y bg-white text-sm leading-relaxed"
              />
            </div>
          ) : (
            <p className="mb-4 text-sm leading-loose text-slate-700">
              We are delighted to extend this offer of employment to you for the
              position of <strong>{plan.designation}</strong> at QuestEdge
              Technologies Pvt. Ltd. This offer is contingent upon successful
              completion of background verification and submission of relevant
              documents.
            </p>
          )}

          {/* Compensation table */}
          {comp && (
            <table
              className="my-6 w-full border-collapse"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Compensation Component
                  </th>
                  <th className="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Per Annum ({comp.currency})
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompRow label="Fixed Base Salary" value={comp.fixedAnnual} />
                <CompRow
                  label="Variable Performance Pay"
                  value={comp.variableAnnual}
                />
                {Number(comp.joiningBonus) > 0 && (
                  <CompRow
                    label="Joining Bonus (one-time)"
                    value={comp.joiningBonus}
                  />
                )}
                {Number(comp.retentionBonus) > 0 && (
                  <CompRow
                    label="Retention Bonus"
                    value={comp.retentionBonus}
                  />
                )}
                <tr>
                  <td className="px-3.5 py-2.5 text-sm font-bold text-indigo-700">
                    Total Fixed CTC
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-sm font-bold text-indigo-700">
                    {money(String(totalFixed))}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Trailing paragraphs */}
          {offer.expiresAt && (
            <p className="mb-4 text-sm leading-loose text-slate-700">
              This offer is valid until{" "}
              <strong>
                {new Date(offer.expiresAt).toLocaleDateString("en-IN", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
              . Kindly sign and return a copy to confirm your acceptance.
            </p>
          )}
          <p className="mb-4 text-sm leading-loose text-slate-700">
            We look forward to having you on the team and are confident you will
            make a significant contribution to QuestEdge.
          </p>

          {/* Signature */}
          <div className="mt-9">
            <p className="mb-7 text-sm text-slate-700">Warm regards,</p>
            <div className="mb-1.5 h-px w-36 bg-slate-200" />
            <p
              className="text-[13px] font-semibold text-slate-800"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Authorised Signatory
            </p>
            <p
              className="text-xs text-slate-400"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              QuestEdge Technologies
            </p>
          </div>

          <div
            className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-400"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            This is a confidential offer letter. Please do not share with third
            parties.
          </div>
        </article>
      </div>
    </div>
  );
}

function PlaceholderField({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[3px] bg-gradient-to-r from-indigo-50 to-indigo-100 px-1 font-semibold text-indigo-700">
      {children}
    </span>
  );
}

function CompRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-50">
      <td className="px-3.5 py-2.5 text-sm text-slate-700">{label}</td>
      <td className="px-3.5 py-2.5 text-right text-sm font-bold text-slate-900">
        {money(value)}
      </td>
    </tr>
  );
}
