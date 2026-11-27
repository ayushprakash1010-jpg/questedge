"use client";

import { useState, useEffect } from "react";
import {
  getCompanyRewards,
  approveReward,
  resolveRewardDispute,
  type DisputeResolutionPayload,
} from "@/lib/marketplace-api";
import {
  Loader2,
  ShieldCheck,
  FileCheck,
  History,
  AlertTriangle,
  Scale,
  Download,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { RewardAuditModal } from "@/components/rewards/reward-audit-modal";
import { RewardDisputeModal } from "@/components/rewards/reward-dispute-modal";

export default function CompanyFinancialsPage() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [auditRewardId, setAuditRewardId] = useState<string | null>(null);
  const [disputeReward, setDisputeReward] = useState<any | null>(null);
  const [resolveTarget, setResolveTarget] = useState<any | null>(null);
  const [resolveDecision, setResolveDecision] = useState<DisputeResolutionPayload["decision"]>("REJECTED");
  const [resolveNotes, setResolveNotes] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [resolving, setResolving] = useState(false);

  const exportLedgerCsv = () => {
    const header = ["Date", "Candidate", "Mandate", "Recruiter", "AmountINR", "Status"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = rewards.map((r) => {
      const raw = r.paidAt || r.approvedAt || r.eligibleAt || r.createdAt;
      const dateStr = raw && !isNaN(new Date(raw).getTime()) ? new Date(raw).toISOString().slice(0, 10) : "";
      return [
        dateStr,
        r.referral?.candidateProfile?.name ?? "",
        r.referral?.mandate?.title ?? "",
        r.recruiter?.name ?? "",
        Number(r.rewardAmount || 0),
        r.status ?? "",
      ].map(esc).join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escrow-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ledger exported");
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadError(null);
    try {
      const tokenRes = await fetch("/api/auth/token");
      if (!tokenRes.ok) {
        throw new Error("Unable to authenticate session");
      }
      const { accessToken } = await tokenRes.json();
      const res = await getCompanyRewards(accessToken);
      setRewards(Array.isArray(res) ? res : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load financial ledger";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (rewardId: string) => {
    try {
      setProcessingId(rewardId);
      const tokenRes = await fetch("/api/auth/token");
      if (!tokenRes.ok) {
        throw new Error("Unable to authenticate session");
      }
      const { accessToken } = await tokenRes.json();
      await approveReward(accessToken, rewardId);
      toast.success("Reward approved for payout release");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve reward");
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget || resolveNotes.trim().length < 5) {
      toast.error("Please provide at least 5 characters of resolution notes.");
      return;
    }
    if (resolveDecision === "SETTLED") {
      const amt = Number(settlementAmount);
      if (!Number.isFinite(amt) || amt < 0) {
        toast.error("Enter a valid non-negative settlement amount.");
        return;
      }
    }
    try {
      setResolving(true);
      const tokenRes = await fetch("/api/auth/token");
      if (!tokenRes.ok) {
        throw new Error("Unable to authenticate session");
      }
      const { accessToken } = await tokenRes.json();
      await resolveRewardDispute(accessToken, resolveTarget.id, {
        decision: resolveDecision,
        resolutionNotes: resolveNotes.trim(),
        settlementAmount:
          resolveDecision === "SETTLED" ? Number(settlementAmount) : undefined,
      });
      toast.success("Dispute resolved cleanly");
      setResolveTarget(null);
      setResolveNotes("");
      setSettlementAmount("");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve dispute");
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Aggregate stats safely using Number() on Prisma Decimal values
  const totalPaid = rewards
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0);
  const totalApprovedPending = rewards
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0);
  const totalInEscrow = rewards
    .filter((r) =>
      ["ELIGIBLE", "PENDING_APPROVAL", "APPROVED"].includes(r.status)
    )
    .reduce((sum, r) => sum + Number(r.rewardAmount || 0), 0);
  const formatMoney = (val: number) =>
    `₹${Math.round(val).toLocaleString("en-IN")}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 px-4 py-2.5 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span><strong>Ledger Preview Mode:</strong> Rewards release tracks recruiter bounty approvals directly from the Rewards Ledger.</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 px-2 py-0.5 rounded shrink-0">Preview</span>
      </div>

      <PageHeader
        title="Billing & Escrow"
        subtitle="Manage committed referral bounties and release approved payouts to recruiters."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={exportLedgerCsv}
            disabled={rewards.length === 0}
          >
            <Download className="h-4 w-4" />
            Export Ledger CSV
          </Button>
        }
      />

      <div className="space-y-6">
        {loadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              className="rounded-lg border border-rose-300 bg-white dark:bg-slate-900 dark:border-rose-800 dark:text-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        )}
        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-950/60 p-4 rounded-full">
              <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Committed Payouts Queue</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">{formatMoney(totalInEscrow)}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {totalApprovedPending > 0
                  ? `${formatMoney(totalApprovedPending)} approved & awaiting transfer`
                  : "Eligible & pending approval bounties"}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 rounded-full">
              <FileCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">Total Payouts Released</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">{formatMoney(totalPaid)}</h2>
              <p className="text-sm text-slate-400 mt-1">Settled to recruiter accounts</p>
            </div>
          </div>
        </div>

        {/* Ledger */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Escrow Ledger</h3>
          </div>
          
          {rewards.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No escrow transactions yet. Hire a candidate to see funds move!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Hire Details</th>
                    <th className="px-6 py-4 font-semibold">Recruiter</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {(() => {
                          const raw = reward.paidAt || reward.approvedAt || reward.eligibleAt || reward.createdAt;
                          return raw && !isNaN(new Date(raw).getTime())
                            ? new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                            : "—";
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{reward.referral?.candidateProfile?.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">For {reward.referral?.mandate?.title}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                        {reward.recruiter?.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(reward.rewardAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setAuditRewardId(reward.id)}
                            className="text-xs font-medium text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors flex items-center gap-1"
                            title="View cryptographic SHA-256 audit trail"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                            Audit
                          </button>

                          {reward.status === "DISPUTED" ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                Disputed
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setResolveTarget(reward);
                                  setResolveDecision("REJECTED");
                                  setResolveNotes("");
                                  setSettlementAmount(String(Number(reward.rewardAmount || 0)));
                                }}
                                className="text-xs font-semibold bg-slate-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                Resolve
                              </button>
                            </div>
                          ) : reward.status !== "CANCELLED" && (
                            <button
                              onClick={() =>
                                setDisputeReward({
                                  id: reward.id,
                                  rewardAmount: reward.rewardAmount,
                                  currency: reward.currency,
                                  candidateName: reward.referral?.candidateProfile?.name,
                                  mandateTitle: reward.referral?.mandate?.title,
                                  recruiterName: reward.recruiter?.name,
                                })
                              }
                              className="text-xs font-medium text-slate-500 hover:text-amber-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors flex items-center gap-1"
                              title="Raise formal dispute (e.g. early exit / duplicate)"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              Dispute
                            </button>
                          )}

                          {reward.status === "PENDING_APPROVAL" || reward.status === "ELIGIBLE" ? (
                            <button
                              onClick={() => handleApprove(reward.id)}
                              disabled={processingId === reward.id}
                              className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {processingId === reward.id && <Loader2 className="h-3 w-3 animate-spin" />}
                              Release Funds
                            </button>
                          ) : reward.status !== "DISPUTED" ? (
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                              {reward.status}
                            </span>
                          ) : null}
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
        onDisputeRaised={() => fetchData()}
      />

      {resolveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Resolve reward dispute"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Resolve Reward Dispute
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {resolveTarget.referral?.candidateProfile?.name || "Candidate"} · Original bounty ₹
              {Number(resolveTarget.rewardAmount || 0).toLocaleString("en-IN")}
            </p>
            <form onSubmit={handleResolveDispute} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Resolution Outcome
                </label>
                <select
                  value={resolveDecision}
                  onChange={(e) =>
                    setResolveDecision(e.target.value as DisputeResolutionPayload["decision"])
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="REJECTED">Dismiss Dispute &amp; Approve Payout</option>
                  <option value="SETTLED">Settle Revised Amount</option>
                  <option value="UPHELD">Uphold Clawback &amp; Cancel Reward</option>
                </select>
              </div>
              {resolveDecision === "SETTLED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Settlement Amount (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    required
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Resolution Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={5}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Document evidence and final mediation decision..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResolveTarget(null)}
                  disabled={resolving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resolving}>
                  {resolving ? "Saving..." : "Confirm Resolution"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

