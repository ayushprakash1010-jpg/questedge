"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge, type PlanStatus } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

// Master-detail right pane for /hiring-plans (see design-system-v2/ui-kit
// 02-HiringPlans.html). Shows a quick Overview tab inline; JD / Pipeline /
// Feedback tabs deep-link into the full /hiring-plans/[id] route.

interface PlanSkill {
  id: string;
  priority: string;
  minProficiency: number;
  skill: { id: string; name: string; category: string };
}

interface PlanDetail {
  id: string;
  title: string;
  industry: string;
  department: string;
  designation: string;
  quarter: number;
  year: number;
  status: string;
  totalRoles: number;
  filledRoles: number;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  benefits: string[];
  hiringManager: { id: string; name: string; email: string } | null;
  reportingManagerName: string | null;
  hodName: string | null;
  teamSize: number | null;
  skills: PlanSkill[];
}

const PLAN_STATUSES: PlanStatus[] = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
const isPlanStatus = (s: string): s is PlanStatus =>
  (PLAN_STATUSES as readonly string[]).includes(s);

// Mirror skill category palette from design-system-v2/CLAUDE.md §4
const skillCategoryClass: Record<string, string> = {
  TECHNICAL: "bg-blue-50 text-blue-700 border-blue-200",
  LEADERSHIP: "bg-purple-50 text-purple-700 border-purple-200",
  BEHAVIOURAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMMUNICATION: "bg-yellow-50 text-yellow-700 border-yellow-200",
  DOMAIN: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

interface StatusAction {
  label: string;
  status: PlanStatus;
  icon: LucideIcon;
  variant: "default" | "outline" | "destructive";
}

const statusActions: Record<string, StatusAction[]> = {
  DRAFT: [
    { label: "Activate", status: "ACTIVE", icon: Play, variant: "default" },
    { label: "Cancel", status: "CANCELLED", icon: XCircle, variant: "destructive" },
  ],
  ACTIVE: [
    { label: "Mark Completed", status: "COMPLETED", icon: CheckCircle2, variant: "outline" },
    { label: "Cancel", status: "CANCELLED", icon: XCircle, variant: "destructive" },
  ],
  COMPLETED: [
    { label: "Reopen", status: "ACTIVE", icon: RotateCcw, variant: "outline" },
  ],
  CANCELLED: [
    { label: "Reopen as Draft", status: "DRAFT", icon: RotateCcw, variant: "outline" },
  ],
};

type PanelTab = "overview" | "jd" | "pipeline" | "feedback";

const tabs: { value: PanelTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "jd", label: "Job Description" },
  { value: "pipeline", label: "Pipeline" },
  { value: "feedback", label: "Feedback" },
];

function formatBudget(min: string, max: string, currency: string) {
  const fmt = (n: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(n));
  return `${fmt(min)} – ${fmt(max)}`;
}

export interface PlanDetailPanelProps {
  planId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export function PlanDetailPanel({ planId, onClose, onUpdated }: PlanDetailPanelProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PanelTab>("overview");
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTab("overview");
    fetch(`/api/hiring-plans/${planId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch(() => {
        if (!cancelled) setPlan(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const handleStatusChange = async (newStatus: PlanStatus) => {
    if (!plan) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/hiring-plans/${plan.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      const updated = (await res.json()) as PlanDetail;
      setPlan(updated);
      toast.success(`Status changed to ${newStatus}`);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleTabChange = (next: PanelTab) => {
    if (next === "overview") {
      setTab(next);
      return;
    }
    // Drill into full detail page for tabs that need more space.
    router.push(`/hiring-plans/${planId}?tab=${next}`);
  };

  const skillsByCategory = (plan?.skills ?? []).reduce(
    (acc, s) => {
      const cat = s.skill.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {} as Record<string, PlanSkill[]>
  );

  return (
    <aside className="flex w-full max-w-md shrink-0 flex-col border-l border-slate-200 bg-white lg:w-[400px]">
      {loading || !plan ? (
        <div className="flex flex-1 items-center justify-center">
          {loading ? (
            <Spinner />
          ) : (
            <p className="text-sm text-slate-500">Plan not found</p>
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={onClose}
                className="-ml-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to plans
              </button>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 className="mt-2 text-[17px] font-bold leading-tight text-slate-900">
              {plan.title}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isPlanStatus(plan.status) ? (
                <StatusBadge status={plan.status} />
              ) : (
                <Badge variant="outline">{plan.status}</Badge>
              )}
              <span className="text-xs text-slate-400">
                Q{plan.quarter} {plan.year} · {plan.department}
              </span>
            </div>

            {/* Role progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Role progress</span>
                <span className="font-semibold text-slate-900">
                  {plan.filledRoles}/{plan.totalRoles}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                  style={{
                    width: `${
                      plan.totalRoles > 0
                        ? Math.min(100, (plan.filledRoles / plan.totalRoles) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTabChange(t.value)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    tab === t.value
                      ? "bg-white text-slate-900 shadow-[var(--shadow-xs)]"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Basic Info */}
            <Section label="Basic Info">
              <InfoGrid>
                <InfoItem label="Designation" value={plan.designation} />
                <InfoItem label="Industry" value={plan.industry} />
                <InfoItem
                  label="Hiring Manager"
                  value={plan.hiringManager?.name}
                />
                <InfoItem label="HOD" value={plan.hodName} />
                <InfoItem label="Reporting To" value={plan.reportingManagerName} />
                <InfoItem
                  label="Team Size"
                  value={plan.teamSize ? `${plan.teamSize} people` : null}
                />
              </InfoGrid>
            </Section>

            {/* Compensation */}
            <Section label="Compensation">
              <InfoGrid>
                <InfoItem
                  label="Budget Range"
                  value={formatBudget(plan.budgetMin, plan.budgetMax, plan.currency)}
                />
                <InfoItem label="Currency" value={plan.currency} />
              </InfoGrid>
              {plan.benefits && plan.benefits.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-400">Benefits</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {plan.benefits.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Skills */}
            {plan.skills.length > 0 && (
              <Section label="Required Skills">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(skillsByCategory).flatMap(([cat, skills]) =>
                    skills.map((s) => (
                      <span
                        key={s.id}
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          skillCategoryClass[cat] ?? "bg-slate-50 text-slate-700 border-slate-200"
                        )}
                      >
                        {s.skill.name}
                        <span className="ml-1 opacity-60">
                          {s.priority === "MUST_HAVE" ? "· Must" : "· Nice"}
                        </span>
                      </span>
                    ))
                  )}
                </div>
              </Section>
            )}

            {/* Status actions */}
            {(statusActions[plan.status] || []).length > 0 && (
              <Section label="Status Actions">
                <div className="flex flex-wrap gap-2">
                  {statusActions[plan.status].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.status}
                        variant={action.variant}
                        size="sm"
                        disabled={statusUpdating}
                        onClick={() => handleStatusChange(action.status)}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 border-t border-slate-200 px-6 py-4">
            <Button
              variant="ai"
              size="sm"
              className="flex-1"
              onClick={() => router.push(`/hiring-plans/${plan.id}?tab=jd`)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Open JD Editor
            </Button>
            <Link href={`/hiring-plans/${plan.id}/edit`} className="contents">
              <Button variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value || "—"}</p>
    </div>
  );
}
