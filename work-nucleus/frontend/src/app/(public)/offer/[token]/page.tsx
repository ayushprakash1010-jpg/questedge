"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BrandLoader } from "@/components/ui/brand-loader";
import { toast } from "@/components/ui/toaster";
import { CheckCircle2, FileText, XCircle, MessageSquare } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface OfferView {
  id: string;
  status: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  organization: { id: string; name: string };
  template: { id: string; name: string; brandingJson: Record<string, unknown> | null };
  compensation: {
    fixedAnnual: string;
    variableAnnual: string;
    joiningBonus: string;
    retentionBonus: string;
    currency: string;
  } | null;
  application: {
    candidate: { name: string; email: string };
    hiringPlan: { title: string; designation: string; department: string };
  };
  signatureRequest: { status: string; sentAt: string | null; signedAt: string | null } | null;
}

type Action = "idle" | "accepting" | "declining" | "negotiating";

export default function PublicOfferPage() {
  const { token } = useParams<{ token: string }>();
  const [offer, setOffer] = useState<OfferView | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>("idle");
  const [signerName, setSignerName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [negotiateMsg, setNegotiateMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v2/public/offers/${token}`);
        if (!res.ok) throw new Error("Offer not found or has expired");
        const data: OfferView = await res.json();
        if (cancelled) return;
        setOffer(data);
        await fetch(`${API_BASE}/api/v2/public/offers/${token}/viewed`, { method: "POST" });
        const docRes = await fetch(`${API_BASE}/api/v2/public/offers/${token}/document`);
        if (docRes.ok) {
          const d = await docRes.json();
          setDocUrl(d.url ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load offer");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submitAccept() {
    if (signerName.trim().length < 2 || !agreedToTerms) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/public/offers/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: signerName.trim(),
          agreedToTerms: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to accept offer");
      const data = await res.json();
      setOffer((prev) => (prev ? { ...prev, status: data.status, acceptedAt: data.acceptedAt } : prev));
      setAction("idle");
      toast.success("Offer accepted and signed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error accepting offer");
    } finally {
      setBusy(false);
    }
  }

  async function submitDecline() {
    if (declineReason.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/public/offers/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      if (!res.ok) throw new Error("Failed to record decline");
      const data = await res.json();
      setOffer((prev) => (prev ? { ...prev, status: data.status, declinedAt: data.declinedAt } : prev));
      setAction("idle");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function submitNegotiate() {
    if (negotiateMsg.trim().length < 5) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/public/offers/${token}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: negotiateMsg }),
      });
      if (!res.ok) throw new Error("Failed to send counter-proposal");
      setNegotiateMsg("");
      setAction("idle");
      toast.success("Your counter has been sent to the HR team.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm text-slate-500 mt-2">If you believe this is wrong, contact your hiring manager.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!offer) {
    return <BrandLoader message="Loading offer letter..." />;
  }

  const accepted = offer.status === "ACCEPTED";
  const declined = offer.status === "DECLINED";
  const closed = accepted || declined || offer.status === "REVOKED" || offer.status === "EXPIRED";
  const comp = offer.compensation;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-wider text-slate-500">Offer of employment</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{offer.organization.name}</h1>
          <p className="mt-1 text-slate-600">
            For {offer.application.candidate.name} — {offer.application.hiringPlan.designation},{" "}
            {offer.application.hiringPlan.department}
          </p>
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Compensation summary</span>
              <Badge>{offer.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comp ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <CompRow label="Fixed (annual)" value={`${comp.currency} ${formatINR(comp.fixedAnnual)}`} />
                <CompRow label="Variable (annual)" value={`${comp.currency} ${formatINR(comp.variableAnnual)}`} />
                <CompRow label="Joining bonus" value={`${comp.currency} ${formatINR(comp.joiningBonus)}`} />
                <CompRow label="Retention bonus" value={`${comp.currency} ${formatINR(comp.retentionBonus)}`} />
              </div>
            ) : (
              <p className="text-slate-500">Compensation details will be shared in the formal letter.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Offer letter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docUrl ? (
              <a
                className="text-blue-600 underline"
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View the full offer letter
              </a>
            ) : (
              <p className="text-slate-500">The formal letter will be available shortly.</p>
            )}
          </CardContent>
        </Card>

        {!closed && (
          <Card>
            <CardHeader>
              <CardTitle>Your decision</CardTitle>
            </CardHeader>
            <CardContent>
              {action === "idle" && (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setAction("accepting")} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept &amp; e-sign
                  </Button>
                  <Button variant="outline" onClick={() => setAction("negotiating")}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Negotiate
                  </Button>
                  <Button variant="outline" onClick={() => setAction("declining")}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}
              {action === "accepting" && (
                <div className="space-y-4">
                  {offer.signatureRequest ? (
                    <p className="text-sm text-slate-600">
                      To accept, sign the letter electronically via the signature invitation sent to{" "}
                      <strong>{offer.application.candidate.email}</strong> (status:{" "}
                      <span className="font-medium">{offer.signatureRequest.status}</span>). Once signed, this offer is binding.
                    </p>
                  ) : offer.status === "SENT" || offer.status === "VIEWED" ? (
                    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                      <p className="text-sm font-medium text-slate-800">
                        Electronic Signature &amp; Offer Acceptance
                      </p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Type Full Legal Name *
                        </label>
                        <Input
                          placeholder={offer.application.candidate.name}
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                        />
                      </div>
                      <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                        />
                        <span>
                          I confirm that I have reviewed the compensation and terms and electronically sign to accept this offer of employment.
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          onClick={submitAccept}
                          disabled={busy || signerName.trim().length < 2 || !agreedToTerms}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {busy ? "Signing..." : "Confirm & Accept Offer"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAction("idle")}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-amber-700">
                        This offer has not been dispatched to the candidate yet. Please click <strong>Send Offer</strong> on the offer page first.
                      </p>
                      <Button variant="outline" onClick={() => setAction("idle")}>Back</Button>
                    </>
                  )}
                  {offer.signatureRequest && (
                    <Button variant="outline" onClick={() => setAction("idle")}>Back</Button>
                  )}
                </div>
              )}
              {action === "declining" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Please share a brief reason for declining (the team values your feedback)…"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={submitDecline} disabled={busy || declineReason.trim().length < 2}>
                      Submit decline
                    </Button>
                    <Button variant="outline" onClick={() => setAction("idle")} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {action === "negotiating" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Share what you'd like to discuss — comp, role, joining date…"
                    value={negotiateMsg}
                    onChange={(e) => setNegotiateMsg(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={submitNegotiate} disabled={busy || negotiateMsg.trim().length < 5}>
                      Send to HR
                    </Button>
                    <Button variant="outline" onClick={() => setAction("idle")} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {closed && (
          <Card>
            <CardContent className="p-6 text-center text-slate-700">
              {accepted && "You've accepted this offer. Welcome aboard! Onboarding details will follow."}
              {declined && "You've declined this offer. We appreciate your time."}
              {offer.status === "EXPIRED" && "This offer has expired."}
              {offer.status === "REVOKED" && "This offer has been withdrawn. Please contact your recruiter."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CompRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function formatINR(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("en-IN");
}
