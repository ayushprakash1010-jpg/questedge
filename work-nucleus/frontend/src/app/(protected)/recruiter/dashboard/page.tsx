"use client";

import { useState, useEffect } from "react";
import { getRecruiterDashboard } from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  IndianRupee,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronRight,
  Search,
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
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
        <Button onClick={() => router.push("/recruiter/profile")}>
          Set Up My Profile
        </Button>
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
    <>
      <PageHeader 
        title={`Welcome back, ${profile.name} 👋`} 
        subtitle={profile.headline || "Recruiter Dashboard"} 
      />

      <div className="space-y-8 pb-8">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Earned"
            value={`₹${(stats.totalEarnings / 1000).toFixed(0)}K`}
            subValue="Paid referral rewards"
            icon={<IndianRupee />}
            accent="emerald"
          />
          <KpiCard
            title="Reputation Tier"
            value={stats.reputationTier || 'BRONZE'}
            subValue="Based on successful placements"
            icon={<CheckCircle2 />}
            accent={
              stats.reputationTier === 'PLATINUM' ? "indigo" :
              stats.reputationTier === 'GOLD' ? "amber" :
              stats.reputationTier === 'SILVER' ? "cyan" :
              "amber"
            }
          />
          <KpiCard
            title="Placement Rate"
            value={`${stats.placementSuccessRate || 0}%`}
            subValue="Candidates hired"
            icon={<TrendingUp />}
            accent="purple"
          />
          <KpiCard
            title="Total Referrals"
            value={stats.totalReferrals}
            subValue="All time pipeline"
            icon={<Users />}
            accent="cyan"
          />
        </div>

        {/* Referral Velocity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Referral Velocity</CardTitle>
            <p className="text-sm text-slate-500">Your sourcing momentum over the last 6 months</p>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FunnelBar label="Total Referred" value={totalReferrals} max={totalReferrals} color="bg-cyan-500" />
              <FunnelBar label="Awaiting Consent" value={stats.pendingConsents} max={totalReferrals} color="bg-amber-400" />
              <FunnelBar label="In Pipeline" value={stats.activePipeline} max={totalReferrals} color="bg-indigo-500" />
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">Activation rate</span>
                <span className="font-bold text-indigo-600">
                  {totalReferrals > 0 ? Math.round((stats.activePipeline / totalReferrals) * 100) : 0}%
                </span>
              </div>
              {totalReferrals === 0 && (
                <div className="pt-2">
                  <Button variant="outline" className="w-full text-sky-600 border-sky-200 hover:bg-sky-50" onClick={() => router.push("/recruiter/discover")}>
                    Discover Jobs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent referrals */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Recent Referrals</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-sky-600">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentReferrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-800">No referrals yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4 max-w-[200px]">Browse active mandates and submit your first referral to start earning.</p>
                  <Button size="sm" onClick={() => router.push("/recruiter/discover")}>
                    Browse Mandates
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {recentReferrals.slice(0, 5).map((ref: any) => {
                    const statusConfig = referralStatusLabels[ref.status] ?? { label: ref.status, color: "bg-slate-50 text-slate-600 border-slate-200" };
                    return (
                      <div key={ref.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
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
            </CardContent>
          </Card>
        </div>

        {/* Top mandates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">My Active Mandates</h3>
            <Button variant="ghost" size="sm" onClick={() => router.push("/recruiter/discover")} className="h-8 text-xs text-sky-600">
              Browse more <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          
          {topMandates.length > 0 ? (
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
          ) : (
            <div className="border border-dashed border-slate-200 rounded-xl bg-slate-50 p-8 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No Active Mandates</p>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm">
                You haven't joined any mandates yet. Discover high-reward jobs and join them to start referring candidates.
              </p>
              <Button onClick={() => router.push("/recruiter/discover")}>
                Discover High-Reward Jobs
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
