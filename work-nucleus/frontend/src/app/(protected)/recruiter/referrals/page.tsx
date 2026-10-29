"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  UserPlus,
  Building2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  Sparkles,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { RewardBadge } from "@/components/marketplace/MandateCard";
import { TableSkeleton } from "@/components/ui/skeleton-states";
import { MarketplaceEmptyState } from "@/components/ui/marketplace-empty-state";
import { ErrorBanner } from "@/components/ui/error-state";

export default function MyReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingResumeId, setOpeningResumeId] = useState<string | null>(null);

  const handleViewResume = async (candidateId: string) => {
    try {
      setOpeningResumeId(candidateId);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/v1/candidate/profile/${candidateId}/resume`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        alert("Failed to load candidate resume.");
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        alert("Resume file not found.");
      }
    } catch (err) {
      console.error("Failed to view resume", err);
      alert("Failed to open resume.");
    } finally {
      setOpeningResumeId(null);
    }
  };

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/referrals/my`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to load referrals list from server.");
      }
      const data = await response.json();
      setReferrals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load referrals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_CONSENT":
      case "CONSENT_REQUESTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3" /> Awaiting Consent
          </span>
        );
      case "ACTIVATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Active in Pipeline
          </span>
        );
      case "CANDIDATE_DECLINED":
      case "WITHDRAWN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            <XCircle className="h-3 w-3" /> Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
            {status.replace("_", " ")}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Referrals</h1>
            <p className="text-sm text-slate-500">
              Track the status of candidates you've referred to companies.
            </p>
          </div>
          <Link
            href="/recruiter/discover"
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Refer New Candidate
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error Banner */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={fetchReferrals}
          />
        )}

        {loading ? (
          <TableSkeleton rows={6} columns={5} hasAvatar={true} />
        ) : referrals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <MarketplaceEmptyState
              preset="referrals"
              primaryAction={{
                label: "Browse Open Mandates",
                href: "/recruiter/discover",
                icon: Briefcase,
              }}
            />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Candidate</th>
                  <th className="px-6 py-3 font-semibold">Job Mandate</th>
                  <th className="px-6 py-3 font-semibold">Reward Pool</th>
                  <th className="px-6 py-3 font-semibold">Consent & Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {ref.candidateProfile?.name?.[0] ?? "C"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {ref.candidateProfile?.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ref.candidateProfile?.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{ref.mandate?.title}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {ref.mandate?.organization?.name}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {ref.mandate?.referralRewardAmount ? (
                        <RewardBadge
                          amount={ref.mandate.referralRewardAmount}
                          currency={ref.mandate.currency}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(ref.status)}</td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {ref.candidateProfile?.resumeUrl && (
                          <button
                            type="button"
                            onClick={() => handleViewResume(ref.candidateProfile.id)}
                            disabled={openingResumeId === ref.candidateProfile.id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition-colors shadow-xs"
                            title="View Candidate Resume in new tab"
                          >
                            {openingResumeId === ref.candidateProfile.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            Resume
                          </button>
                        )}
                        <Link
                          href={`/recruiter/mandates/${ref.mandateId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          Inspect Mandate <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
