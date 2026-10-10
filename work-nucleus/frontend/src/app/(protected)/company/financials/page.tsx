"use client";

import { useState, useEffect } from "react";
import { getCompanyRewards, approveReward } from "@/lib/marketplace-api";
import { IndianRupee, Loader2, Building, ShieldCheck, FileCheck, History } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export default function CompanyFinancialsPage() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [addingFunds, setAddingFunds] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAddFunds = async () => {
    setAddingFunds(true);
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error("Failed to load Razorpay SDK. Check your connection.");
        return;
      }

      // Mock options for demo purposes
      const options = {
        key: "rzp_test_dummy_key", 
        amount: 5000000, // 50,000 INR in paise
        currency: "INR",
        name: "QuestEdge Escrow",
        description: "Add funds to your escrow account",
        handler: function (response: any) {
          toast.success(`Successfully added funds! Payment ID: ${response.razorpay_payment_id}`);
          // Here we would typically hit our backend to record the transaction
        },
        prefill: {
          name: "Company Admin",
          email: "admin@company.com",
        },
        theme: {
          color: "#4f46e5", // Indigo-600
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment");
    } finally {
      setAddingFunds(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const res = await getCompanyRewards(accessToken);
      setRewards(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (rewardId: string) => {
    try {
      setProcessingId(rewardId);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      await approveReward(accessToken, rewardId);
      await fetchData();
    } catch (err) {
      console.error("Failed to approve reward", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Aggregate stats
  const totalPaid = rewards.filter((r) => r.status === "PAID" || r.status === "APPROVED").reduce((sum, r) => sum + r.rewardAmount, 0);
  const totalInEscrow = rewards.filter((r) => r.status !== "PAID" && r.status !== "APPROVED" && r.status !== "REJECTED").reduce((sum, r) => sum + r.rewardAmount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-8 w-8 text-indigo-600" />
              Billing & Escrow
            </h1>
            <p className="text-slate-500 mt-2">Manage your deposited bounties and release funds to recruiters.</p>
          </div>
          <button 
            onClick={handleAddFunds}
            disabled={addingFunds}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-70"
          >
            {addingFunds ? <Loader2 className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}
            {addingFunds ? "Processing..." : "Add Funds to Escrow"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="bg-indigo-50 p-4 rounded-full">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Funds in Escrow</p>
              <h2 className="text-4xl font-bold text-slate-900">₹{(totalInEscrow / 1000).toFixed(0)}K</h2>
              <p className="text-sm text-slate-400 mt-1">Locked for pending hires</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="bg-emerald-50 p-4 rounded-full">
              <FileCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Total Payouts Released</p>
              <h2 className="text-4xl font-bold text-slate-900">₹{(totalPaid / 1000).toFixed(0)}K</h2>
              <p className="text-sm text-slate-400 mt-1">Successfully transferred to recruiters</p>
            </div>
          </div>
        </div>

        {/* Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            <h3 className="font-bold text-slate-800">Escrow Ledger</h3>
          </div>
          
          {rewards.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No escrow transactions yet. Hire a candidate to see funds move!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Hire Details</th>
                    <th className="px-6 py-4 font-semibold">Recruiter</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
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
                        <p className="text-slate-500 text-xs">For {reward.referral?.mandate?.title}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {reward.recruiter?.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{reward.rewardAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {reward.status === "PENDING_APPROVAL" || reward.status === "ELIGIBLE" ? (
                          <button
                            onClick={() => handleApprove(reward.id)}
                            disabled={processingId === reward.id}
                            className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {processingId === reward.id && <Loader2 className="h-3 w-3 animate-spin" />}
                            Release Funds
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                            {reward.status}
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
    </div>
  );
}
