"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, DollarSign, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CompanyRewardsDashboard() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      
      const res = await fetch("/api/v1/rewards/company", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setRewards(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (rewardId: string) => {
    setProcessing(rewardId);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      
      const res = await fetch(`/api/v1/rewards/company/${rewardId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!res.ok) throw new Error("Failed to approve reward");
      
      toast.success("Reward approved successfully");
      fetchRewards();
    } catch (err) {
      toast.error("Failed to approve payout");
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const pendingApprovals = rewards.filter(r => r.status === "PENDING_APPROVAL" || r.status === "ELIGIBLE");
  const approvedPayouts = rewards.filter(r => r.status === "APPROVED" || r.status === "PAID");

  const totalPending = pendingApprovals.reduce((sum, r) => sum + Number(r.rewardAmount), 0);
  const totalApproved = approvedPayouts.reduce((sum, r) => sum + Number(r.rewardAmount), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Referral Rewards & Payouts</h1>
          <p className="text-slate-500">Manage recruiter payouts for successfully hired candidates.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-5 w-5" /></div>
              <span className="font-semibold text-sm">Action Required: Pending Approvals</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalPending)}</p>
            <p className="text-sm text-slate-500 mt-2">{pendingApprovals.length} candidates hired</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="h-5 w-5" /></div>
              <span className="font-semibold text-sm">Total Disbursed / Approved</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalApproved)}</p>
            <p className="text-sm text-slate-500 mt-2">{approvedPayouts.length} successful payouts</p>
          </div>
        </div>
      </div>

      {/* Rewards List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">Payout Requests</h2>
        </div>
        
        {rewards.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
            <p>No rewards to manage yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Hired Candidate</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Mandate</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Recruiter (Payee)</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewards.map(reward => (
                  <tr key={reward.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{reward.referral?.candidateProfile?.name || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{reward.referral?.candidateProfile?.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-800">{reward.referral?.mandate?.title}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-800">{reward.recruiter?.name}</p>
                      <p className="text-xs text-slate-500">{reward.recruiter?.email}</p>
                    </td>
                    <td className="p-4 font-bold text-emerald-600">
                      {formatCurrency(Number(reward.rewardAmount))}
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
                      {reward.eligibleAt && <p className="text-[10px] text-slate-400 mt-1">Hired {formatDistanceToNow(new Date(reward.eligibleAt), { addSuffix: true })}</p>}
                    </td>
                    <td className="p-4 text-right">
                      {reward.status === "PENDING_APPROVAL" || reward.status === "ELIGIBLE" ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(reward.id)}
                          disabled={processing === reward.id}
                          className="bg-slate-900 hover:bg-slate-800"
                        >
                          {processing === reward.id ? "Approving..." : "Approve Payout"}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium px-3 py-2">
                          {reward.approvedAt ? `Approved ${new Date(reward.approvedAt).toLocaleDateString()}` : 'Processed'}
                        </span>
                      )}
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
