"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function EarningsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<{ rewards: any[]; pipelinePotential: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEarnings() {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        
        const res = await fetch("/api/v1/rewards/recruiter", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const totalEarned = data?.rewards
    .filter(r => r.status === "APPROVED" || r.status === "PAID")
    .reduce((sum, r) => sum + Number(r.rewardAmount), 0) || 0;

  const totalPending = data?.rewards
    .filter(r => r.status === "ELIGIBLE" || r.status === "PENDING_APPROVAL")
    .reduce((sum, r) => sum + Number(r.rewardAmount), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Earnings & Rewards</h1>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="h-5 w-5" /></div>
              <span className="font-semibold text-sm">Available to Withdraw</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalEarned)}</p>
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
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1">No rewards triggered yet</p>
            <p className="text-sm mb-6 text-center max-w-sm">When your referred candidates get hired, your earned rewards will appear here.</p>
            <Button onClick={() => router.push("/recruiter/discover")}>
              Discover High-Reward Jobs
            </Button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Candidate</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Role / Company</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Date Triggered</th>
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
                    {reward.eligibleAt ? formatDistanceToNow(new Date(reward.eligibleAt), { addSuffix: true }) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
