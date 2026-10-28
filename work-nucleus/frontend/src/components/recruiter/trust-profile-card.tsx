"use client";

import { useState, useEffect } from "react";
import {
  getMyTrustProfile,
  submitVerificationRequest,
  TrustProfile,
} from "@/lib/marketplace-api";
import {
  ShieldCheck,
  Shield,
  Award,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  X,
  FileCheck,
  Percent,
  Calendar,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { useFocusTrap } from "@/hooks/use-focus-trap";

const TIER_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; glow: string }
> = {
  PLATINUM: {
    label: "Platinum Recruiter",
    bg: "bg-gradient-to-r from-violet-600 to-indigo-600",
    text: "text-white",
    border: "border-indigo-400",
    glow: "shadow-indigo-200",
  },
  GOLD: {
    label: "Gold Verified",
    bg: "bg-gradient-to-r from-amber-500 to-yellow-500",
    text: "text-white",
    border: "border-amber-400",
    glow: "shadow-amber-200",
  },
  SILVER: {
    label: "Silver Verified",
    bg: "bg-gradient-to-r from-slate-400 to-slate-600",
    text: "text-white",
    border: "border-slate-300",
    glow: "shadow-slate-200",
  },
  BRONZE: {
    label: "Bronze Verified",
    bg: "bg-gradient-to-r from-amber-700 to-amber-900",
    text: "text-white",
    border: "border-amber-600",
    glow: "shadow-amber-100",
  },
  UNVERIFIED: {
    label: "Unverified Tier",
    bg: "bg-slate-200",
    text: "text-slate-700",
    border: "border-slate-300",
    glow: "shadow-none",
  },
};

export function TrustProfileCard({
  onRefresh,
}: {
  onRefresh?: () => void;
}) {
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [statement, setStatement] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const modalRef = useFocusTrap({
    isOpen: modalOpen,
    onClose: () => setModalOpen(false),
  });


  const fetchProfile = async () => {
    try {
      setLoading(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const res = await getMyTrustProfile(accessToken);
      setProfile(res);
    } catch (err: any) {
      console.error("Failed to load trust profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (statement.trim().length < 20) {
      toast.error("Please provide at least 20 characters explaining your credentials.");
      return;
    }

    try {
      setSubmitting(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      await submitVerificationRequest(accessToken, {
        statement: statement.trim(),
        linkedinUrl: linkedinUrl.trim() || undefined,
        companyName: companyName.trim() || undefined,
        evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : undefined,
      });

      toast.success("Verification request submitted for admin review.");
      setModalOpen(false);
      await fetchProfile();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit verification request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!profile) return null;

  const tier = TIER_CONFIG[profile.trustTier] || TIER_CONFIG.UNVERIFIED;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-sky-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900">
                  Trust Profile & Quality Tier
                </h3>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm ${tier.bg} ${tier.text}`}
                >
                  {tier.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic 5-factor reputation composite weighted across placements, tenure & consent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-3xl font-extrabold text-slate-900">
                {profile.trustScore}
              </span>
              <span className="text-xs text-slate-400 font-semibold"> / 100</span>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Trust Index
              </span>
            </div>

            {!profile.isVerified && (
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-200 transition-all flex items-center gap-1.5"
              >
                Apply for Badge
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Score Breakdown Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative">
          {/* 1. Placements */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-emerald-600" /> Placements
              </span>
              <span className="font-bold text-slate-800">
                {profile.trustBreakdown?.placements?.score ?? 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${profile.trustBreakdown?.placements?.score ?? 0}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              40% weight ({profile.hiredCount} hires)
            </span>
          </div>

          {/* 2. Tenure */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-600" /> Tenure
              </span>
              <span className="font-bold text-slate-800">
                {profile.trustBreakdown?.tenure?.score ?? 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${profile.trustBreakdown?.tenure?.score ?? 0}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              20% weight ({profile.trustBreakdown?.tenure?.months ?? 0} mos)
            </span>
          </div>

          {/* 3. Consent Rate */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium flex items-center gap-1">
                <Percent className="w-3 h-3 text-sky-600" /> Consent
              </span>
              <span className="font-bold text-slate-800">
                {profile.trustBreakdown?.consentRate?.rate ?? 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${profile.trustBreakdown?.consentRate?.score ?? 0}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              15% weight (Candidate opt-in)
            </span>
          </div>

          {/* 4. Verified Status */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-600" /> Identity
              </span>
              <span className="font-bold text-slate-800">
                {profile.isVerified ? "100%" : "0%"}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  profile.isVerified ? "bg-amber-500 w-full" : "w-0"
                }`}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              15% weight ({profile.isVerified ? "Verified" : "Pending"})
            </span>
          </div>

          {/* 5. Completeness */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-slate-600" /> Profile
              </span>
              <span className="font-bold text-slate-800">
                {profile.trustBreakdown?.profileCompleteness?.pct ?? 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-slate-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    profile.trustBreakdown?.profileCompleteness?.score ?? 0
                  }%`,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              10% weight (Bio, Links, Skills)
            </span>
          </div>
        </div>
      </div>

      {/* Verification Application Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-sky-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Apply for Recruiter Verification
                  </h2>
                  <p className="text-xs text-slate-500">
                    Earn verified badges & higher placement credibility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Verification Statement *
                </label>
                <textarea
                  required
                  rows={4}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Outline your recruiting experience, industry specialization, notable placements, and track record (minimum 20 characters)..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Agency / Employer Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Talent Partners or Independent"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Portfolio or Proof URL (Optional)
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://portfolio.example.com"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || statement.trim().length < 20}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
