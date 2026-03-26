"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Users, TrendingUp, Clock, Sparkles,
  AlertTriangle, Info, AlertCircle, Download, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart, Cell,
} from "recharts";

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

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const severityConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  critical: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

function exportCsv(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [progress, setProgress] = useState<HiringProgressItem[]>([]);
  const [cost, setCost] = useState<CostItem[]>([]);
  const [interviewers, setInterviewers] = useState<InterviewerStat[]>([]);
  const [sources, setSources] = useState<SourceStat[]>([]);
  const [timeToHire, setTimeToHire] = useState<{ trend: { month: string; avgDays: number }[] }>({ trend: [] });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, fn, pr, co, iv, sr, tth] = await Promise.all([
        fetch("/api/analytics?type=overview").then((r) => r.ok ? r.json() : null),
        fetch("/api/analytics?type=funnel").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=progress").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=cost").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=interviewers").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=sources").then((r) => r.ok ? r.json() : []),
        fetch("/api/analytics?type=time-to-hire").then((r) => r.ok ? r.json() : { trend: [] }),
      ]);
      setOverview(ov);
      setFunnel(Array.isArray(fn) ? fn : []);
      setProgress(Array.isArray(pr) ? pr : []);
      setCost(Array.isArray(co) ? co : []);
      setInterviewers(Array.isArray(iv) ? iv : []);
      setSources(Array.isArray(sr) ? sr : []);
      setTimeToHire(tth || { trend: [] });
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
        setInsights(data.insights || []);
      }
    } catch {
      // ignore
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const kpiCards = [
    { title: "Active Plans", value: overview?.activePlans ?? 0, icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Open Roles", value: `${overview?.openRoles ?? 0}`, sub: `${overview?.fillRate ?? 0}% filled`, icon: Users, color: "text-cyan-600", bg: "bg-cyan-50" },
    { title: "Avg Time to Hire", value: `${overview?.avgTimeToHire ?? 0}d`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "In Pipeline", value: overview?.pipelineCandidates ?? 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Hiring analytics overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", card.bg)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              {"sub" in card && card.sub && (
                <p className="text-xs text-slate-500">{card.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Pipeline Funnel + Hiring Progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pipeline Funnel */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pipeline Funnel</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv(funnel, "pipeline-funnel")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {funnel.length === 0 ? (
              <p className="text-sm text-slate-400">No pipeline data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="entered" fill="#6366f1" name="Entered" />
                  <Bar dataKey="passed" fill="#22c55e" name="Passed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Hiring Progress */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Hiring Progress</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv(progress, "hiring-progress")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {progress.length === 0 ? (
              <p className="text-sm text-slate-400">No active plans</p>
            ) : (
              <div className="space-y-3">
                {progress.slice(0, 6).map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{p.title}</span>
                      <span className="text-slate-500">{p.filledRoles}/{p.totalRoles}</span>
                    </div>
                    <Progress value={p.filledRoles} max={p.totalRoles} className="mt-1" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Time to Hire + Budget */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Time to Hire Trend */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Time to Hire Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {timeToHire.trend.length === 0 || timeToHire.trend.every((t) => t.avgDays === 0) ? (
              <p className="text-sm text-slate-400">No hiring data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timeToHire.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="avgDays" stroke="#6366f1" fill="#e0e7ff" name="Avg Days" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Budget Utilization */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Budget vs Actual</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv(cost, "budget")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {cost.length === 0 ? (
              <p className="text-sm text-slate-400">No cost data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cost.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                  <Bar dataKey="budgetMax" fill="#e0e7ff" name="Budget Max" />
                  <Bar dataKey="avgOfferCtc" fill="#6366f1" name="Avg Offer" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Interviewers + Sources */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Interviewers */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Interviewer Stats</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv(interviewers, "interviewers")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {interviewers.length === 0 ? (
              <p className="text-sm text-slate-400">No interview data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Interviews</th>
                      <th className="pb-2 font-medium">Avg Rating</th>
                      <th className="pb-2 font-medium">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviewers.slice(0, 8).map((i) => (
                      <tr key={i.name} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-900">{i.name}</td>
                        <td className="py-2 text-slate-600">{i.totalInterviews}</td>
                        <td className="py-2 text-slate-600">{i.avgRating}/5</td>
                        <td className="py-2 text-slate-600">{i.avgFeedbackTimeHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sources */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Source Effectiveness</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCsv(sources, "sources")}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-slate-400">No source data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium">Candidates</th>
                      <th className="pb-2 font-medium">Selected</th>
                      <th className="pb-2 font-medium">Rate</th>
                      <th className="pb-2 font-medium">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((s) => (
                      <tr key={s.source} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-900">{s.source}</td>
                        <td className="py-2 text-slate-600">{s.candidates}</td>
                        <td className="py-2 text-slate-600">{s.selected}</td>
                        <td className="py-2 text-slate-600">{s.selectionRate}%</td>
                        <td className="py-2 text-slate-600">{s.avgScore || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 5: AI Insights */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Insights
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateInsights}
            disabled={generatingInsights}
          >
            <Sparkles className={cn("mr-2 h-3.5 w-3.5", generatingInsights && "animate-spin")} />
            {generatingInsights ? "Analyzing..." : insights.length > 0 ? "Regenerate" : "Generate Insights"}
          </Button>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-slate-400">
              Click &quot;Generate Insights&quot; to get AI-powered hiring recommendations.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map((insight, i) => {
                const config = severityConfig[insight.severity] || severityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={i}
                    className={cn("rounded-lg border p-4", config.bg)}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="mt-2 text-xs font-medium text-slate-700">
                            → {insight.recommendation}
                          </p>
                        )}
                        {insight.category && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {insight.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
