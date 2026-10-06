"use client";

import { useEffect, useState } from "react";
import { getPendingConsents } from "@/lib/marketplace-api";
import {
  Loader2, CheckCircle2, XCircle, Clock, Building2, MapPin,
  Users, AlertCircle, ArrowLeft, Sparkles, Shield, TrendingUp, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toaster";

export default function CandidateReferralsPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const data = await getPendingConsents(accessToken);
        setConsents(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRespond = async (consentToken: string, accepted: boolean) => {
    setRespondingTo(consentToken);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      await fetch(`${apiUrl}/api/v1/candidate/consents/${consentToken}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accepted }),
      });
      setConsents((prev) => prev.filter((c) => c.consentToken !== consentToken));
      toast.success(accepted ? "Referral accepted!" : "Referral declined.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to respond to referral. Please try again.");
    } finally {
      setRespondingTo(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Premium Dark Hero Banner ────────────────────────── */}
      <div className="relative overflow-hidden bg-slate-900 px-6 py-10 md:py-14">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-slate-900 to-slate-900" />
        <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute right-10 bottom-0 h-[200px] w-[200px] rounded-full bg-teal-500/8 blur-[60px]" />

        <div className="relative mx-auto max-w-4xl">
          <button
            onClick={() => router.push("/candidate/dashboard")}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Referral Center</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                My <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Referrals</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl">
                Manage consent requests from recruiters who want to refer you to top companies.
              </p>
            </div>
            {consents.length > 0 && (
              <span className="shrink-0 inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 font-semibold text-sm px-3.5 py-1.5 rounded-full ring-1 ring-amber-500/30">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {consents.length} pending
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading your referrals...</p>
            </div>
          </div>
        ) : consents.length === 0 ? (
          /* Premium empty state */
          <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-12 md:p-16 text-center shadow-sm">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-50 rounded-full blur-3xl -ml-12 -mb-12 opacity-60" />
            
            <div className="relative">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-emerald-100 rounded-3xl rotate-6 scale-105 opacity-40" />
                <div className="absolute inset-0 bg-teal-50 rounded-3xl -rotate-3 scale-102 opacity-60" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-inner">
                  <Users className="h-10 w-10 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No pending referrals</h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                When a recruiter refers you to a company, you'll see their request here to review and accept or decline.
              </p>

              {/* How it works - mini steps */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                {[
                  { step: "1", label: "Complete your profile", icon: Sparkles },
                  { step: "2", label: "Get discovered by recruiters", icon: TrendingUp },
                  { step: "3", label: "Accept & get referred", icon: CheckCircle2 },
                ].map(({ step, label, icon: Icon }, i) => (
                  <div key={step} className="flex items-center gap-3">
                    {i > 0 && <div className="hidden md:block w-8 h-px bg-slate-200" />}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                        {step}
                      </div>
                      <span className="text-sm text-slate-600 font-medium">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push("/candidate/jobs")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5"
              >
                Browse Open Jobs <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {consents.map((consent) => {
              const mandate = consent.referral?.mandate;
              const recruiter = consent.referral?.recruiter;
              const daysLeft = Math.max(
                0,
                Math.ceil((new Date(consent.expiresAt).getTime() - Date.now()) / 86400000)
              );
              const isResponding = respondingTo === consent.consentToken;

              return (
                <div key={consent.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-600 shrink-0">
                      {mandate?.organization?.name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{mandate?.title ?? "Job Opportunity"}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {mandate?.organization?.name}
                            </span>
                            {mandate?.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {mandate.location}
                              </span>
                            )}
                            {mandate?.workModel && (
                              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                                {mandate.workModel}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                          daysLeft <= 2
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          <Clock className="h-3 w-3" />
                          {daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
                        </span>
                      </div>

                      <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Referred by</p>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                            {recruiter?.name?.[0] ?? "R"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{recruiter?.name}</p>
                            {recruiter?.headline && (
                              <p className="text-xs text-slate-400">{recruiter.headline}</p>
                            )}
                          </div>
                          {recruiter?.isVerified && (
                            <CheckCircle2 className="h-4 w-4 text-sky-500 ml-auto" />
                          )}
                        </div>
                      </div>

                      {mandate?.referralRewardAmount && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <span className="text-amber-600 font-medium">
                            🏆 ₹{mandate.referralRewardAmount.toLocaleString()} referral reward if hired
                          </span>
                        </div>
                      )}

                      <div className="flex gap-3 mt-4">
                        <button
                          disabled={isResponding}
                          onClick={() => handleRespond(consent.consentToken, false)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Decline
                        </button>
                        <button
                          disabled={isResponding}
                          onClick={() => handleRespond(consent.consentToken, true)}
                          className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Accept Referral
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
