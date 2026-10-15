"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Users, TrendingUp, Clock, Sparkles,
  Download, RefreshCw, CalendarClock, UserPlus, FileCheck, ExternalLink,
  Briefcase, ArrowUpRight, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { AiInsightCard } from "@/components/shared/ai-insight-card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";

interface Overview {
  activePlans: number;
  totalRoles: number;
  openRoles: number;
  filledRoles: number;
  fillRate: number;
  pipelineCandidates: number;
  selectedCount: number;
  rejectedCount: number;
  avgTimeToHire: number;
  trend: { month: string; count: number }[];
  activeMandates: number;
  pendingReferrals: number;
  rewardCommitments: number;
  recentPendingReferrals: any[];
  recentActivity?: any[];
}

interface FunnelStage {
  name: string;
  entered: number;
  passed: number;
  rejected: number;
  passThroughRate: number;
  avgDays: number;
}

interface HiringProgressItem {
  id: string;
  title: string;
  totalRoles: number;
  filledRoles: number;
  inPipeline: number;
  progress: number;
}

interface CostItem {
  title: string;
  budgetMin: number;
  budgetMax: number;
  avgOfferCtc: number;
  totalSpent: number;
  filledRoles: number;
  totalRoles: number;
}

interface InterviewerStat {
  name: string;
  totalInterviews: number;
  avgRating: number;
  avgFeedbackTimeHours: number;
}

interface SourceStat {
  source: string;
  candidates: number;
  selected: number;
  selectionRate: number;
  avgScore: number;
}

interface Insight {
  title: string;
  description: string;
  severity: string;
  category: string;
  recommendation: string;
}

const CHART_COLORS = {
  indigo: "#6366f1",
  indigoLight: "#e0e7ff",
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
};

// Funnel bar colors per stage — mirrors design-system-v2/ui-kit/01-Dashboard
// where Screening / Technical rounds use indigo (with progressively lighter
// opacity), HR uses cyan, Leadership/Cultural use amber, and Offer uses
// emerald. Stage label matching is fuzzy so renames don't break colors.
function funnelBarColor(stageName: string, idx: number): string {
  const lower = stageName.toLowerCase();
  if (lower.includes("offer")) return CHART_COLORS.green;
  if (lower.includes("hr")) return CHART_COLORS.cyan;
  if (lower.includes("leadership") || lower.includes("cultural"))
    return CHART_COLORS.amber;
  if (lower.includes("screen")) return CHART_COLORS.indigo;
  // Tech rounds — fade indigo as they go deeper.
  const opacity = Math.max(0.55, 1 - idx * 0.12);
  return `rgba(99,102,241,${opacity.toFixed(2)})`;
}

function exportCsv(data: unknown[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0] as Record<string, unknown>);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? ""))
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number | string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          className="text-sm font-semibold"
          style={{ color: entry.color }}
        >
          {entry.name}:{" "}
          {typeof entry.value === "number"
            ? entry.value.toLocaleString()
            : entry.value}
        </p>
      ))}
    </div>
  );
};

// Narrow the API's free-form severity string to the AiInsightCard's enum.
function normaliseSeverity(s: string): "info" | "warning" | "critical" {
  return s === "warning" || s === "critical" ? s : "info";
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [progress, setProgress] = useState<HiringProgressItem[]>([]);
  const [cost, setCost] = useState<CostItem[]>([]);
  const [interviewers, setInterviewers] = useState<InterviewerStat[]>([]);
  const [sources, setSources] = useState<SourceStat[]>([]);
  const [timeToHire, setTimeToHire] = useState<{
    trend: { month: string; avgDays: number }[];
  }>({ trend: [] });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<string | null>(null);
  const [insightsGeneratedBy, setInsightsGeneratedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, fn, pr, co, iv, sr, tth, savedInsights] = await Promise.all([
        fetch("/api/analytics?type=overview").then((r) => r.ok ? r.json() : null),
        fetch("/api/analytics?type=funnel").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=progress").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=cost").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=interviewers").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=sources").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=time-to-hire").then((r) => r.ok ? r.json() : { trend: [] }),
        fetch("/api/analytics?type=insights").then((r) => r.ok ? r.json() : null),
      ]);
      setOverview(ov);
      setFunnel(Array.isArray(fn) ? fn : []);
      setProgress(Array.isArray(pr) ? pr : []);
      setCost(Array.isArray(co) ? co : []);
      setInterviewers(Array.isArray(iv) ? iv : []);
      setSources(Array.isArray(sr) ? sr : []);
      setTimeToHire(tth || { trend: [] });

      if (savedInsights?.insights) {
        const insightsData = Array.isArray(savedInsights.insights)
          ? savedInsights.insights
          : [];
        setInsights(insightsData);
        setInsightsGeneratedAt(savedInsights.generatedAt || null);
        setInsightsGeneratedBy(savedInsights.generatedBy?.name || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    try {
      const res = await fetch("/api/analytics", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const newInsights = Array.isArray(data.insights) ? data.insights : [];
        setInsights(newInsights);
        setInsightsGeneratedAt(data.generatedAt || new Date().toISOString());
        setInsightsGeneratedBy(data.generatedBy?.name || null);
        toast.success("Insights regenerated successfully");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || errData.error || "Failed to generate insights");
      }
    } catch {
      toast.error("Network error while generating insights");
    } finally {
      setGeneratingInsights(false);
    }
  };

  const formatGeneratedDate = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const avgTtHGood = (overview?.avgTimeToHire ?? 0) < 35;
  const hasFunnelData = funnel.length > 0 && funnel.some((s) => s.entered > 0 || s.passed > 0);
  const hasProgressData = progress.length > 0;
  const hasInterviewerData = interviewers.length > 0;
  const hasSourceData = sources.length > 0;
  const hasTimeToHireData = timeToHire.trend.length > 0 && timeToHire.trend.some((t) => t.avgDays > 0);
  const hasCostData = cost.length > 0;
  const hasAnySecondaryAnalytics = hasInterviewerData || hasSourceData || hasTimeToHireData || hasCostData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Hiring analytics overview"
        actions={
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {/* KPI Cards: 4 Focused & Actionable Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Mandates"
          value={overview?.activeMandates ?? overview?.openRoles ?? 0}
          subValue={
            (overview?.openRoles ?? 0) > 0
              ? `${overview?.openRoles} open position${(overview?.openRoles ?? 0) > 1 ? "s" : ""}${
                  (overview?.activePlans ?? 0) > 0 ? ` · ${overview?.activePlans} plans` : ""
                }`
              : (overview?.activeMandates ?? 0) > 0
              ? `${overview?.activeMandates} active listing${(overview?.activeMandates ?? 0) > 1 ? "s" : ""}`
              : "0 open positions"
          }
          icon={<Briefcase />}
          accent="indigo"
          onClick={() => router.push('/mandates')}
        />
        <KpiCard
          title="In Pipeline"
          value={overview?.pipelineCandidates ?? 0}
          subValue={`${overview?.selectedCount ?? 0} selected`}
          icon={<Users />}
          accent="cyan"
          onClick={() => router.push('/candidates')}
        />
        <KpiCard
          title="Pending Reviews"
          value={overview?.pendingReferrals ?? 0}
          subValue={(overview?.pendingReferrals ?? 0) > 0 ? "Requires review" : "Up to date"}
          icon={<FileCheck />}
          accent="amber"
          onClick={() => router.push('/candidates?status=PENDING_REVIEW')}
        />
        <KpiCard
          title="Avg Time to Hire"
          value={`${overview?.avgTimeToHire ?? 0}d`}
          subValue={`${overview?.fillRate ?? 0}% fill rate`}
          icon={<Clock />}
          accent="emerald"
          trend={{ label: "vs 35d benchmark", direction: avgTtHGood ? "up" : "down" }}
        />
      </div>

      {/* Core Pipeline & Action Center */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {hasFunnelData ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pipeline Funnel</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(funnel, "pipeline-funnel")}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={funnel}
                    margin={{ top: 16, right: 8, bottom: 0, left: -16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="entered" radius={[5, 5, 0, 0]} name="Entered">
                      {funnel.map((stage, idx) => (
                        <Cell key={stage.name} fill={funnelBarColor(stage.name, idx)} />
                      ))}
                      <LabelList
                        dataKey="entered"
                        position="top"
                        style={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : hasProgressData ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Hiring Progress</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(progress, "hiring-progress")}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {progress.slice(0, 6).map((p) => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 truncate max-w-[220px]">{p.title}</span>
                        <span className="text-xs font-semibold text-slate-900">{p.filledRoles}/{p.totalRoles}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={p.filledRoles} max={p.totalRoles} className="flex-1" />
                        <span className="text-[10px] font-medium text-slate-400 w-8 text-right">
                          {p.totalRoles > 0 ? Math.round((p.filledRoles / p.totalRoles) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col justify-center border-dashed border-slate-200/80 bg-slate-50/40 min-h-[340px]">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-sm">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">No active candidate pipeline yet</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Post a mandate or upload candidate profiles to automatically track interview stages and conversion velocity.
                </p>
                <div className="mt-5 flex items-center gap-2.5">
                  <Button size="sm" onClick={() => router.push('/mandates')}>
                    Post a Mandate
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push('/candidates')}>
                    View Candidates
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* If BOTH funnel and progress have data, render progress below */}
          {hasFunnelData && hasProgressData && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Hiring Progress</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(progress, "hiring-progress")}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {progress.slice(0, 6).map((p) => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 truncate max-w-[220px]">{p.title}</span>
                        <span className="text-xs font-semibold text-slate-900">{p.filledRoles}/{p.totalRoles}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={p.filledRoles} max={p.totalRoles} className="flex-1" />
                        <span className="text-[10px] font-medium text-slate-400 w-8 text-right">
                          {p.totalRoles > 0 ? Math.round((p.filledRoles / p.totalRoles) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Action Center */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Review New Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              {!overview?.recentPendingReferrals?.length ? (
                <div className="flex h-[130px] flex-col items-center justify-center gap-2.5 text-center">
                  <p className="text-xs text-slate-400">No pending referrals to review</p>
                  <Button variant="outline" size="sm" onClick={() => router.push('/mandates')}>Post a Mandate</Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {overview.recentPendingReferrals.map((ref: any) => (
                    <div key={ref.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{ref.candidateProfile?.name}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[140px]">for {ref.mandate?.title}</p>
                      </div>
                      <Link href={`/mandates/${ref.mandateId}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        Review <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {!overview?.recentActivity?.length ? (
                <div className="flex h-[130px] flex-col items-center justify-center gap-2 text-center">
                  <p className="text-xs text-slate-400">No recent activity recorded</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {overview.recentActivity.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
                      <div className="h-7 w-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                        {act.type === 'referral' ? <UserPlus className="h-3 w-3 text-indigo-500" /> : <ClipboardList className="h-3 w-3 text-emerald-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-700 font-medium leading-tight truncate">{act.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatGeneratedDate(act.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Insights Card */}
      <Card className="overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              AI Insights
            </CardTitle>
            {insightsGeneratedAt && (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                <CalendarClock className="h-3 w-3" />
                Generated {formatGeneratedDate(insightsGeneratedAt)}
                {insightsGeneratedBy && (
                  <span className="text-slate-400">by {insightsGeneratedBy}</span>
                )}
              </span>
            )}
          </div>
          <Button
            variant="ai"
            size="sm"
            onClick={handleGenerateInsights}
            disabled={generatingInsights}
          >
            {generatingInsights ? (
              <Spinner size="xs" tone="white" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generatingInsights ? "Analyzing..." : insights.length > 0 ? "Regenerate" : "Generate Insights"}
          </Button>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <Sparkles className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Click &quot;Generate Insights&quot; to get AI-powered hiring recommendations.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {insights.map((insight, i) => (
                <AiInsightCard
                  key={i}
                  severity={normaliseSeverity(insight.severity)}
                  title={insight.title}
                  description={insight.description}
                  recommendation={insight.recommendation}
                  category={insight.category}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Analytics: only display when data exists, avoiding empty clutter */}
      {hasAnySecondaryAnalytics ? (
        <div className="space-y-4">
          {(hasInterviewerData || hasSourceData) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {hasInterviewerData && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Interviewer Stats</CardTitle>
                    <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(interviewers, "interviewers")}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <DataTable className="rounded-none border-0 shadow-none">
                      <DataTableHeader>
                        <tr>
                          <DataTableHead>Name</DataTableHead>
                          <DataTableHead>Interviews</DataTableHead>
                          <DataTableHead>Avg Rating</DataTableHead>
                          <DataTableHead>Response</DataTableHead>
                        </tr>
                      </DataTableHeader>
                      <DataTableBody>
                        {interviewers.slice(0, 8).map((i) => (
                          <DataTableRow key={i.name}>
                            <DataTableCell className="font-medium text-slate-900">{i.name}</DataTableCell>
                            <DataTableCell>{i.totalInterviews}</DataTableCell>
                            <DataTableCell>
                              <div className="flex items-center gap-1.5">
                                <div className="flex">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full mr-0.5",
                                        idx < Math.round(i.avgRating) ? "bg-amber-400" : "bg-slate-200"
                                      )}
                                    />
                                  ))}
                                </div>
                                <span>{i.avgRating}</span>
                              </div>
                            </DataTableCell>
                            <DataTableCell>{i.avgFeedbackTimeHours}h</DataTableCell>
                          </DataTableRow>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  </CardContent>
                </Card>
              )}

              {hasSourceData && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Source Effectiveness</CardTitle>
                    <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(sources, "sources")}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <DataTable className="rounded-none border-0 shadow-none">
                      <DataTableHeader>
                        <tr>
                          <DataTableHead>Source</DataTableHead>
                          <DataTableHead>Candidates</DataTableHead>
                          <DataTableHead>Selected</DataTableHead>
                          <DataTableHead>Rate</DataTableHead>
                          <DataTableHead>Score</DataTableHead>
                        </tr>
                      </DataTableHeader>
                      <DataTableBody>
                        {sources.map((s) => (
                          <DataTableRow key={s.source}>
                            <DataTableCell className="font-medium text-slate-900">{s.source}</DataTableCell>
                            <DataTableCell>{s.candidates}</DataTableCell>
                            <DataTableCell>{s.selected}</DataTableCell>
                            <DataTableCell>
                              <Badge variant={s.selectionRate > 20 ? "success" : "outline"} className="text-[10px]">
                                {s.selectionRate}%
                              </Badge>
                            </DataTableCell>
                            <DataTableCell>{s.avgScore || "—"}</DataTableCell>
                          </DataTableRow>
                        ))}
                      </DataTableBody>
                    </DataTable>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {(hasTimeToHireData || hasCostData) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {hasTimeToHireData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Time to Hire Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={timeToHire.trend}>
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.indigo} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="avgDays"
                          stroke={CHART_COLORS.indigo}
                          strokeWidth={2}
                          fill="url(#areaGradient)"
                          name="Avg Days"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {hasCostData && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Budget vs Actual</CardTitle>
                    <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(cost, "budget")}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cost.slice(0, 6)} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="title" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={0} angle={-20} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="budgetMax" fill={CHART_COLORS.indigoLight} radius={[4, 4, 0, 0]} name="Budget Max" />
                        <Bar dataKey="avgOfferCtc" fill={CHART_COLORS.indigo} radius={[4, 4, 0, 0]} name="Avg Offer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Advanced Analytics & Reports</p>
              <p className="text-[11px] text-slate-500">
                Interviewer scoring, referral channel ROI, and budget forecasts automatically activate as hiring data grows.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium text-slate-700 hover:text-indigo-600"
            onClick={() => router.push('/admin/reports')}
          >
            Open Reports <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
