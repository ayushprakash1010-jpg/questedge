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
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  BadgeCheck,
  Briefcase,
  Star,
  RefreshCw,
  History,
  Timer,
  Lock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/ui/skeleton-states";
import { ErrorBanner } from "@/components/ui/error-state";
import { MarketplaceEmptyState } from "@/components/ui/marketplace-empty-state";

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
  claimScope?: {
    id: string;
    status: string;
    ownershipStartsAt: string;
    ownershipExpiresAt: string;
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

// ── SLA & Ownership Helpers ──────────────────────────────────────

function getOwnershipDetails(claimScope?: Referral["claimScope"]) {
  if (!claimScope) {
    return {
      status: "none",
      label: "No Lock",
      text: "Open sourcing — no exclusive recruiter lock active",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      daysLeft: 0,
      isExpiringSoon: false,
    };
  }

  const expires = new Date(claimScope.ownershipExpiresAt).getTime();
  const diffMs = expires - Date.now();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0 || claimScope.status === "EXPIRED") {
    return {
      status: "expired",
      label: "Lock Expired",
      text: "Recruiter ownership lock has expired — candidate open to marketplace re-claim",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      daysLeft: 0,
      isExpiringSoon: false,
    };
  }

  if (daysLeft <= 7) {
    return {
      status: "expiring_soon",
      label: `Lock Expiring (${daysLeft}d left)`,
      text: `Exclusive recruiter ownership lock expires in ${daysLeft} days`,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
      daysLeft,
      isExpiringSoon: true,
    };
  }

  return {
    status: "active",
    label: `Recruiter Lock (${daysLeft}d)`,
    text: `Active recruiter ownership for ${daysLeft} more days`,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    daysLeft,
    isExpiringSoon: false,
  };
}

function getConsentSla(consent?: Referral["consent"], referralStatus?: string) {
  if (!consent) {
    return {
      status: "none",
      label: "No Consent Record",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      isUrgent: false,
      hoursLeft: 0,
    };
  }

  if (consent.status === "ACCEPTED" || referralStatus === "CANDIDATE_ACCEPTED") {
    return {
      status: "accepted",
      label: `Consent Verified (${consent.respondedAt ? new Date(consent.respondedAt).toLocaleDateString() : "Active"})`,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isUrgent: false,
      hoursLeft: 0,
    };
  }

  if (consent.status === "DECLINED" || referralStatus === "CANDIDATE_DECLINED") {
    return {
      status: "declined",
      label: "Consent Declined",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      isUrgent: false,
      hoursLeft: 0,
    };
  }

  // Pending
  const diffMs = new Date(consent.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    return {
      status: "expired",
      label: "Consent Expired",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      isUrgent: true,
      hoursLeft: 0,
    };
  }

  const isUrgent = hoursLeft <= 48;
  return {
    status: "pending",
    label: hoursLeft <= 48 ? `Consent SLA: ${hoursLeft}h left` : `Consent Pending (${daysLeft}d left)`,
    badgeClass: isUrgent
      ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
      : "bg-amber-50 text-amber-700 border-amber-200",
    isUrgent,
    hoursLeft,
  };
}

function getReviewSla(referral: Referral) {
  const isPendingReview = ["CANDIDATE_ACCEPTED", "ACTIVATED", "UNDER_REVIEW"].includes(referral.status);
  if (!isPendingReview) return null;

  const refDate = referral.activatedAt || referral.createdAt;
  const daysWaiting = Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));

  if (daysWaiting >= 3) {
    return {
      isBreached: daysWaiting >= 7,
      isWarning: daysWaiting >= 3 && daysWaiting < 7,
      daysWaiting,
      label: `Review SLA: ${daysWaiting}d waiting (Target: 3d)`,
    };
  }

  return null;
}

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

// ── Referral Lifecycle Audit Timeline ─────────────────────────────

function ReferralTimeline({ referral }: { referral: Referral }) {
  const ownership = getOwnershipDetails(referral.claimScope);
  const consent = getConsentSla(referral.consent, referral.status);

  const steps = [
    {
      title: "1. Referral Submitted",
      date: new Date(referral.createdAt).toLocaleString(),
      desc: `Submitted by recruiter ${referral.recruiter.name}${
        referral.recruiterNote ? ` • Note: "${referral.recruiterNote}"` : ""
      }`,
      completed: true,
      active: false,
      failed: false,
    },
    {
      title: "2. Candidate Consent",
      date: referral.consent?.respondedAt
        ? new Date(referral.consent.respondedAt).toLocaleString()
        : referral.consent?.requestedAt
        ? `Sent: ${new Date(referral.consent.requestedAt).toLocaleString()} (Expires ${new Date(
            referral.consent.expiresAt
          ).toLocaleDateString()})`
        : "Pending dispatch",
      desc:
        referral.consent?.status === "ACCEPTED"
          ? "Candidate granted verified consent for representation and GDPR/DPDP processing."
          : referral.consent?.status === "DECLINED"
          ? "Candidate explicitly declined consent. Cannot advance in hiring pipeline."
          : `Awaiting candidate response. ${consent.label}`,
      completed: referral.consent?.status === "ACCEPTED",
      failed: referral.consent?.status === "DECLINED",
      active: !referral.consent || referral.consent.status === "PENDING",
    },
    {
      title: "3. AI Resume Screening",
      date: referral.aiMatchScore != null ? "Evaluation complete" : "Pending evaluation",
      desc:
        referral.aiMatchScore != null
          ? `${referral.aiMatchScore}% Match score calculated. ${referral.aiMatchSummary || ""}`
          : "Automated semantic skill & experience match queued.",
      completed: referral.aiMatchScore != null,
      active: false,
      failed: false,
    },
    {
      title: "4. Company Pipeline Stage",
      date: referral.activatedAt ? new Date(referral.activatedAt).toLocaleString() : "Awaiting activation",
      desc: `Current Stage: ${STATUS_CONFIG[referral.status]?.label ?? referral.status}`,
      completed: ["SHORTLISTED", "INTERVIEW", "SELECTED", "HIRED"].includes(referral.status),
      active: ["ACTIVATED", "UNDER_REVIEW"].includes(referral.status),
      failed: referral.status === "REJECTED",
    },
    {
      title: "5. Recruiter Ownership Lock",
      date: referral.claimScope
        ? `Expires: ${new Date(referral.claimScope.ownershipExpiresAt).toLocaleDateString()}`
        : "No lock",
      desc: ownership.text,
      completed: ownership.status === "active",
      failed: ownership.status === "expired",
      active: ownership.isExpiringSoon,
    },
  ];

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-4 px-5 py-4 rounded-b-xl space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-indigo-600" />
          Lifecycle & SLA Audit Trail
        </span>
        <span className="text-[11px] font-normal text-slate-500 font-mono">
          Ref ID: {referral.id.slice(0, 8)}...
        </span>
      </div>

      <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {steps.map((st, i) => (
          <div key={i} className="relative text-xs">
            {/* Timeline dot */}
            <div
              className={`absolute -left-[21px] top-0.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center bg-white ${
                st.failed
                  ? "border-rose-500 bg-rose-50"
                  : st.completed
                  ? "border-emerald-500 bg-emerald-50"
                  : st.active
                  ? "border-amber-500 bg-amber-50 animate-pulse"
                  : "border-slate-300"
              }`}
            >
              {st.completed && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
              {st.failed && <div className="h-1.5 w-1.5 rounded-full bg-rose-600" />}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-semibold ${
                  st.failed ? "text-rose-700" : st.completed ? "text-slate-800" : "text-slate-600"
                }`}
              >
                {st.title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">{st.date}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{st.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Referral Card ────────────────────────────────────────────────

function ReferralCard({
  referral,
  mandateId,
  onStatusChange,
  onRefresh,
  updating,
}: {
  referral: Referral;
  mandateId: string;
  onStatusChange: (referralId: string, newStatus: string) => void;
  onRefresh: () => Promise<void>;
  updating: boolean;
}) {
  const isActionable = ACTIONABLE_STATUSES.includes(referral.status);
  const [showActions, setShowActions] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [openingResume, setOpeningResume] = useState(false);

  const handleOpenResume = () => {
    const nameParam = encodeURIComponent(referral.candidateProfile?.name || "Candidate");
    window.open(`/resume-viewer?candidateId=${referral.candidateProfile.id}&name=${nameParam}`, "_blank");
  };

  const ownership = getOwnershipDetails(referral.claimScope);
  const consentSla = getConsentSla(referral.consent, referral.status);
  const reviewSla = getReviewSla(referral);

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
        <div className="flex items-center gap-2.5 shrink-0">
          {referral.candidateProfile.resumeUrl ? (
            <button
              type="button"
              onClick={handleOpenResume}
              disabled={openingResume}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
              title="Open candidate resume in new tab"
            >
              {openingResume ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
              )}
              View Resume
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-100">
              No Resume
            </span>
          )}
          <StatusBadge status={referral.status} />
        </div>
      </div>

      {/* SLA & Ownership Badges */}
      {(reviewSla || ownership.status !== "none" || consentSla.isUrgent) && (
        <div className="px-5 pb-2.5 flex flex-wrap items-center gap-2">
          {reviewSla && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                reviewSla.isBreached
                  ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <Timer className="h-3 w-3" />
              {reviewSla.label}
            </span>
          )}
          {ownership.status !== "none" && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${ownership.badgeClass}`}
            >
              <ShieldCheck className="h-3 w-3" />
              {ownership.label}
            </span>
          )}
          {consentSla.isUrgent && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${consentSla.badgeClass}`}
            >
              <AlertTriangle className="h-3 w-3" />
              {consentSla.label}
            </span>
          )}
        </div>
      )}

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
      {referral.aiMatchScore != null ? (
        <div className="mx-5 mb-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-indigo-600 fill-indigo-600" />
              <span className="text-sm font-bold text-indigo-900">
                {referral.aiMatchScore}% AI Match
              </span>
            </div>
            <button
              disabled={isRetrying}
              onClick={async () => {
                try {
                  setIsRetrying(true);
                  const tokenRes = await fetch("/api/auth/token");
                  const { accessToken } = await tokenRes.json();
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
                  await fetch(`${API_URL}/api/v1/mandates/${mandateId}/referrals/${referral.id}/trigger-ai`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${accessToken}` },
                  });
                  await onRefresh();
                  setIsRetrying(false);
                } catch (err) {
                  console.error(err);
                  setIsRetrying(false);
                }
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium disabled:opacity-50"
            >
              {isRetrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {isRetrying ? "..." : "Re-evaluate"}
            </button>
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 w-16 shrink-0 mt-0.5">
                        Strengths
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {parsed.strengths.map((s: string) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-[10px] text-emerald-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsed.missingSkills && parsed.missingSkills.length > 0 && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 w-16 shrink-0 mt-0.5">
                        Missing
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {parsed.missingSkills.map((s: string) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded-sm bg-rose-100/50 text-[10px] text-rose-600"
                          >
                            {s}
                          </span>
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
      ) : (
        <div className="mx-5 mb-3 rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col items-center justify-center text-center">
          <Star className="h-5 w-5 text-slate-300 mb-2" />
          <p className="text-xs text-slate-500 mb-3">AI Evaluation Failed or Pending</p>
          <button
            disabled={isRetrying}
            onClick={async () => {
              try {
                setIsRetrying(true);
                const tokenRes = await fetch("/api/auth/token");
                const { accessToken } = await tokenRes.json();
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
                await fetch(`${API_URL}/api/v1/mandates/${mandateId}/referrals/${referral.id}/trigger-ai`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                await onRefresh();
                setIsRetrying(false);
              } catch (err) {
                console.error(err);
                setIsRetrying(false);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors disabled:cursor-not-allowed ${
              isRetrying
                ? "bg-indigo-600 text-white border border-indigo-600 shadow-md"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isRetrying && <Loader2 className="h-3 w-3 animate-spin text-white" />}
            {isRetrying ? "Evaluating..." : "Retry AI Match"}
          </button>
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
            <span className="font-medium text-slate-800">{referral.recruiter.name}</span>
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
      {referral.consent ? (
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            {referral.consent.status === "ACCEPTED" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>
                  Consent accepted{" "}
                  {referral.consent.respondedAt
                    ? new Date(referral.consent.respondedAt).toLocaleDateString()
                    : ""}
                </span>
              </>
            ) : referral.consent.status === "DECLINED" ? (
              <>
                <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span className="text-rose-600 font-medium">Consent declined by candidate</span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>
                  Consent pending · expires{" "}
                  {new Date(referral.consent.expiresAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${consentSla.badgeClass}`}
          >
            {consentSla.status === "accepted"
              ? "Verified"
              : consentSla.status === "declined"
              ? "Declined"
              : `${consentSla.hoursLeft}h left`}
          </span>
        </div>
      ) : (
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>No consent record (Legacy / Direct)</span>
        </div>
      )}

      {/* Footer Actions & Audit Timeline Toggle */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          {isActionable ? (
            !showActions ? (
              <button
                onClick={() => setShowActions(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Move stage <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="space-y-2 py-1">
                <p className="text-xs text-slate-500 font-medium">Move candidate to:</p>
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
            )
          ) : referral.status === "PENDING_CONSENT" || referral.consent?.status === "PENDING" ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <Lock className="h-3.5 w-3.5" /> Consent required before pipeline progression
            </span>
          ) : referral.status === "CANDIDATE_DECLINED" || referral.consent?.status === "DECLINED" ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <XCircle className="h-3.5 w-3.5" /> Pipeline locked: Candidate declined
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Stage finalized: {STATUS_CONFIG[referral.status]?.label ?? referral.status}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors ml-auto"
        >
          <History className="h-3.5 w-3.5" />
          {showTimeline ? "Hide Audit" : "Audit & Timeline"}
          {showTimeline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expandable Lifecycle Timeline */}
      {showTimeline && <ReferralTimeline referral={referral} />}
    </div>
  );
}

// ── Filter tabs ──────────────────────────────────────────────────

const FILTER_TABS = [
  { label: "All", value: "" },
  { label: "Needs Action", value: "action" },
  { label: "SLA Alerts", value: "sla_alerts" },
  { label: "Consent Pending", value: "consent" },
  { label: "In Pipeline", value: "pipeline" },
  { label: "Closed", value: "closed" },
];

function filterReferrals(referrals: Referral[], filter: string): Referral[] {
  if (!filter) return referrals;
  if (filter === "action")
    return referrals.filter((r) => ACTIONABLE_STATUSES.includes(r.status));
  if (filter === "sla_alerts")
    return referrals.filter((r) => {
      const isPending = ["CANDIDATE_ACCEPTED", "ACTIVATED", "UNDER_REVIEW"].includes(r.status);
      const days = isPending
        ? Math.floor(
            (Date.now() - new Date(r.activatedAt || r.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;
      const consentDiff = r.consent?.expiresAt
        ? new Date(r.consent.expiresAt).getTime() - Date.now()
        : 999999999;
      const isConsentUrgent =
        ["PENDING_CONSENT", "CONSENT_REQUESTED"].includes(r.status) &&
        consentDiff > 0 &&
        consentDiff <= 48 * 3600 * 1000;
      const isOwnershipExpiring =
        r.claimScope &&
        new Date(r.claimScope.ownershipExpiresAt).getTime() - Date.now() <=
          7 * 86400 * 1000;
      return days >= 3 || isConsentUrgent || isOwnershipExpiring;
    });
  if (filter === "consent")
    return referrals.filter((r) =>
      ["PENDING_CONSENT", "CONSENT_REQUESTED"].includes(r.status)
    );
  if (filter === "pipeline")
    return referrals.filter((r) =>
      ["ACTIVATED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "SELECTED"].includes(r.status)
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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const data = await getMandateReferrals(accessToken, id);
      setReferrals(data);
    } catch (err: any) {
      console.error("Failed to load referrals", err);
      setError(err?.message || "Failed to load referrals. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refreshSilently = useCallback(async () => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const data = await getMandateReferrals(accessToken, id);
      setReferrals(data);
    } catch (err) {
      console.error("Failed to silently refresh referrals", err);
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
      setToast({
        msg: `Referral moved to ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`,
        type: "ok",
      });
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
  const urgentConsent = referrals.filter((r) => {
    if (!["PENDING_CONSENT", "CONSENT_REQUESTED"].includes(r.status) || !r.consent?.expiresAt)
      return false;
    const diff = new Date(r.consent.expiresAt).getTime() - Date.now();
    return diff > 0 && diff <= 48 * 60 * 60 * 1000;
  }).length;
  const activeOwnerships = referrals.filter((r) => {
    if (!r.claimScope) return false;
    const diff = new Date(r.claimScope.ownershipExpiresAt).getTime() - Date.now();
    return diff > 0 && r.claimScope.status === "ACTIVE";
  }).length;
  const expiringOwnerships = referrals.filter((r) => {
    if (!r.claimScope) return false;
    const diff = new Date(r.claimScope.ownershipExpiresAt).getTime() - Date.now();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const slaAlerts = referrals.filter((r) => {
    const isPending = ["CANDIDATE_ACCEPTED", "ACTIVATED", "UNDER_REVIEW"].includes(r.status);
    if (!isPending) return false;
    const refDate = r.activatedAt || r.createdAt;
    const days = Math.floor(
      (Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days >= 3;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
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
              Review candidates referred by recruiters with live SLA & ownership tracking
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Referrals",
              value: referrals.length,
              sub: "All recruiter submissions",
              icon: Users,
              color: "bg-indigo-500",
            },
            {
              label: "Review SLA Alerts",
              value: slaAlerts,
              sub: `${needsAction} in active pipeline`,
              icon: Timer,
              color: slaAlerts > 0 ? "bg-amber-500" : "bg-slate-500",
            },
            {
              label: "Consent Pending",
              value: consentPending,
              sub: urgentConsent > 0 ? `${urgentConsent} urgent (<48h)` : "Awaiting candidate",
              icon: Clock,
              color: urgentConsent > 0 ? "bg-rose-500" : "bg-sky-500",
            },
            {
              label: "Active Recruiter Locks",
              value: activeOwnerships,
              sub: expiringOwnerships > 0 ? `${expiringOwnerships} expiring in 7d` : "Exclusive ownership",
              icon: ShieldCheck,
              color: "bg-emerald-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm"
            >
              <div
                className={`h-10 w-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}
              >
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-[11px] text-slate-400 truncate">{s.sub}</p>
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
              {tab.value === "sla_alerts" && slaAlerts > 0 && (
                <span className="ml-1.5 text-xs px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
                  {slaAlerts}
                </span>
              )}
              {tab.value === "consent" && consentPending > 0 && (
                <span className="ml-1.5 text-xs opacity-75">{consentPending}</span>
              )}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={fetchReferrals}
            onReset={filter ? () => setFilter("") : undefined}
          />
        )}

        {/* Content */}
        {loading ? (
          <CardGridSkeleton count={4} columns={2} />
        ) : filtered.length === 0 ? (
          <MarketplaceEmptyState
            preset="referrals"
            title={filter ? "No Referrals Matching Filter" : "No Referrals Yet"}
            description={
              filter
                ? "Try a different filter or reset all filters to view candidate referrals."
                : "Recruiters haven't submitted any candidates for this mandate yet. Make sure it's published and active."
            }
            action={
              filter
                ? {
                    label: "Clear Filter",
                    onClick: () => setFilter(""),
                  }
                : undefined
            }
            secondaryAction={{
              label: "View Mandate Details",
              href: `/mandates/${id}`,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                mandateId={id}
                onStatusChange={handleStatusChange}
                onRefresh={refreshSilently}
                updating={updating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
