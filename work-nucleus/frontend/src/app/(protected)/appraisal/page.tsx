"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Download,
  Mail,
  Users,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";
import { cn } from "@/lib/utils";

// Appraisal overview — design-system-v2/ui-kit/08-Appraisal-Cycle.html.
// The mockup shows an HR/admin scope but the available API surface is
// employee-scoped (/api/v2/appraisal/assessments/home). The page mirrors the
// mockup's chrome (KPI strip + cycle phases + rating distribution + quick
// actions + assessments table) using the employee data, framed as "My
// Appraisal Overview".

interface Cycle {
  id: string;
  name: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
}

interface MyGoal {
  id: string;
  title: string;
  weight: number;
  status: string;
  cycle: { id: string; name: string; status: string };
}

interface MyAssessment {
  id: string;
  cycleId: string;
  type: string;
  status: string;
  finalRating: string | null;
  ratingLabel: string | null;
  acknowledgedAt: string | null;
}

interface HomeData {
  cycles: Cycle[];
  goals: MyGoal[];
  peerFeedbackPending: number;
  assessments: MyAssessment[];
}

// Six-step canonical phase ordering used in the timeline.
const PHASES = [
  { key: "GOAL_SETTING", label: "Goal Setting" },
  { key: "MID_YEAR", label: "Mid-Year Check-in" },
  { key: "SELF_ASSESSMENT", label: "Self Assessment" },
  { key: "MANAGER_REVIEW", label: "Manager Review" },
  { key: "CALIBRATION", label: "Calibration" },
  { key: "FINAL_REVIEW", label: "Final Review" },
] as const;

// Map cycle.status (free-form / phase-like) to one of the canonical phase keys
// so we can highlight the active node. Anything we don't recognise falls back
// to GOAL_SETTING (the first phase).
function activePhaseFor(cycleStatus: string): (typeof PHASES)[number]["key"] {
  const upper = cycleStatus.toUpperCase();
  if (upper.includes("FINAL")) return "FINAL_REVIEW";
  if (upper.includes("CALIBRAT")) return "CALIBRATION";
  if (upper.includes("MANAGER")) return "MANAGER_REVIEW";
  if (upper.includes("SELF")) return "SELF_ASSESSMENT";
  if (upper.includes("MID")) return "MID_YEAR";
  return "GOAL_SETTING";
}

// Rating label palette (mockup spec)
const ratingPaletteByLabel: Record<
  string,
  { label: string; bar: string; text: string }
> = {
  EXCEEDS: {
    label: "Exceeds",
    bar: "from-emerald-500 to-emerald-600",
    text: "text-emerald-700",
  },
  MEETS_PLUS: {
    label: "Meets+",
    bar: "from-indigo-500 to-indigo-600",
    text: "text-indigo-700",
  },
  MEETS: {
    label: "Meets",
    bar: "from-slate-400 to-slate-500",
    text: "text-slate-600",
  },
  BELOW: {
    label: "Below",
    bar: "from-amber-500 to-amber-600",
    text: "text-amber-700",
  },
  PIP: {
    label: "PIP",
    bar: "from-red-500 to-red-600",
    text: "text-red-700",
  },
};

const RATING_BUCKETS = ["EXCEEDS", "MEETS_PLUS", "MEETS", "BELOW", "PIP"];

const statusPill: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  ACKNOWLEDGED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUBMITTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CALIBRATED: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function AppraisalHomePage() {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    fetch("/api/v2/appraisal/assessments/home")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const stats = useMemo(() => computeStats(data), [data]);
  const ratingDist = useMemo(() => computeRatingDist(data), [data]);
  const cycle = data?.cycles[0] ?? null;
  const activePhase = cycle ? activePhaseFor(cycle.status) : null;
  const activeIdx = PHASES.findIndex((p) => p.key === activePhase);
  const cycleProgressPct =
    activeIdx >= 0 ? ((activeIdx + 1) / PHASES.length) * 100 : 0;

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appraisal"
        subtitle={
          cycle
            ? `${cycle.name} · ${cycle.type} · ${data.cycles.length} active cycle${data.cycles.length === 1 ? "" : "s"}`
            : "Cycles, goals, self-assessment, and peer feedback at a glance."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
            <Button variant="ai" size="sm" disabled>
              <Sparkles className="h-4 w-4" />
              AI Insights
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          gradient="from-indigo-500 to-indigo-600"
          label="Active Cycles"
          value={String(stats.cycles)}
          sub={cycle ? cycle.name : "No cycle in progress"}
          progress={cycleProgressPct}
        />
        <Kpi
          gradient="from-emerald-500 to-emerald-600"
          label="My Goals"
          value={String(stats.goals)}
          sub={
            stats.goals === 0
              ? "No goals captured"
              : `${stats.goals} active goal${stats.goals === 1 ? "" : "s"}`
          }
          subTone="emerald"
        />
        <Kpi
          gradient="from-amber-500 to-amber-600"
          label="Self-Assessments"
          value={String(stats.selfAssessmentsPending)}
          sub={stats.selfAssessmentsPending > 0 ? "Awaiting your input" : "All up to date"}
          subTone={stats.selfAssessmentsPending > 0 ? "amber" : undefined}
        />
        <Kpi
          gradient="from-purple-500 to-purple-600"
          label="Peer Feedback"
          value={String(data.peerFeedbackPending)}
          sub={
            data.peerFeedbackPending > 0 ? "Pending requests" : "No pending requests"
          }
          subTone={data.peerFeedbackPending > 0 ? "purple" : undefined}
        />
        <Kpi
          gradient="from-cyan-500 to-cyan-600"
          label="Latest Rating"
          value={stats.latestRating?.label ?? "—"}
          sub={
            stats.latestRating?.cycleName
              ? stats.latestRating.cycleName
              : "No rating recorded"
          }
        />
      </div>

      {/* Cycle phases + Rating distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Cycle Phases</CardTitle>
            <span className="text-[11px] text-slate-400">
              {cycle ? cycle.name : "No cycle"}
            </span>
          </CardHeader>
          <CardContent>
            {cycle ? (
              <CyclePhasesTimeline activeIdx={activeIdx} />
            ) : (
              <p className="py-4 text-sm text-slate-400">
                No active cycle to track.
              </p>
            )}
            <AiNudge>
              {cycle
                ? `Currently in ${PHASES[Math.max(0, activeIdx)].label}. Stay on top of any pending items above.`
                : "When a cycle is active, the AI nudge will surface what to focus on next."}
            </AiNudge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Rating Distribution</CardTitle>
            <span className="text-[11px] text-slate-400">
              {ratingDist.total} rating{ratingDist.total === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent>
            {ratingDist.total === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Ratings will appear here once your assessments are completed.
              </p>
            ) : (
              <RatingDistribution dist={ratingDist} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          icon={Mail}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          title="Send Reminders"
          subtitle={
            data.peerFeedbackPending > 0
              ? `${data.peerFeedbackPending} pending peer review${data.peerFeedbackPending === 1 ? "" : "s"}`
              : "Nudge teammates on their pending tasks"
          }
          badge={data.peerFeedbackPending > 0 ? "Action needed" : undefined}
          badgeClass="bg-amber-50 text-amber-700"
        />
        <ActionCard
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Schedule Calibration"
          subtitle="Set up the committee session"
          badge="Recommended"
          badgeClass="bg-emerald-50 text-emerald-700"
        />
        <ActionCard
          icon={Sparkles}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          title="Generate Review Summaries"
          subtitle="AI drafts for your reports"
          badge="AI Powered"
          badgeClass="bg-purple-50 text-purple-700"
        />
      </div>

      {/* My goals */}
      {data.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListChecks className="h-4 w-4 text-indigo-600" />
              My Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.goals.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-lg border border-slate-200/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {g.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {g.cycle.name} · weight {g.weight}%
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                    statusPill[g.status] ??
                      "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {g.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Assessments table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">My Assessments</CardTitle>
          {data.cycles.length > 0 && (
            <Link
              href={`/appraisal/cycles/${data.cycles[0].id}/assessment`}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              Open active cycle
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.assessments.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">
              No assessments yet.
            </p>
          ) : (
            <DataTable className="rounded-none border-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Type</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Rating</DataTableHead>
                  <DataTableHead>Acknowledged</DataTableHead>
                  <DataTableHead className="text-right">Action</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {data.assessments.map((a) => {
                  const palette = a.ratingLabel
                    ? ratingPaletteByLabel[a.ratingLabel.toUpperCase()]
                    : null;
                  return (
                    <DataTableRow key={a.id}>
                      <DataTableCell className="font-medium text-slate-900">
                        {a.type.replace(/_/g, " ")}
                      </DataTableCell>
                      <DataTableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold",
                            statusPill[a.status] ??
                              "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {a.status.replace(/_/g, " ")}
                        </span>
                      </DataTableCell>
                      <DataTableCell>
                        {palette ? (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                              palette.text
                                .replace("text-", "bg-")
                                .replace("-700", "-50"),
                              palette.text
                            )}
                          >
                            {palette.label}
                          </span>
                        ) : a.finalRating ? (
                          <span className="text-sm font-medium text-slate-700">
                            {a.finalRating}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-xs text-slate-500">
                        {a.acknowledgedAt
                          ? new Date(a.acknowledgedAt).toLocaleDateString()
                          : "Pending"}
                      </DataTableCell>
                      <DataTableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/appraisal/cycles/${a.cycleId}/assessment`}
                        >
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function Kpi({
  gradient,
  label,
  value,
  sub,
  subTone,
  progress,
}: {
  gradient: string;
  label: string;
  value: string;
  sub: string;
  subTone?: "emerald" | "amber" | "purple";
  progress?: number;
}) {
  const subClass = subTone
    ? {
        emerald: "text-emerald-600",
        amber: "text-amber-600",
        purple: "text-purple-600",
      }[subTone]
    : "text-slate-400";

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-[3px] bg-gradient-to-r", gradient)} />
      <CardContent className="px-4 py-3.5">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="mt-1.5 text-[26px] font-bold leading-none text-slate-900">
          {value}
        </p>
        {progress !== undefined && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className={cn("mt-1.5 text-[11px]", subClass)}>{sub}</p>
      </CardContent>
    </Card>
  );
}

function CyclePhasesTimeline({ activeIdx }: { activeIdx: number }) {
  const total = PHASES.length;
  const progressPct =
    activeIdx <= 0 ? 0 : (activeIdx / (total - 1)) * 100;

  return (
    <div className="relative pt-5 pb-2">
      {/* Track */}
      <div
        aria-hidden
        className="absolute left-5 right-5 top-[36px] h-[2px] bg-slate-200"
      />
      <div
        aria-hidden
        className="absolute left-5 top-[36px] h-[2px] bg-emerald-500 transition-all"
        style={{ width: `calc(${progressPct}% - ${progressPct === 100 ? 0 : 0}px)` }}
      />

      <ol className="relative grid grid-cols-6 gap-1">
        {PHASES.map((p, idx) => {
          const isDone = idx < activeIdx;
          const isActive = idx === activeIdx;
          return (
            <li
              key={p.key}
              className="flex flex-col items-center gap-2 text-center"
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                  isDone &&
                    "border-emerald-500 bg-emerald-500 text-white",
                  isActive &&
                    "border-indigo-600 bg-white text-indigo-600 ring-[3px] ring-indigo-100",
                  !isDone &&
                    !isActive &&
                    "border-slate-200 bg-white text-slate-400"
                )}
              >
                {isDone ? "✓" : idx + 1}
              </span>
              <span
                className={cn(
                  "max-w-[80px] text-[11px] leading-tight",
                  isActive
                    ? "font-bold text-indigo-600"
                    : isDone
                      ? "font-medium text-slate-600"
                      : "text-slate-400"
                )}
              >
                {p.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AiNudge({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-purple-50/60 to-cyan-50/60 px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-indigo-600">
          <Sparkles className="h-2.5 w-2.5 text-white" />
        </span>
        <span className="text-[11px] font-bold text-slate-800">AI Nudge</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function RatingDistribution({
  dist,
}: {
  dist: { total: number; counts: Record<string, number> };
}) {
  const max = Math.max(...Object.values(dist.counts), 1);
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {RATING_BUCKETS.map((bucket) => {
        const count = dist.counts[bucket] ?? 0;
        const pct = dist.total === 0 ? 0 : Math.round((count / dist.total) * 100);
        const heightPct = max === 0 ? 0 : (count / max) * 100;
        const palette = ratingPaletteByLabel[bucket];
        return (
          <div
            key={bucket}
            className="flex flex-col items-center rounded-lg bg-slate-50 px-2 py-3 text-center"
          >
            <div className="flex h-[60px] items-end justify-center">
              <div
                className={cn(
                  "w-7 rounded-t-md bg-gradient-to-b",
                  palette.bar
                )}
                style={{ height: `${Math.max(4, heightPct)}%` }}
              />
            </div>
            <p className={cn("mt-1.5 text-lg font-bold", palette.text)}>
              {count}
            </p>
            <p className="text-[11px] font-semibold text-slate-600">
              {palette.label}
            </p>
            <p className="text-[10px] text-slate-400">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}

function ActionCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge,
  badgeClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeClass?: string;
}) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:-translate-y-px hover:shadow-md disabled:opacity-90 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          iconBg
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        {badge && (
          <span
            className={cn(
              "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
              badgeClass
            )}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stats helpers
// ─────────────────────────────────────────────────────────────────────────

function computeStats(data: HomeData | null): {
  cycles: number;
  goals: number;
  selfAssessmentsPending: number;
  latestRating: { label: string; cycleName: string | null } | null;
} {
  if (!data) {
    return {
      cycles: 0,
      goals: 0,
      selfAssessmentsPending: 0,
      latestRating: null,
    };
  }
  const selfAssessmentsPending = data.assessments.filter(
    (a) =>
      a.type.toUpperCase().includes("SELF") &&
      a.status !== "COMPLETED" &&
      a.status !== "ACKNOWLEDGED"
  ).length;

  const latestRated = [...data.assessments]
    .filter((a) => a.finalRating || a.ratingLabel)
    .sort((a, b) => {
      const ax = a.acknowledgedAt ? new Date(a.acknowledgedAt).getTime() : 0;
      const bx = b.acknowledgedAt ? new Date(b.acknowledgedAt).getTime() : 0;
      return bx - ax;
    })[0];

  let label: string | null = null;
  if (latestRated) {
    label =
      latestRated.ratingLabel ?? latestRated.finalRating ?? null;
  }

  const cycleName = latestRated
    ? data.cycles.find((c) => c.id === latestRated.cycleId)?.name ?? null
    : null;

  return {
    cycles: data.cycles.length,
    goals: data.goals.length,
    selfAssessmentsPending,
    latestRating: label ? { label, cycleName } : null,
  };
}

function computeRatingDist(data: HomeData | null): {
  total: number;
  counts: Record<string, number>;
} {
  const counts: Record<string, number> = {
    EXCEEDS: 0,
    MEETS_PLUS: 0,
    MEETS: 0,
    BELOW: 0,
    PIP: 0,
  };
  if (!data) return { total: 0, counts };
  let total = 0;
  for (const a of data.assessments) {
    if (!a.ratingLabel) continue;
    const key = a.ratingLabel.toUpperCase();
    if (counts[key] !== undefined) {
      counts[key] += 1;
      total += 1;
    }
  }
  return { total, counts };
}

