"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { respondToConsent } from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Briefcase,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

interface ConsentData {
  id: string;
  status: string;
  expiresAt: string;
  referral: {
    recruiterNote?: string;
    recruiter: {
      name: string;
      headline?: string;
      isVerified: boolean;
    };
    mandate: {
      title: string;
      department?: string;
      location?: string;
      workModel?: string;
      referralRewardAmount?: number;
      organization: { name: string };
    };
  };
}

// ── Consent page ──────────────────────────────────────────────────

export default function ConsentPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [result, setResult] = useState<{ accepted: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Public endpoint — no auth needed
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/candidate/consents/${token}/preview`);
        if (res.ok) {
          const data = await res.json();
          setConsent(data);
        } else if (res.status === 404) {
          setError("This consent link is invalid or has already been used.");
        } else if (res.status === 410) {
          setError("This consent link has expired. Please ask the recruiter to send a new one.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } catch {
        // For demo purposes, show a mock consent
        setConsent({
          id: "demo",
          status: "PENDING",
          expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
          referral: {
            recruiterNote: "Hi! I came across your profile and think you'd be a great fit for this role. The team is exceptional and the work is impactful. Would love to know if you're open to exploring this.",
            recruiter: {
              name: "Pro Recruiter 1",
              headline: "Technical Talent Acquisition Specialist",
              isVerified: true,
            },
            mandate: {
              title: "Senior Backend Engineer",
              department: "Engineering",
              location: "San Francisco, CA",
              workModel: "Hybrid",
              referralRewardAmount: 5000,
              organization: { name: "TechCorp Global" },
            },
          },
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleRespond = async (accepted: boolean) => {
    setResponding(true);
    try {
      const res = await respondToConsent(token, accepted);
      setResult({ accepted, message: res.message });
    } catch (err: any) {
      setError(err.message || "Failed to submit response.");
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error && !consent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Unavailable</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8 text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            result.accepted ? "bg-emerald-50" : "bg-slate-100"
          )}>
            {result.accepted ? (
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            ) : (
              <XCircle className="h-9 w-9 text-slate-400" />
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {result.accepted ? "You're In! 🎉" : "Response Recorded"}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">{result.message}</p>
          {result.accepted && (
            <button
              onClick={() => router.push("/candidate/dashboard")}
              className="mt-6 w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              View Your Dashboard →
            </button>
          )}
        </div>
      </div>
    );
  }

  const { referral } = consent!;
  const { mandate, recruiter } = referral;
  const expiresDate = consent?.expiresAt ? new Date(consent.expiresAt) : null;
  const daysLeft = expiresDate
    ? Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        {/* Expires warning */}
        {daysLeft !== null && daysLeft <= 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This invitation expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Top banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm">{mandate.organization.name}</span>
            </div>
            <h1 className="text-xl font-bold leading-tight">{mandate.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-indigo-200 text-xs">
              {mandate.department && <span>{mandate.department}</span>}
              {mandate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{mandate.location}
                </span>
              )}
              {mandate.workModel && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />{mandate.workModel}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Recruiter card */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {recruiter.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-800">{recruiter.name}</span>
                    {recruiter.isVerified && (
                      <BadgeCheck className="h-4 w-4 text-sky-500" />
                    )}
                  </div>
                  {recruiter.headline && (
                    <p className="text-xs text-slate-400 truncate">{recruiter.headline}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 shrink-0">referred you</span>
              </div>
              {referral.recruiterNote && (
                <p className="mt-3 text-sm text-slate-600 italic leading-relaxed border-l-2 border-indigo-200 pl-3">
                  "{referral.recruiterNote}"
                </p>
              )}
            </div>

            {/* What you're consenting to */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">What you are consenting to</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  `Your profile and resume will be shared with ${mandate.organization.name}`,
                  "The recruiter will be credited if you are hired through this referral",
                  "You can withdraw this consent at any time before an offer is made",
                  "Your personal data will be handled per our Privacy Policy",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reward info */}
            {mandate.referralRewardAmount && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                🏆 The recruiter earns <strong>${mandate.referralRewardAmount.toLocaleString()}</strong> if you are successfully hired
              </div>
            )}

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleRespond(false)}
                disabled={responding}
                className="py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {responding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "❌ No, Thanks"}
              </button>
              <button
                onClick={() => handleRespond(true)}
                disabled={responding}
                className="py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {responding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "✅ I Accept — Let's Go!"}
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              By clicking "I Accept", you agree to our{" "}
              <a href="#" className="underline text-indigo-500">Privacy Policy</a> and{" "}
              <a href="#" className="underline text-indigo-500">Terms of Service</a>
            </p>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-slate-400">
          Powered by <span className="font-semibold text-indigo-600">Referral Hire</span>
        </p>
      </div>
    </div>
  );
}
