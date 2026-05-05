"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Users, TrendingUp, Clock, Sparkles,
  Download, RefreshCw, CalendarClock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
      }
    } catch {
      // ignore
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Plans"
          value={overview?.activePlans ?? 0}
          icon={<ClipboardList />}
          accent="indigo"
          trend={{ label: "+2 this month", direction: "up" }}
        />
        <KpiCard
          title="Open Roles"
          value={overview?.openRoles ?? 0}
          subValue={`${overview?.fillRate ?? 0}% filled`}
          icon={<Users />}
          accent="cyan"
          trend={{ label: `${overview?.filledRoles ?? 0} filled`, direction: "up" }}
        />
        <KpiCard
          title="Avg Time to Hire"
          value={`${overview?.avgTimeToHire ?? 0}d`}
          icon={<Clock />}
          accent="amber"
          trend={{ label: "vs 35d avg", direction: avgTtHGood ? "up" : "down" }}
        />
        <KpiCard
          title="In Pipeline"
          value={overview?.pipelineCandidates ?? 0}
          icon={<TrendingUp />}
          accent="emerald"
          trend={{ label: `${overview?.selectedCount ?? 0} selected`, direction: "up" }}
        />
      </div>

      {/* Row 2: Pipeline Funnel + Hiring Progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pipeline Funnel</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(funnel, "pipeline-funnel")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {funnel.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center">
                <p className="text-sm text-slate-400">No pipeline data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnel} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="entered" fill={CHART_COLORS.indigo} radius={[0, 4, 4, 0]} name="Entered" />
                  <Bar dataKey="passed" fill={CHART_COLORS.green} radius={[0, 4, 4, 0]} name="Passed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Hiring Progress</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(progress, "hiring-progress")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {progress.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center">
                <p className="text-sm text-slate-400">No active plans</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Time to Hire + Budget */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Time to Hire Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {timeToHire.trend.length === 0 || timeToHire.trend.every((t) => t.avgDays === 0) ? (
              <div className="flex h-[250px] items-center justify-center">
                <p className="text-sm text-slate-400">No hiring data yet</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Budget vs Actual</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(cost, "budget")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {cost.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center">
                <p className="text-sm text-slate-400">No cost data</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Interviewers + Sources */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Interviewer Stats</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(interviewers, "interviewers")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {interviewers.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-400">No interview data</p>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Source Effectiveness</CardTitle>
            <Button variant="ghost" size="icon-sm" onClick={() => exportCsv(sources, "sources")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {sources.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-400">No source data</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: AI Insights */}
      <Card className="overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
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
    </div>
  );
}
