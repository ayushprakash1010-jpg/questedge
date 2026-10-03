"use client";

import { useState, useEffect } from "react";
import { getRecruiterDashboard } from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  IndianRupee,
  Briefcase,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── KPI Card ─────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className={`rounded-xl p-5 text-white bg-gradient-to-br ${gradient} shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-white/80">{label}</p>
        <Icon className="h-5 w-5 text-white/60" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </div>
  );
}

// ── Referral status step ──────────────────────────────────────────

function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────

const referralStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING_CONSENT: { label: "Awaiting Consent", color: "bg-amber-50 text-amber-700 border-amber-200" },
  CONSENT_REQUESTED: { label: "Email Sent", color: "bg-blue-50 text-blue-700 border-blue-200" },
  CANDIDATE_ACCEPTED: { label: "Accepted", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ACTIVATED: { label: "In Pipeline", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  CANDIDATE_DECLINED: { label: "Declined", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const data = await getRecruiterDashboard(accessToken);
        setDashboard(data);
      } catch (err: any) {
        // If the backend returns 400 (no profile), send recruiter to create their profile
        if (err?.status === 400 || err?.status === 404 || err?.message?.includes("profile not found")) {
          setNeedsProfile(true);
        }
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

  // New recruiter — no profile yet, redirect to setup
  if (needsProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-sky-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Welcome to ReferralHire!</h2>
          <p className="text-slate-500 mt-1 text-sm">Set up your recruiter profile to start discovering jobs and earning rewards.</p>
        </div>
        <button
          onClick={() => router.push("/recruiter/profile")}
          className="mt-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
        >
          Set Up My Profile
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <AlertCircle className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">Unable to load dashboard.</p>
      </div>
    );
  }

  const { stats, recentReferrals, topMandates, profile } = dashboard;
  const totalReferrals = stats.totalReferrals;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-sky-200 text-sm mb-1">Welcome back,</p>
          <h1 className="text-2xl font-bold">{profile.name} 👋</h1>
          {profile.headline && (
            <p className="text-sky-100 text-sm mt-1">{profile.headline}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Earned"
            value={`₹${(stats.totalEarnings / 1000).toFixed(0)}K`}
            sub="Paid referral rewards"
            icon={IndianRupee}
            gradient="from-emerald-500 to-teal-600"
          />
          <KpiCard
            label="Reputation Tier"
            value={stats.reputationTier || 'BRONZE'}
            sub="Based on successful placements"
            icon={CheckCircle2}
            gradient={
              stats.reputationTier === 'PLATINUM' ? "from-slate-700 to-slate-900" :
              stats.reputationTier === 'GOLD' ? "from-amber-400 to-yellow-600" :
              stats.reputationTier === 'SILVER' ? "from-slate-400 to-slate-500" :
              "from-orange-400 to-amber-600"
            }
          />
          <KpiCard
            label="Placement Rate"
            value={`${stats.placementSuccessRate || 0}%`}
            sub="Candidates hired"
            icon={TrendingUp}
            gradient="from-violet-500 to-purple-600"
          />
          <KpiCard
            label="Total Referrals"
            value={stats.totalReferrals}
            sub="All time pipeline"
            icon={Users}
            gradient="from-sky-500 to-blue-600"
          />
        </div>

        {/* Referral Velocity Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">Referral Velocity</h3>
            <p className="text-sm text-slate-500">Your sourcing momentum over the last 6 months</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.monthlyReferrals || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Area type="monotone" dataKey="count" name="Referrals" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral funnel */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Referral Funnel</h3>
            <FunnelBar label="Total Referred" value={totalReferrals} max={totalReferrals} color="bg-sky-400" />
            <FunnelBar label="Awaiting Consent" value={stats.pendingConsents} max={totalReferrals} color="bg-amber-400" />
            <FunnelBar label="In Pipeline" value={stats.activePipeline} max={totalReferrals} color="bg-indigo-500" />
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">Activation rate</span>
              <span className="font-bold text-indigo-600">
                {totalReferrals > 0 ? Math.round((stats.activePipeline / totalReferrals) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Recent referrals */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Recent Referrals</h3>
              <button className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {recentReferrals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-10 w-10 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No referrals yet. Start referring candidates!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReferrals.slice(0, 5).map((ref: any) => {
                  const statusConfig = referralStatusLabels[ref.status] ?? { label: ref.status, color: "bg-slate-50 text-slate-600 border-slate-200" };
                  return (
                    <div key={ref.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {ref.candidateProfile?.name?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{ref.candidateProfile?.name}</p>
                        <p className="text-xs text-slate-400 truncate">{ref.mandate?.title} · {ref.mandate?.organization?.name}</p>
                      </div>
                      <span className={cn("text-xs font-medium border rounded-full px-2.5 py-0.5 shrink-0", statusConfig.color)}>
                        {statusConfig.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top mandates */}
        {topMandates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">My Active Mandates</h3>
              <button
                onClick={() => router.push("/recruiter/discover")}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
              >
                Browse more <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {topMandates.map((m: any) => (
                <MandateCard
                  key={m.id}
                  {...m}
                  isJoined={true}
                  viewAs="recruiter"
                  onClick={(id) => router.push(`/recruiter/mandates/${id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
