"use client";

import { useState, useEffect } from "react";
import { getRecruiterRewards } from "@/lib/marketplace-api";
import { IndianRupee, Loader2, CreditCard, Wallet, Clock, ArrowUpRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RecruiterFinancialsPage() {
  const [data, setData] = useState<{ rewards: any[]; pipelinePotential: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const res = await getRecruiterRewards(accessToken);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const rewards = data?.rewards || [];
  const pipelinePotential = data?.pipelinePotential || 0;

  // Aggregate stats
  const totalPaid = rewards.filter((r) => r.status === "PAID").reduce((sum, r) => sum + r.rewardAmount, 0);
  const totalPending = rewards.filter((r) => r.status !== "PAID" && r.status !== "REJECTED").reduce((sum, r) => sum + r.rewardAmount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-200">Paid Out</span>;
      case "APPROVED":
        return <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-indigo-200">Processing</span>;
      case "REJECTED":
        return <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-200">Rejected</span>;
      default:
        return <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-200">Escrow Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8 text-emerald-400" />
              Financials Hub
            </h1>
            <p className="text-slate-400 mt-2">Manage your earnings, pending payouts, and pipeline potential.</p>
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors">
            <ArrowUpRight className="h-5 w-5" />
            Withdraw Funds
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <IndianRupee className="h-24 w-24" />
            </div>
            <p className="text-slate-500 font-medium mb-1 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" /> Available Balance
            </p>
            <h2 className="text-4xl font-bold text-slate-900">₹{(totalPaid / 1000).toFixed(0)}K</h2>
            <p className="text-sm text-slate-400 mt-2">Total lifetime paid</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <p className="text-slate-500 font-medium mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Pending in Escrow
            </p>
            <h2 className="text-4xl font-bold text-slate-900">₹{(totalPending / 1000).toFixed(0)}K</h2>
            <p className="text-sm text-slate-400 mt-2">Awaiting company clearance</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <p className="text-slate-500 font-medium mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-500" /> Pipeline Potential
            </p>
            <h2 className="text-4xl font-bold text-slate-900">₹{(pipelinePotential / 1000).toFixed(0)}K</h2>
            <p className="text-sm text-slate-400 mt-2">From active referrals not yet hired</p>
          </div>
        </div>

        {/* Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-400" />
            <h3 className="font-bold text-slate-800">Transaction History</h3>
          </div>
          
          {rewards.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No transactions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Candidate & Job</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(reward.eligibleAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{reward.referral?.candidateProfile?.name}</p>
                        <p className="text-slate-500 text-xs">
                          {reward.referral?.mandate?.title} @ {reward.referral?.mandate?.organization?.name}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{reward.rewardAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(reward.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Ensure TrendingUp is imported
import { TrendingUp } from "lucide-react";
