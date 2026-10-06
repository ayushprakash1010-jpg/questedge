"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMandateReferrals, updateReferralStatus } from "@/lib/marketplace-api";
import {
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  BadgeCheck,
  Briefcase,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────────

interface Referral {
  id: string;
  status: string;
  recruiterNote?: string;
  aiMatchScore?: number;
  aiMatchSummary?: string;
  aiSummary?: string;
  createdAt: string;
  activatedAt?: string;
  candidateProfile: {
    id: string;
    name: string;
    email: string;
    headline?: string;
    currentDesignation?: string;
    currentCompany?: string;
    experienceYears?: number;
    skills: string[];
    resumeUrl?: string;
    currentLocation?: string;
    isProfileComplete: boolean;
  };
  recruiter: {
    id: string;
    name: string;
    headline?: string;
    isVerified: boolean;
  };
  consent?: {
    id: string;
    status: string;
    requestedAt: string;
    respondedAt?: string;
    expiresAt: string;
  };
  reward?: {
    id: string;
    status: string;
    rewardAmount: number;
    currency: string;
  };
}

// ── Status config ────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING_CONSENT: {
    label: "Consent Pending",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  CONSENT_REQUESTED: {
    label: "Consent Sent",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  CANDIDATE_ACCEPTED: {
    label: "Accepted",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  CANDIDATE_DECLINED: {
    label: "Declined",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  ACTIVATED: {
    label: "Active",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  INTERVIEW: {
    label: "Interview",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  SELECTED: {
    label: "Selected",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-300",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
  HIRED: {
    label: "Hired 🎉",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    color: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-100",
  },
};

const PIPELINE_ACTIONS = [
  { status: "UNDER_REVIEW", label: "Mark Under Review" },
  { status: "SHORTLISTED", label: "Shortlist" },
  { status: "INTERVIEW", label: "Schedule Interview" },
  { status: "SELECTED", label: "Select Candidate" },
  { status: "HIRED", label: "Mark as Hired" },
  { status: "REJECTED", label: "Reject" },
];

const ACTIONABLE_STATUSES = [
  "CANDIDATE_ACCEPTED",
  "ACTIVATED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
];

// ── Status badge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Referral Card ────────────────────────────────────────────────

function ReferralCard({
  referral,
  onStatusChange,
  updating,
}: {
  referral: Referral;
  onStatusChange: (referralId: string, newStatus: string) => void;
  updating: boolean;
}) {
  const isActionable = ACTIONABLE_STATUSES.includes(referral.status);
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {referral.candidateProfile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              {referral.candidateProfile.name}
            </p>
            <p className="text-sm text-slate-500 truncate">
              {referral.candidateProfile.currentDesignation ??
                referral.candidateProfile.headline ??
                "—"}
              {referral.candidateProfile.currentCompany
                ? ` · ${referral.candidateProfile.currentCompany}`
                : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={referral.status} />
      </div>

      {/* Meta row */}
      <div className="px-5 pb-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        {referral.candidateProfile.experienceYears !== undefined && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {referral.candidateProfile.experienceYears}y exp
          </span>
        )}
        {referral.candidateProfile.currentLocation && (
          <span>📍 {referral.candidateProfile.currentLocation}</span>
        )}
        {referral.candidateProfile.skills?.slice(0, 4).map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium"
          >
            {s}
          </span>
        ))}
        {(referral.candidateProfile.skills?.length ?? 0) > 4 && (
          <span className="text-slate-400">
            +{referral.candidateProfile.skills.length - 4}
          </span>
        )}
      </div>

      {/* AI Score (If available) */}
      {referral.aiMatchScore != null && (
        <div className="mx-5 mb-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-indigo-600 fill-indigo-600" />
            <span className="text-sm font-bold text-indigo-900">
              {referral.aiMatchScore}% AI Match
            </span>
          </div>
          {referral.aiMatchSummary && (
            <p className="text-xs text-indigo-700/80 leading-relaxed mb-3">
              {referral.aiMatchSummary}
            </p>
          )}
          {(() => {
            if (!referral.aiSummary) return null;
            try {
              const parsed = JSON.parse(referral.aiSummary);
              if (!parsed.strengths && !parsed.missingSkills) return null;
              
              return (
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-indigo-100/50">
                  {parsed.strengths && parsed.strengths.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 w-16 shrink-0 mt-0.5">Strengths</span>
                      <div className="flex flex-wrap gap-1">
                        {parsed.strengths.map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-[10px] text-emerald-700">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsed.missingSkills && parsed.missingSkills.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 w-16 shrink-0 mt-0.5">Missing</span>
                      <div className="flex flex-wrap gap-1">
                        {parsed.missingSkills.map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 rounded-sm bg-rose-100/50 text-[10px] text-rose-600">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            } catch {
              return null;
            }
          })()}
        </div>
      )}

      {/* Recruiter row */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-sky-100 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <span className="text-sm text-slate-600">
            Referred by{" "}
            <span className="font-medium text-slate-800">
              {referral.recruiter.name}
            </span>
          </span>
          {referral.recruiter.isVerified && (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          )}
        </div>
        {referral.reward && (
          <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">
            ₹{Number(referral.reward.rewardAmount).toLocaleString()} reward
          </span>
        )}
      </div>

      {/* Consent row */}
      {referral.consent && (
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          {referral.consent.status === "ACCEPTED" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                Consent accepted{" "}
                {referral.consent.respondedAt
                  ? new Date(referral.consent.respondedAt).toLocaleDateString()
                  : ""}
              </span>
            </>
          ) : referral.consent.status === "DECLINED" ? (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span>Consent declined</span>
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>
                Consent pending · expires{" "}
                {new Date(referral.consent.expiresAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      )}

      {/* AI Screening row */}
      {referral.aiMatchScore != null && (
        <div className="px-5 py-3 bg-indigo-50/50 border-t border-slate-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-indigo-100 shadow-sm">
              <span className={`text-sm font-bold ${referral.aiMatchScore >= 80 ? 'text-emerald-600' : referral.aiMatchScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {referral.aiMatchScore}%
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-slate-800">AI Match Assessment</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {referral.aiMatchSummary}
              </p>
              {referral.aiSummary && (
                <div className="mt-1.5 flex flex-wrap gap-2 text-[10px]">
                  {(() => {
                    try {
                      const details = JSON.parse(referral.aiSummary);
                      return (
                        <>
                          {details.strengths?.slice(0, 2).map((s: string) => (
                            <span key={s} className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">✓ {s}</span>
                          ))}
                          {details.missingSkills?.slice(0, 2).map((m: string) => (
                            <span key={m} className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700">✗ {m}</span>
                          ))}
                        </>
                      );
                    } catch { return null; }
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {isActionable && (
        <div className="px-5 py-3 border-t border-slate-100">
          {!showActions ? (
            <button
              onClick={() => setShowActions(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Move to next stage <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2 font-medium">
                Move candidate to:
              </p>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_ACTIONS.map((action) => (
                  <button
                    key={action.status}
                    disabled={updating || referral.status === action.status}
                    onClick={() => {
                      onStatusChange(referral.id, action.status);
                      setShowActions(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      action.status === "REJECTED"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                    }`}
                  >
                    {updating ? "..." : action.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowActions(false)}
                className="text-xs text-slate-400 hover:text-slate-600 mt-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter tabs ──────────────────────────────────────────────────

const FILTER_TABS = [
  { label: "All", value: "" },
  { label: "Needs Action", value: "action" },
  { label: "Consent Pending", value: "consent" },
  { label: "In Pipeline", value: "pipeline" },
  { label: "Closed", value: "closed" },
];

function filterReferrals(referrals: Referral[], filter: string): Referral[] {
  if (!filter) return referrals;
  if (filter === "action")
    return referrals.filter((r) => ACTIONABLE_STATUSES.includes(r.status));
  if (filter === "consent")
    return referrals.filter((r) =>
      ["PENDING_CONSENT", "CONSENT_REQUESTED"].includes(r.status)
    );
  if (filter === "pipeline")
    return referrals.filter((r) =>
      ["ACTIVATED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "SELECTED"].includes(
        r.status
      )
    );
  if (filter === "closed")
    return referrals.filter((r) =>
      ["CANDIDATE_DECLINED", "REJECTED", "HIRED", "WITHDRAWN"].includes(r.status)
    );
  return referrals;
}

// ── Main Page ────────────────────────────────────────────────────

export default function MandateReferralsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const data = await getMandateReferrals(accessToken, id);
      setReferrals(data);
    } catch (err) {
      console.error("Failed to load referrals", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleStatusChange = async (referralId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      await updateReferralStatus(accessToken, id, referralId, newStatus);
      setReferrals((prev) =>
        prev.map((r) => (r.id === referralId ? { ...r, status: newStatus } : r))
      );
      setToast({ msg: `Referral moved to ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`, type: "ok" });
    } catch (err: any) {
      setToast({ msg: err?.message ?? "Failed to update status", type: "err" });
    } finally {
      setUpdating(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const filtered = filterReferrals(referrals, filter);

  // Summary stats
  const needsAction = referrals.filter((r) => ACTIONABLE_STATUSES.includes(r.status)).length;
  const consentPending = referrals.filter((r) =>
    ["PENDING_CONSENT", "CONSENT_REQUESTED"].includes(r.status)
  ).length;
  const hired = referrals.filter((r) => r.status === "HIRED").length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "ok" ? (
            <BadgeCheck className="inline h-4 w-4 mr-2" />
          ) : (
            <AlertCircle className="inline h-4 w-4 mr-2" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push(`/mandates/${id}`)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Referral Inbox</h1>
            <p className="text-sm text-slate-500">
              Review candidates referred by recruiters
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => router.push(`/mandates/${id}`)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View Pipeline →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Referrals",
              value: referrals.length,
              icon: Users,
              color: "bg-indigo-500",
            },
            {
              label: "Needs Your Action",
              value: needsAction,
              icon: Star,
              color: "bg-amber-500",
            },
            {
              label: "Consent Pending",
              value: consentPending,
              icon: Clock,
              color: "bg-sky-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"
            >
              <div
                className={`h-10 w-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}
              >
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filter === tab.value
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {tab.label}
              {tab.value === "" && referrals.length > 0 && (
                <span className="ml-1.5 text-xs opacity-75">{referrals.length}</span>
              )}
              {tab.value === "action" && needsAction > 0 && (
                <span className="ml-1.5 text-xs opacity-75">{needsAction}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              {filter ? "No referrals in this category" : "No referrals yet"}
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              {filter
                ? "Try a different filter to see other referrals."
                : "Recruiters haven't submitted any candidates for this mandate yet. Make sure it's published and active."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                onStatusChange={handleStatusChange}
                updating={updating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
