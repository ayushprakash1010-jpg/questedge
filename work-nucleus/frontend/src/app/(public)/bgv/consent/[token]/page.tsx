"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ConsentView {
  id: string;
  status: string;
  retentionDays: number;
  vendor: string;
  organization: { name: string };
  candidate: { name: string; email: string; phone?: string };
  checks: Array<{ type: string }>;
}

type Step = "review" | "otp-sent" | "verified";

export default function BgvConsentPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ConsentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("review");
  const [otp, setOtp] = useState("");
  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v2/public/bgv/consent/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Consent record not found or has expired");
        return r.json();
      })
      .then((j) => {
        setData(j);
        if (j.status !== "CONSENT_PENDING") setStep("verified");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, [token]);

  async function sendOtp() {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/public/bgv/consent/${token}/start`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send OTP");
      setStep("otp-sent");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (otp.length < 4 || signedName.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/public/bgv/consent/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, signedName }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "OTP verification failed");
      }
      setStep("verified");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;

  if (step === "verified") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Consent recorded</h1>
            <p className="text-slate-600 mt-2">
              Thank you, {data.candidate.name}. {data.organization.name}&apos;s background verification will start
              shortly. You will be notified when it completes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-6">
          <Badge className="mb-2">DPDP Act 2023 compliant</Badge>
          <h1 className="text-3xl font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" /> Background verification consent
          </h1>
          <p className="mt-2 text-slate-600">
            {data.organization.name} would like your consent to verify the information you provided.
          </p>
        </header>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>What we will verify</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-slate-700">
              {data.checks.map((c) => (
                <li key={c.type} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {humanise(c.type)}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Verification is performed by <strong>{data.vendor}</strong>. Data is retained for{" "}
              <strong>{data.retentionDays} days</strong> after completion. You may withdraw consent at any time and
              request deletion of your data.
            </p>
          </CardContent>
        </Card>

        {step === "review" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  I, {data.candidate.name}, give my informed consent to {data.organization.name} to perform the
                  background checks listed above. I confirm the information I provided is accurate.
                </span>
              </label>
              <Button onClick={sendOtp} disabled={!agreed || busy}>
                Continue — send OTP to {data.candidate.phone ?? data.candidate.email}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "otp-sent" && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-slate-600">
                Enter the 6-digit OTP sent to your phone. Then type your full name as a digital signature.
              </p>
              <Input
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Input
                placeholder="Type your full name"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={verifyOtp} disabled={busy || otp.length < 4 || signedName.trim().length < 2}>
                  Submit consent
                </Button>
                <Button variant="outline" onClick={sendOtp} disabled={busy}>
                  Resend OTP
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function humanise(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
