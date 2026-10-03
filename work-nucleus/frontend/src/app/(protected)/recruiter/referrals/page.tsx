"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, Building2, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { RewardBadge } from "@/components/marketplace/MandateCard";

export default function MyReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/referrals/my`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        setReferrals(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING_CONSENT':
      case 'CONSENT_REQUESTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="h-3 w-3" /> Awaiting Consent</span>;
      case 'ACTIVATED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Active in Pipeline</span>;
      case 'CANDIDATE_DECLINED':
      case 'WITHDRAWN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><XCircle className="h-3 w-3" /> Declined</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">{status.replace('_', ' ')}</span>;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Referrals</h1>
            <p className="text-sm text-slate-500">Track the status of candidates you've referred to companies.</p>
          </div>
          <Link href="/recruiter/discover" className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Refer New Candidate
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No referrals yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">Start browsing mandates and referring your top talent to earn rewards.</p>
            <Link href="/recruiter/discover" className="bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-900 px-6 py-2.5 rounded-lg text-sm font-medium transition-all">
              Browse Open Mandates
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-3 font-semibold">Candidate</th>
                  <th className="px-6 py-3 font-semibold">Mandate & Company</th>
                  <th className="px-6 py-3 font-semibold">Reward Status</th>
                  <th className="px-6 py-3 font-semibold">Referral Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{ref.candidateProfile.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{ref.candidateProfile.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{ref.mandate.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {ref.mandate.organization.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ref.mandate.referralRewardAmount ? (
                        <RewardBadge amount={ref.mandate.referralRewardAmount} currency={ref.mandate.currency} />
                      ) : (
                        <span className="text-slate-400 italic">No reward</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ref.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/recruiter/mandates/${ref.mandateId}`} className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1">
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
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
