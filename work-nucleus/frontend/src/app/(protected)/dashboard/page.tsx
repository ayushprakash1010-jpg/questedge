"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  RefreshCw,
  Rocket,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BrandLoader } from "@/components/ui/brand-loader";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useProfile } from "@/hooks/use-profile";
import { readResponseError } from "@/lib/api";
import { cn } from "@/lib/utils";
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
  rewardBreakdown?: Record<string, { count: number; total: number }>;
  avgRewardPerHire?: number;
  recentPendingReferrals: any[];
  recentActivity?: any[];
}

interface FunnelStage {
  name: string;
  entered: number;
  passed: number;
  rejected: number;
  passThroughRate: number;
  conversionRate?: number;
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

type AnalyticsTab = "overview" | "budget" | "velocity" | "team";
type ActionTab = "queue" | "activity";

const CHART_COLORS = {
  indigo: "#6366f1",
  indigoLight: "#e0e7ff",
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
};

function funnelBarColor(stageName: string, idx: number): string {
  const lower = stageName.toLowerCase();
  if (lower.includes("offer")) return CHART_COLORS.green;
  if (lower.includes("hr")) return CHART_COLORS.cyan;
  if (lower.includes("leadership") || lower.includes("cultural")) return CHART_COLORS.amber;
  if (lower.includes("screen")) return CHART_COLORS.indigo;
  const opacity = Math.max(0.55, 1 - idx * 0.12);
  return `rgba(99,102,241,${opacity.toFixed(2)})`;
}

/** Formats large INR figures compactly so Y-axis ticks stay crisp and unclipped. */
function formatCompactInr(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${+(value / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `₹${+(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${+(value / 1e3).toFixed(0)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
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
  currency = false,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number | string }>;
  label?: string;
  currency?: boolean;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold tabular-nums" style={{ color: entry.color }}>
          {entry.name}:{" "}
          {typeof entry.value === "number"
            ? currency
              ? `₹${entry.value.toLocaleString("en-IN")}`
              : entry.value.toLocaleString()
            : entry.value}
        </p>
      ))}
    </div>
  );
};

function normaliseSeverity(s: string): "info" | "warning" | "critical" {
  return s === "warning" || s === "critical" ? s : "info";
}

function formatRelativeTime(iso: string): string {
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
}

function deriveInsightAction(insight: Insight): { href: string; label: string } {
  const cat = insight.category?.toLowerCase() || "";
  const titleLower = insight.title?.toLowerCase() || "";

  if (
    titleLower.includes("duplicate") ||
    titleLower.includes("referral quality") ||
    titleLower.includes("bottleneck") ||
    titleLower.includes("stalled")
  ) {
    return { href: "/candidates", label: "Review Candidates" };
  }
  if (titleLower.includes("offer")) {
    return { href: "/offers", label: "Review Offers" };
  }
  if (
    titleLower.includes("channel") ||
    titleLower.includes("dependency") ||
    titleLower.includes("sourcing") ||
    cat === "sourcing"
  ) {
    return { href: "/mandates", label: "View Mandates" };
  }
  if (cat === "cost") {
    return { href: "/company/financials", label: "View Financials" };
  }
  return { href: "/candidates", label: "View Candidates" };
}

const SEVERITY_DOT: Record<"info" | "warning" | "critical", string> = {
  info: "bg-sky-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
};

const SEVERITY_LABEL: Record<"info" | "warning" | "critical", string> = {
  info: "text-slate-500 dark:text-slate-400",
  warning: "text-amber-700 dark:text-amber-400",
  critical: "text-rose-700 dark:text-rose-400",
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useProfile();

  // Redirect non-company roles to their dedicated portal before rendering company metrics.
  const userType = (profile as any)?.userType;
  const shouldRedirect =
    !profileLoading &&
    profile &&
    (userType === "RECRUITER" || userType === "CANDIDATE");

  useEffect(() => {
    if (!shouldRedirect) return;
    if (userType === "RECRUITER") {
      router.replace("/recruiter/dashboard");
    } else if (userType === "CANDIDATE") {
      router.replace("/candidate/dashboard");
    }
  }, [shouldRedirect, userType, router]);

  if (profileLoading || shouldRedirect) {
    return <BrandLoader fullscreen={false} message="Loading dashboard..." />;
  }

  return <CompanyDashboardContent profileRole={profile?.role} />;
}

function CompanyDashboardContent({ profileRole }: { profileRole?: string }) {
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
  const [refreshing, setRefreshing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<AnalyticsTab>("overview");
  const [activeActionTab, setActiveActionTab] = useState<ActionTab>("queue");

  // Compact Quick Start bar & collapsible AI Insights drawer
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  useEffect(() => {
    try {
      const storedDismissed = localStorage.getItem("questedge_onboarding_dismissed");
      setOnboardingDismissed(storedDismissed === null ? true : storedDismissed === "true");
      const savedChecks = JSON.parse(
        localStorage.getItem("questedge_onboarding_manual_checks") || "{}"
      );
      setManualChecks(savedChecks);
      const savedInsightsState = localStorage.getItem("questedge_dashboard_insights_expanded");
      setInsightsExpanded(savedInsightsState === "true");
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const toggleManualCheck = (key: string) => {
    setManualChecks((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("questedge_onboarding_manual_checks", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const toggleOnboardingBar = (show?: boolean) => {
    setOnboardingDismissed((prev) => {
      const nextDismissed = typeof show === "boolean" ? !show : !prev;
      try {
        localStorage.setItem("questedge_onboarding_dismissed", String(nextDismissed));
      } catch {
        // ignore
      }
      return nextDismissed;
    });
  };

  const toggleInsightsExpanded = () => {
    setInsightsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("questedge_dashboard_insights_expanded", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const fetchAll = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [ov, fn, pr, co, iv, sr, tth, savedInsights] = await Promise.all([
        fetch("/api/analytics?type=overview").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/analytics?type=funnel").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/analytics?type=progress").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/analytics?type=cost").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/analytics?type=interviewers").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/analytics?type=sources").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/analytics?type=time-to-hire").then((r) =>
          r.ok ? r.json() : { trend: [] }
        ),
        fetch("/api/analytics?type=insights").then((r) => (r.ok ? r.json() : null)),
      ]);
      setOverview(ov);
      setFunnel(Array.isArray(fn) ? fn : []);
      setProgress(Array.isArray(pr) ? pr : []);
      setCost(Array.isArray(co) ? co : []);
      setInterviewers(Array.isArray(iv) ? iv : []);
      setSources(Array.isArray(sr) ? sr : []);
      setTimeToHire(tth || { trend: [] });

      if (savedInsights?.insights) {
        setInsights(Array.isArray(savedInsights.insights) ? savedInsights.insights : []);
        setInsightsGeneratedAt(savedInsights.generatedAt || null);
        setInsightsGeneratedBy(savedInsights.generatedBy?.name || null);
      }
      setLastRefreshed(new Date());
    } catch {
      // ignore transient polling failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAutoRefresh(() => fetchAll(true), 30_000, autoRefresh);

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    try {
      const res = await fetch("/api/analytics", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setInsights(Array.isArray(data.insights) ? data.insights : []);
        setInsightsGeneratedAt(data.generatedAt || new Date().toISOString());
        setInsightsGeneratedBy(data.generatedBy?.name || null);
        setInsightsExpanded(true);
        try {
          localStorage.setItem("questedge_dashboard_insights_expanded", "true");
        } catch {
          // ignore
        }
        toast.success("Insights regenerated successfully");
      } else {
        toast.error(await readResponseError(res, "Failed to generate insights"));
      }
    } catch {
      toast.error("Network error while generating insights");
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (loading) {
    return <BrandLoader fullscreen={false} message="Loading metrics & overview..." />;
  }

  const avgTtHGood = (overview?.avgTimeToHire ?? 0) < 35;
  const hasFunnelData = funnel.length > 0 && funnel.some((s) => s.entered > 0 || s.passed > 0);
  const hasProgressData = progress.length > 0;
  const hasInterviewerData = interviewers.length > 0;
  const hasSourceData = sources.length > 0;
  const hasTimeToHireData =
    timeToHire.trend.length > 0 && timeToHire.trend.some((t) => t.avgDays > 0);
  const hasCostData = cost.length > 0;
  const hasTeamData = hasInterviewerData || hasSourceData;

  const analyticsTabs: Array<{ id: AnalyticsTab; label: string }> = [
    { id: "overview", label: hasFunnelData ? "Pipeline" : "Hiring Progress" },
    ...(hasCostData ? [{ id: "budget" as const, label: "Budget" }] : []),
    ...(hasTimeToHireData ? [{ id: "velocity" as const, label: "Time to Hire" }] : []),
    ...(hasTeamData ? [{ id: "team" as const, label: "Sources & Team" }] : []),
  ];

  const currentAnalyticsTab = analyticsTabs.some((t) => t.id === activeAnalyticsTab)
    ? activeAnalyticsTab
    : "overview";

  const step1Done = Boolean(
    (overview?.activeMandates ?? 0) > 0 ||
      (overview?.activePlans ?? 0) > 0 ||
      (overview?.openRoles ?? 0) > 0 ||
      manualChecks.mandate
  );
  const step2Done = Boolean((funnel && funnel.length > 0) || manualChecks.stages);
  const step3Done = Boolean(manualChecks.team);
  const step4Done = Boolean((overview?.pipelineCandidates ?? 0) > 0 || manualChecks.candidates);
  const completedStepsCount =
    (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0) + (step4Done ? 1 : 0);

  const quickSteps = [
    {
      key: "mandate",
      done: step1Done,
      label: "Create Mandate",
      href: "/mandates/create",
    },
    {
      key: "stages",
      done: step2Done,
      label: "Configure Stages",
      href: "/mandates",
    },
    {
      key: "team",
      done: step3Done,
      label: "Invite Team",
      href: "/admin/users",
    },
    {
      key: "candidates",
      done: step4Done,
      label: "Review Talent",
      href: "/candidates",
    },
  ];

  const canGenerateInsights =
    Boolean(profileRole && ["ADMIN", "HR", "HIRING_MANAGER"].includes(profileRole));

  const exportCurrentTabCsv = () => {
    if (currentAnalyticsTab === "overview") {
      if (hasFunnelData) exportCsv(funnel, "pipeline-funnel");
      else if (hasProgressData) exportCsv(progress, "hiring-progress");
    } else if (currentAnalyticsTab === "budget") {
      exportCsv(cost, "budget-vs-actual");
    } else if (currentAnalyticsTab === "velocity") {
      exportCsv(timeToHire.trend, "time-to-hire");
    } else if (currentAnalyticsTab === "team") {
      exportCsv(hasSourceData ? sources : interviewers, "sources-and-team");
    }
  };

  const canExportCurrentTab =
    (currentAnalyticsTab === "overview" && (hasFunnelData || hasProgressData)) ||
    (currentAnalyticsTab === "budget" && hasCostData) ||
    (currentAnalyticsTab === "velocity" && hasTimeToHireData) ||
    (currentAnalyticsTab === "team" && hasTeamData);

  const pendingReferrals = overview?.recentPendingReferrals ?? [];
  const recentActivity = overview?.recentActivity ?? [];
  const topInsight = insights[0];
  const topAction = topInsight ? deriveInsightAction(topInsight) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={
          <span className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>Hiring overview</span>
            {lastRefreshed && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                · <Clock className="h-3 w-3" />
                {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {completedStepsCount < 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleOnboardingBar()}
                className={cn(
                  "h-8 gap-1.5 text-xs",
                  !onboardingDismissed &&
                    "border-indigo-300 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                )}
              >
                <Rocket className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Setup {completedStepsCount}/4
              </Button>
            )}
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                autoRefresh
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              )}
              title={autoRefresh ? "Auto-refreshing every 30s (click to pause)" : "Auto-refresh paused"}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                )}
              />
              {autoRefresh ? "Live" : "Paused"}
            </button>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => fetchAll(false)}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Compact Quick Start Checklist (toggled cleanly from header) */}
      {!onboardingDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mr-1">
              Quick Start ({completedStepsCount}/4):
            </span>
            {quickSteps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => toggleManualCheck(step.key)}
                  title={step.done ? "Mark incomplete" : "Mark completed"}
                  className="mr-1 text-slate-400 hover:text-emerald-600"
                >
                  {step.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
                <button
                  onClick={() => router.push(step.href)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    step.done
                      ? "bg-slate-100 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-400"
                      : "bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-indigo-950/60"
                  )}
                >
                  {i + 1}. {step.label}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => toggleOnboardingBar(false)}
            aria-label="Hide setup checklist"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Row */}
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
                ? `${overview?.activeMandates} active listing${
                    (overview?.activeMandates ?? 0) > 1 ? "s" : ""
                  }`
                : "0 open positions"
          }
          icon={<Briefcase />}
          accent="indigo"
          onClick={() => router.push("/mandates")}
        />
        <KpiCard
          title="In Pipeline"
          value={overview?.pipelineCandidates ?? 0}
          subValue={`${overview?.selectedCount ?? 0} selected`}
          icon={<Users />}
          accent="cyan"
          onClick={() => router.push("/candidates")}
        />
        <KpiCard
          title="Pending Reviews"
          value={overview?.pendingReferrals ?? 0}
          subValue={(overview?.pendingReferrals ?? 0) > 0 ? "Requires review" : "All caught up"}
          icon={<FileCheck />}
          accent="amber"
          onClick={() => router.push("/candidates?status=PENDING_REVIEW")}
        />
        <KpiCard
          title="Avg Time to Hire"
          value={
            overview?.avgTimeToHire && overview.avgTimeToHire > 0
              ? `${overview.avgTimeToHire}d`
              : "—"
          }
          subValue={
            overview?.fillRate && overview.fillRate > 0
              ? `${overview.fillRate}% fill rate · 35d target`
              : "Awaiting first hire · 35d target"
          }
          icon={<Clock />}
          accent="emerald"
          trend={
            overview?.avgTimeToHire && overview.avgTimeToHire > 0
              ? { label: "vs 35d benchmark", direction: avgTtHGood ? "up" : "down" }
              : undefined
          }
        />
      </div>

      {/* Main 2-Column Workspace: Analytics (left) + Action Queue (right) */}
      <div className="grid gap-5 lg:grid-cols-12 items-stretch">
        <Card className="lg:col-span-8 flex flex-col">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100/80 p-1 dark:bg-slate-800/80">
              {analyticsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAnalyticsTab(tab.id)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
                    currentAnalyticsTab === tab.id
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {canExportCurrentTab && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={exportCurrentTabCsv}
                  title="Export CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Reports
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-between pt-1">
            {currentAnalyticsTab === "overview" && (
              <>
                {hasFunnelData ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={235}>
                      <BarChart data={funnel} margin={{ top: 14, right: 8, bottom: 0, left: -16 }}>
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
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "rgba(99,102,241,0.04)" }}
                        />
                        <Bar dataKey="entered" radius={[5, 5, 0, 0]} name="Entered">
                          {funnel.map((stage, idx) => (
                            <Cell key={stage.name} fill={funnelBarColor(stage.name, idx)} />
                          ))}
                          <LabelList
                            dataKey="entered"
                            position="top"
                            style={{ fontSize: 11, fontWeight: 600, fill: "#64748b" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="flex items-center justify-between gap-2 overflow-x-auto border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                      {funnel.map((stage, i) => (
                        <div key={stage.name} className="flex items-center gap-1.5 shrink-0">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-slate-400">
                              {stage.name}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                              {stage.entered}
                            </span>
                          </div>
                          {i < funnel.length - 1 && (
                            <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {stage.passThroughRate ?? stage.conversionRate ?? 0}% →
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {hasProgressData && (
                      <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Open Hiring Plans
                        </p>
                        {progress.slice(0, 4).map((p) => (
                          <div key={p.id} className="flex items-center gap-3">
                            <span className="w-36 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                              {p.title}
                            </span>
                            <Progress value={p.filledRoles} max={p.totalRoles} className="flex-1 h-1.5" />
                            <span className="w-12 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                              {p.filledRoles}/{p.totalRoles}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : hasProgressData ? (
                  <div className="space-y-4 py-1">
                    {progress.slice(0, 6).map((p) => {
                      const pct =
                        p.totalRoles > 0 ? Math.round((p.filledRoles / p.totalRoles) * 100) : 0;
                      return (
                        <div key={p.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                {p.title}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {p.inPipeline} in pipeline
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                              {p.filledRoles}/{p.totalRoles} filled
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Progress value={p.filledRoles} max={p.totalRoles} className="flex-1 h-2" />
                            <span className="w-9 text-right text-[11px] font-medium text-slate-500 tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <span>Stage conversion funnel activates automatically once applicants enter evaluation.</span>
                      <Link
                        href="/mandates/create"
                        className="font-medium text-indigo-600 hover:text-indigo-700 shrink-0 ml-3"
                      >
                        Post Mandate →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[240px] flex-col items-center justify-center text-center py-8">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      No active candidate pipeline yet
                    </h3>
                    <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                      Publish a mandate or invite referrals to track conversion velocity and stage throughput.
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Button size="sm" onClick={() => router.push("/mandates/create")}>
                        Post a Mandate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push("/candidates")}>
                        View Candidates
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {currentAnalyticsTab === "budget" && hasCostData && (
              <div>
                <ResponsiveContainer width="100%" height={255}>
                  <BarChart data={cost.slice(0, 6)} barGap={6} margin={{ top: 10, right: 12, bottom: 8, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="title"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      width={58}
                      tickFormatter={formatCompactInr}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip currency />} />
                    <Bar dataKey="budgetMax" fill={CHART_COLORS.indigoLight} radius={[4, 4, 0, 0]} name="Budget Max" />
                    <Bar dataKey="avgOfferCtc" fill={CHART_COLORS.indigo} radius={[4, 4, 0, 0]} name="Avg Offer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {currentAnalyticsTab === "velocity" && hasTimeToHireData && (
              <div>
                <ResponsiveContainer width="100%" height={255}>
                  <AreaChart data={timeToHire.trend} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.indigo} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
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
              </div>
            )}

            {currentAnalyticsTab === "team" && hasTeamData && (
              <div className="space-y-4">
                {hasSourceData && (
                  <DataTable className="rounded-lg border border-slate-100 shadow-none dark:border-slate-800">
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
                      {sources.slice(0, 5).map((s) => (
                        <DataTableRow key={s.source}>
                          <DataTableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {s.source}
                          </DataTableCell>
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

                {hasInterviewerData && (
                  <DataTable className="rounded-lg border border-slate-100 shadow-none dark:border-slate-800">
                    <DataTableHeader>
                      <tr>
                        <DataTableHead>Interviewer</DataTableHead>
                        <DataTableHead>Interviews</DataTableHead>
                        <DataTableHead>Avg Rating</DataTableHead>
                        <DataTableHead>Response SLA</DataTableHead>
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {interviewers.slice(0, 5).map((i) => (
                        <DataTableRow key={i.name}>
                          <DataTableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {i.name}
                          </DataTableCell>
                          <DataTableCell>{i.totalInterviews}</DataTableCell>
                          <DataTableCell>{i.avgRating}</DataTableCell>
                          <DataTableCell>{i.avgFeedbackTimeHours}h</DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Unified Action Center (Reviews + Activity) */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 p-1 dark:bg-slate-800/80">
              <button
                onClick={() => setActiveActionTab("queue")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  activeActionTab === "queue"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                )}
              >
                <span>To Review</span>
                {pendingReferrals.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-semibold text-amber-800">
                    {pendingReferrals.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveActionTab("activity")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  activeActionTab === "activity"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                )}
              >
                Activity
              </button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-center">
            {activeActionTab === "queue" ? (
              pendingReferrals.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No pending referrals to review right now.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push("/candidates")}>
                      Candidates
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.push("/mandates")}>
                      Mandates
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 self-stretch">
                  {pendingReferrals.map((ref: any) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ref.candidateProfile?.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          for {ref.mandate?.title}
                        </p>
                      </div>
                      <Link
                        href={`/mandates/${ref.mandateId}`}
                        className="flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Review <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )
            ) : recentActivity.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No recent activity recorded yet.
                </p>
              </div>
            ) : (
              <div className="max-h-[260px] space-y-2.5 overflow-y-auto pr-1 self-stretch">
                {recentActivity.map((act: any) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-2.5 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 dark:bg-slate-800">
                      {act.type === "referral" ? (
                        <UserPlus className="h-3 w-3 text-indigo-500" />
                      ) : (
                        <ClipboardList className="h-3 w-3 text-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                        {act.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatRelativeTime(act.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slim Single-Row Escrow & Rewards Summary Bar */}
      {overview?.rewardBreakdown && (
        <div className="grid grid-cols-2 md:grid-cols-5 items-center gap-4 rounded-xl border border-slate-200/70 bg-white px-5 py-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Potential Pool</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
              ₹{Number(overview.rewardBreakdown.POTENTIAL?.total || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Approval</p>
            <p className="mt-0.5 text-sm font-semibold text-amber-600 tabular-nums">
              ₹{Number(overview.rewardBreakdown.PENDING_APPROVAL?.total || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Approved Rewards</p>
            <p className="mt-0.5 text-sm font-semibold text-indigo-600 tabular-nums">
              ₹{Number(overview.rewardBreakdown.APPROVED?.total || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg Reward / Hire</p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-600 tabular-nums">
              ₹{Number(overview.avgRewardPerHire || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1 flex md:justify-end">
            <Link
              href="/company/financials"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300"
            >
              Financials
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Minimal Collapsible AI Brief */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <button
            onClick={toggleInsightsExpanded}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  AI Hiring Brief
                </span>
                {insights.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {insights.length} signal{insights.length === 1 ? "" : "s"}
                  </span>
                )}
                {insightsGeneratedAt && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Updated {formatRelativeTime(insightsGeneratedAt)}
                    {insightsGeneratedBy ? ` by ${insightsGeneratedBy}` : ""}
                  </span>
                )}
              </div>
              {!insightsExpanded && topInsight && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {topInsight.title}: {topInsight.recommendation || topInsight.description}
                </p>
              )}
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {!insightsExpanded && topAction && (
              <Link
                href={topAction.href}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 mr-1"
              >
                {topAction.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {canGenerateInsights && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateInsights}
                disabled={generatingInsights}
                className="h-8 gap-1.5 text-xs"
              >
                {generatingInsights ? (
                  <Spinner size="xs" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                )}
                {generatingInsights
                  ? "Analyzing..."
                  : insights.length > 0
                    ? "Regenerate"
                    : "Generate"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleInsightsExpanded}
              aria-label={insightsExpanded ? "Collapse AI brief" : "Expand AI brief"}
            >
              {insightsExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </Button>
          </div>
        </div>

        {insightsExpanded && (
          <CardContent className="border-t border-slate-100 pt-4 dark:border-slate-800">
            {insights.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                Click &quot;Generate&quot; to analyze current mandates, pipeline velocity, and hiring bottlenecks.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {insights.map((insight, i) => {
                  const sev = normaliseSeverity(insight.severity);
                  const action = deriveInsightAction(insight);
                  return (
                    <div
                      key={i}
                      className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", SEVERITY_DOT[sev])} />
                            <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {insight.title}
                            </h4>
                          </div>
                          {insight.category && (
                            <span
                              className={cn(
                                "text-[10px] font-medium uppercase tracking-wider shrink-0",
                                SEVERITY_LABEL[sev]
                              )}
                            >
                              {insight.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                          {insight.description}
                        </p>
                        {insight.recommendation && (
                          <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              Next:{" "}
                            </span>
                            {insight.recommendation}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Link
                          href={action.href}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          {action.label}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
