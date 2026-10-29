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
  MapPin,
  Sparkles,
  Maximize2,
  Minimize2,
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
    <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-5 space-y-4">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-2 border-b border-slate-200/60">
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-600" />
          Lifecycle & SLA Audit Trail
        </span>
        <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">
          Ref ID: {referral.id.slice(0, 8)}
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300">
        {steps.map((st, i) => (
          <div key={i} className="relative text-xs pr-2">
            {/* Timeline dot */}
            <div
              className={`absolute -left-[21px] top-0.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center bg-white shadow-2xs ${
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <span
                className={`font-bold text-xs ${
                  st.failed ? "text-rose-700" : st.completed ? "text-slate-900" : "text-slate-600"
                }`}
              >
                {st.title}
              </span>
              <span className="text-xs text-slate-500 font-mono bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-md self-start sm:self-auto shrink-0 shadow-2xs">
                {st.date}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed pr-2">{st.desc}</p>
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
  initialExpandedAi = false,
}: {
  referral: Referral;
  mandateId: string;
  onStatusChange: (referralId: string, newStatus: string) => void;
  onRefresh: () => Promise<void>;
  updating: boolean;
  initialExpandedAi?: boolean;
}) {
  const isActionable = ACTIONABLE_STATUSES.includes(referral.status);
  const [showActions, setShowActions] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState(initialExpandedAi);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setShowAiBreakdown(initialExpandedAi);
  }, [initialExpandedAi]);

  const handleOpenResume = () => {
    const nameParam = encodeURIComponent(referral.candidateProfile?.name || "Candidate");
    window.open(`/resume-viewer?candidateId=${referral.candidateProfile.id}&name=${nameParam}`, "_blank");
  };

  const ownership = getOwnershipDetails(referral.claimScope);
  const consentSla = getConsentSla(referral.consent, referral.status);
  const reviewSla = getReviewSla(referral);

  let parsedAi: { strengths?: string[]; missingSkills?: string[] } | null = null;
  if (referral.aiSummary) {
    try {
      parsedAi = JSON.parse(referral.aiSummary);
    } catch {}
  }

  const strengthsCount = parsedAi?.strengths?.length ?? 0;
  const missingCount = parsedAi?.missingSkills?.length ?? 0;

  let breakdownLabel = "View Match Breakdown";
  if (strengthsCount > 0 && missingCount > 0) {
    breakdownLabel = `View Match Breakdown (${strengthsCount} Strengths, ${missingCount} Gaps)`;
  } else if (strengthsCount > 0) {
    breakdownLabel = `View Match Breakdown (${strengthsCount} Strengths)`;
  } else if (missingCount > 0) {
    breakdownLabel = `View Match Breakdown (${missingCount} Gaps)`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden">
      {/* Card Header */}
      <div className="p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-xs">
            {referral.candidateProfile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-base text-slate-900">
                {referral.candidateProfile.name}
              </h3>
              {ownership.status !== "none" && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${ownership.badgeClass}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {ownership.label}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-0.5 font-medium">
              {referral.candidateProfile.currentDesignation ??
                referral.candidateProfile.headline ??
                "Candidate"}
              {referral.candidateProfile.currentCompany
                ? ` · ${referral.candidateProfile.currentCompany}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {referral.candidateProfile.resumeUrl ? (
            <button
              type="button"
              onClick={handleOpenResume}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
              title="Open candidate resume in new tab"
            >
              <FileText className="h-4 w-4 text-indigo-600" />
              View Resume
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              No Resume
            </span>
          )}
          <StatusBadge status={referral.status} />
        </div>
      </div>

      {/* Meta & Skills Bar */}
      <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          {referral.candidateProfile.experienceYears !== undefined && (
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              {referral.candidateProfile.experienceYears}y exp
            </span>
          )}
          {referral.candidateProfile.currentLocation && (
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {referral.candidateProfile.currentLocation}
            </span>
          )}
          {reviewSla && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                reviewSla.isBreached
                  ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              {reviewSla.label}
            </span>
          )}
        </div>

        {referral.candidateProfile.skills && referral.candidateProfile.skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {referral.candidateProfile.skills.slice(0, 5).map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs"
              >
                {s}
              </span>
            ))}
            {referral.candidateProfile.skills.length > 5 && (
              <span className="text-xs text-slate-400 font-medium px-1">
                +{referral.candidateProfile.skills.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* AI Fit Quick Bar & Collapsible Breakdown */}
      {referral.aiMatchScore != null ? (
        <>
          <div className="px-6 py-2.5 bg-gradient-to-r from-indigo-50/70 via-slate-50/40 to-white border-b border-indigo-100/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-2xs shrink-0">
                <Star className="h-3.5 w-3.5 fill-white" />
                {referral.aiMatchScore}% AI Match
              </span>
              {referral.aiMatchSummary && !showAiBreakdown ? (
                <p className="text-xs text-slate-600 truncate font-medium max-w-xl hidden sm:block">
                  {referral.aiMatchSummary}
                </p>
              ) : (
                <span className="text-xs font-semibold text-indigo-900/80 hidden sm:inline">
                  Automated Candidate-to-Mandate Rubric Fit
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {showAiBreakdown && (
                <button
                  type="button"
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
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                  title="Re-run AI candidate rubric evaluation"
                >
                  {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {isRetrying ? "Evaluating..." : "Re-evaluate"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAiBreakdown(!showAiBreakdown)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50/80 border border-indigo-200/90 px-3.5 py-1.5 rounded-lg transition-all shadow-2xs shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                {showAiBreakdown ? "Hide Match Breakdown" : breakdownLabel}
                {showAiBreakdown ? (
                  <ChevronUp className="h-3.5 w-3.5 text-indigo-500" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-indigo-500" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded AI Rubric & Breakdown */}
          {showAiBreakdown && (
            <div className="p-6 bg-gradient-to-b from-indigo-50/20 to-white border-b border-slate-100 transition-all">
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-indigo-50/30 to-white p-5 space-y-4 shadow-2xs">
                {referral.aiMatchSummary && (
                  <p className="text-sm text-slate-700 leading-relaxed bg-white/80 border border-indigo-100/70 p-3.5 rounded-lg shadow-2xs">
                    {referral.aiMatchSummary}
                  </p>
                )}

                {parsedAi && ((parsedAi.strengths?.length ?? 0) > 0 || (parsedAi.missingSkills?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {parsedAi.strengths && parsedAi.strengths.length > 0 && (
                      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Key Strengths
                        </div>
                        <ul className="space-y-1.5">
                          {parsedAi.strengths.map((s: string, idx: number) => (
                            <li key={idx} className="text-xs text-emerald-950 leading-relaxed flex items-start gap-2">
                              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {parsedAi.missingSkills && parsedAi.missingSkills.length > 0 && (
                      <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                          Missing / Skill Gaps
                        </div>
                        <ul className="space-y-1.5">
                          {parsedAi.missingSkills.map((s: string, idx: number) => (
                            <li key={idx} className="text-xs text-rose-950 leading-relaxed flex items-start gap-2">
                              <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Star className="h-4 w-4 text-slate-300" />
            <span className="font-medium">AI Evaluation Pending / Not Available</span>
          </div>
          <button
            type="button"
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-md shadow-2xs transition-colors disabled:opacity-50"
          >
            {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {isRetrying ? "Evaluating..." : "Run AI Match"}
          </button>
        </div>
      )}

      {/* Recruiter & Consent Row */}
      <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-700 text-xs">
            {referral.recruiter.name.charAt(0)}
          </div>
          <span className="text-slate-600">
            Referred by <strong className="text-slate-800">{referral.recruiter.name}</strong>
          </span>
          {referral.recruiter.isVerified && (
            <span title="Verified Recruiter"><ShieldCheck className="h-4 w-4 text-emerald-500" /></span>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {referral.consent ? (
            <div className="flex items-center gap-1.5 text-slate-600">
              {referral.consent.status === "ACCEPTED" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Consent accepted {referral.consent.respondedAt ? new Date(referral.consent.respondedAt).toLocaleDateString() : ""}
                  </span>
                  <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Verified
                  </span>
                </>
              ) : referral.consent.status === "DECLINED" ? (
                <>
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="text-rose-600 font-medium">Consent declined by candidate</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    Consent pending · expires {new Date(referral.consent.expiresAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>No consent record (Legacy / Direct)</span>
            </div>
          )}

          {referral.reward && (
            <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
              ₹{Number(referral.reward.rewardAmount).toLocaleString()} reward
            </span>
          )}
        </div>
      </div>

      {/* Footer Toolbar: Pipeline Actions + Timeline Toggle */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-white">
        <div>
          {isActionable ? (
            !showActions ? (
              <button
                type="button"
                onClick={() => setShowActions(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
              >
                Move Pipeline Stage <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-semibold mr-1">Move candidate to:</span>
                {PIPELINE_ACTIONS.map((action) => (
                  <button
                    key={action.status}
                    disabled={updating || referral.status === action.status}
                    onClick={() => {
                      onStatusChange(referral.id, action.status);
                      setShowActions(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      action.status === "REJECTED"
                        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                    }`}
                  >
                    {updating ? "..." : action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowActions(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Current Stage:</span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                {STATUS_CONFIG[referral.status]?.label ?? referral.status}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowTimeline(!showTimeline)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-lg border border-slate-200 transition-colors ml-auto shadow-2xs"
        >
          <History className="h-4 w-4 text-slate-500" />
          {showTimeline ? "Hide Audit & Timeline" : "View Audit & Timeline"}
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
  const [globalExpandAi, setGlobalExpandAi] = useState(false);

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

        {/* Filter tabs & Expand All Control */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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

          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() => setGlobalExpandAi(!globalExpandAi)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg transition-colors shadow-2xs ml-auto"
            >
              {globalExpandAi ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-slate-500" />
                  Collapse All Match Breakdowns
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                  Expand All Match Breakdowns
                </>
              )}
            </button>
          )}
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
          <CardGridSkeleton count={3} columns={1} />
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
          <div className="space-y-6">
            {filtered.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                mandateId={id}
                onStatusChange={handleStatusChange}
                onRefresh={refreshSilently}
                updating={updating}
                initialExpandedAi={globalExpandAi}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
