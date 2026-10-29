"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { withdrawReward } from "@/lib/marketplace-api";
import { StatsGridSkeleton, TableSkeleton } from "@/components/ui/skeleton-states";
import { MarketplaceEmptyState } from "@/components/ui/marketplace-empty-state";
import { ErrorBanner } from "@/components/ui/error-state";
import { RewardAuditModal } from "@/components/rewards/reward-audit-modal";
import { RewardDisputeModal } from "@/components/rewards/reward-dispute-modal";


export default function EarningsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<{ rewards: any[]; pipelinePotential: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [auditRewardId, setAuditRewardId] = useState<string | null>(null);
  const [disputeReward, setDisputeReward] = useState<any | null>(null);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError(null);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

      const res = await fetch(`${API_URL}/api/v1/rewards/recruiter`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error("Failed to load recruiter earnings data from server.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load earnings records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleWithdraw = async (rewardId: string) => {
    try {
      setWithdrawingId(rewardId);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      
      await withdrawReward(accessToken, rewardId);
      toast.success("Simulated withdrawal recorded (Demo Mode). Test reference generated.");
      await fetchEarnings();
    } catch (err: any) {
      console.error("Withdraw Error:", err);
      toast.error(`Failed to withdraw: ${err.message || "Unknown error"}`);
    } finally {
      setWithdrawingId(null);
    }
  };


  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const availableToWithdraw = data?.rewards
    ? data.rewards
        .filter(r => r.status === "APPROVED")
        .reduce((sum, r) => sum + Number(r.rewardAmount), 0)
    : 0;

  const totalWithdrawn = data?.rewards
    ? data.rewards
        .filter(r => r.status === "PAID")
        .reduce((sum, r) => sum + Number(r.rewardAmount), 0)
    : 0;

  const totalPending = data?.rewards
    ? data.rewards
        .filter(r => r.status === "ELIGIBLE" || r.status === "PENDING_APPROVAL")
        .reduce((sum, r) => sum + Number(r.rewardAmount), 0)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Earnings & Rewards</h1>

      {/* Demo / Sandbox Banner (P0-10) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-amber-900">Simulated Payout Environment</p>
          <p className="text-amber-700 text-xs mt-0.5">Automated bank transfers and payouts are currently operating in sandbox simulation mode. Withdrawals generate test payment references for workflow testing.</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={fetchEarnings}
        />
      )}

      {loading ? (
        <div className="space-y-6">
          <StatsGridSkeleton count={4} />
          <TableSkeleton rows={5} columns={6} hasAvatar={false} />
        </div>
      ) : (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="h-5 w-5" /></div>
              <span className="font-semibold text-sm">Available to Withdraw</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(availableToWithdraw)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2 text-indigo-600">
              <div className="p-2 bg-indigo-50 rounded-lg"><DollarSign className="h-5 w-5" /></div>
              <span className="font-semibold text-sm">Total Withdrawn</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalWithdrawn)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-5 w-5" /></div>
              <span className="font-semibold text-sm">Pending Approvals</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalPending)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-sky-200 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2 text-sky-600">
              <div className="p-2 bg-sky-50 rounded-lg"><TrendingUp className="h-5 w-5" /></div>
              <span className="font-semibold text-sm">Pipeline Potential</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(data?.pipelinePotential || 0)}</p>
          </div>
        </div>
      </div>

      {/* Rewards List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Historical Rewards</h2>
        </div>
        
        {(!data?.rewards || data.rewards.length === 0) ? (
          <MarketplaceEmptyState
            preset="earnings"
            primaryAction={{
              label: "Discover High-Reward Jobs",
              href: "/recruiter/discover",
            }}
          />
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Candidate</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Role / Company</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Date Triggered</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rewards.map(reward => (
                <tr key={reward.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{reward.referral?.candidateProfile?.name || "Unknown"}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-800">{reward.referral?.mandate?.title}</p>
                    <p className="text-xs text-slate-500">{reward.referral?.mandate?.organization?.name}</p>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border
                      ${reward.status === 'APPROVED' || reward.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        reward.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }
                    `}>
                      {reward.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-700">
                    {formatCurrency(Number(reward.rewardAmount))}
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {(() => {
                      const raw = reward.eligibleAt || reward.paidAt || reward.approvedAt || reward.createdAt;
                      return raw && !isNaN(new Date(raw).getTime())
                        ? formatDistanceToNow(new Date(raw), { addSuffix: true })
                        : "-";
                    })()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={() => setAuditRewardId(reward.id)}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 px-2 py-1 rounded border border-slate-200 hover:border-indigo-300 transition-colors"
                        title="View immutable cryptographic audit trail"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                        Audit
                      </button>

                      {reward.status === "DISPUTED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Disputed
                        </span>
                      ) : reward.status !== "CANCELLED" && (
                        <button
                          onClick={() =>
                            setDisputeReward({
                              id: reward.id,
                              rewardAmount: reward.rewardAmount,
                              currency: reward.currency,
                              candidateName: reward.referral?.candidateProfile?.name,
                              mandateTitle: reward.referral?.mandate?.title,
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 px-2 py-1 rounded border border-slate-200 hover:border-amber-300 transition-colors"
                          title="Raise formal dispute"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          Dispute
                        </button>
                      )}

                      {reward.status === "APPROVED" && (
                        <Button
                          size="sm"
                          onClick={() => handleWithdraw(reward.id)}
                          disabled={withdrawingId === reward.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs"
                        >
                          {withdrawingId === reward.id ? "Processing..." : "Withdraw (Demo)"}
                        </Button>
                      )}
                      {reward.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          ✓ {reward.paymentRef || "Paid"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )}

  {/* P4-05: Cryptographic Audit Trail Modal */}
  <RewardAuditModal
    rewardId={auditRewardId || ""}
    isOpen={!!auditRewardId}
    onClose={() => setAuditRewardId(null)}
  />

  {/* P4-05: Reward Dispute Modal */}
  <RewardDisputeModal
    reward={disputeReward}
    isOpen={!!disputeReward}
    onClose={() => setDisputeReward(null)}
    onDisputeRaised={() => fetchEarnings()}
  />
</div>
  );
}

