"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge, type BadgeProps, type PlanStatus } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/shared/data-table";
import {
  ArrowLeft,
  Pencil,
  Briefcase,
  Users,
  DollarSign,
  Target,
  FileText,
  Kanban,
  MessageSquare,
  BarChart3,
  Award,
  Mail,
  Check,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JdTab } from "@/components/hiring-plans/jd-tab";
import { PipelineSetup } from "@/components/hiring-plans/pipeline-setup";
import { KanbanBoard } from "@/components/hiring-plans/kanban-board";
import { CandidateSheet } from "@/components/hiring-plans/candidate-sheet";

interface Skill {
  id: string;
  skill: { id: string; name: string; category: string };
  priority: string;
  minProficiency: number;
}

interface HiringPlan {
  id: string;
  title: string;
  industry: string;
  department: string;
  quarter: number;
  year: number;
  totalRoles: number;
  filledRoles: number;
  status: string;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  benefits: string[];
  designation: string;
  reportingManagerName: string;
  hodName: string;
  teamSize: number | null;
  teamLevels: string | null;
  notes: string | null;
  hiringManager: { id: string; name: string; email: string };
  createdBy: { id: string; name: string };
  organization: { id: string; name: string };
  skills: Skill[];
  createdAt: string;
  updatedAt: string;
}

const PLAN_STATUSES: ReadonlyArray<PlanStatus> = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"];
const isPlanStatus = (s: string): s is PlanStatus =>
  (PLAN_STATUSES as readonly string[]).includes(s);

const categoryToVariant: Record<string, BadgeProps["variant"]> = {
  TECHNICAL: "skillTechnical",
  LEADERSHIP: "skillLeadership",
  BEHAVIOURAL: "skillBehavioural",
  COMMUNICATION: "skillCommunication",
  DOMAIN: "skillDomain",
};

export default function HiringPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [plan, setPlan] = useState<HiringPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [pipelineView, setPipelineView] = useState<"board" | "setup">("board");
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/hiring-plans/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPlan(data);
        }
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Hiring plan not found</p>
        <Link href="/hiring-plans" className="mt-2 text-sm text-indigo-600 hover:underline">
          Back to plans
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!plan) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/hiring-plans/${plan.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      const updated = await res.json();
      setPlan(updated);
      toast.success(`Status changed to ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Status transition actions available for current status
  const statusActions: Record<string, { label: string; status: string; icon: typeof Play; variant: "default" | "outline" | "destructive" }[]> = {
    DRAFT: [
      { label: "Activate", status: "ACTIVE", icon: Play, variant: "default" },
      { label: "Cancel", status: "CANCELLED", icon: XCircle, variant: "destructive" },
    ],
    ACTIVE: [
      { label: "Mark Completed", status: "COMPLETED", icon: CheckCircle2, variant: "default" },
      { label: "Cancel", status: "CANCELLED", icon: XCircle, variant: "destructive" },
    ],
    COMPLETED: [
      { label: "Reopen", status: "ACTIVE", icon: RotateCcw, variant: "outline" },
    ],
    CANCELLED: [
      { label: "Reopen as Draft", status: "DRAFT", icon: RotateCcw, variant: "outline" },
    ],
  };

  const formatBudget = (min: string, max: string, currency: string) => {
    const fmt = (n: string) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(n));
    return `${fmt(min)} - ${fmt(max)}`;
  };

  // Group skills by category
  const skillsByCategory = plan.skills.reduce(
    (acc, s) => {
      const cat = s.skill.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/hiring-plans")}
          className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hiring Plans
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {plan.title}
              </h1>
              {isPlanStatus(plan.status) ? (
                <StatusBadge status={plan.status} />
              ) : (
                <Badge variant="outline">{plan.status}</Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
              <span>Q{plan.quarter} {plan.year}</span>
              <span>{plan.department}</span>
              <span>{formatBudget(plan.budgetMin, plan.budgetMax, plan.currency)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(statusActions[plan.status] || []).map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange(action.status)}
                >
                  <Icon className="mr-1.5 h-4 w-4" />
                  {action.label}
                </Button>
              );
            })}
            <Link href={`/hiring-plans/${plan.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jd">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Job Description
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <Kanban className="mr-1.5 h-3.5 w-3.5" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="decisions">
            <Award className="mr-1.5 h-3.5 w-3.5" />
            Decisions
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Basic Info */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Industry" value={plan.industry} />
                <DetailField label="Department" value={plan.department} />
                <DetailField label="Designation" value={plan.designation} />
                <DetailField label="Period" value={`Q${plan.quarter} ${plan.year}`} />
                <DetailField label="Organization" value={plan.organization?.name} />
                <DetailField
                  label="Created"
                  value={new Date(plan.createdAt).toLocaleDateString()}
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Structure */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-cyan-600" />
                Team Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500">Roles Progress</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-lg font-semibold text-slate-900">
                      {plan.filledRoles}/{plan.totalRoles}
                    </span>
                    <Progress
                      value={plan.filledRoles}
                      max={plan.totalRoles}
                      className="w-24"
                    />
                  </div>
                </div>
                <DetailField label="Hiring Manager" value={plan.hiringManager?.name} />
                <DetailField label="Reporting Manager" value={plan.reportingManagerName} />
                <DetailField label="HOD" value={plan.hodName} />
                <DetailField label="Team Size" value={plan.teamSize ? String(plan.teamSize) : "N/A"} />
                <DetailField label="Team Levels" value={plan.teamLevels || "N/A"} />
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-amber-600" />
                Compensation & Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label="Budget Range"
                  value={formatBudget(plan.budgetMin, plan.budgetMax, plan.currency)}
                />
                <DetailField label="Currency" value={plan.currency} />
              </div>
              {plan.benefits && (plan.benefits as string[]).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Benefits</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(plan.benefits as string[]).map((b) => (
                      <Badge key={b} variant="secondary">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {plan.notes && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{plan.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-green-600" />
                Required Skills ({plan.skills.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plan.skills.length === 0 ? (
                <p className="text-sm text-slate-400">No skills specified</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(skillsByCategory).map(([category, skills]) => (
                    <div key={category}>
                      <Badge
                        variant={categoryToVariant[category] ?? "outline"}
                        className="mb-3"
                      >
                        {category}
                      </Badge>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {skills.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {s.skill.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {s.priority === "MUST_HAVE" ? "Must Have" : "Nice to Have"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    i < s.minProficiency
                                      ? "bg-indigo-600"
                                      : "bg-slate-200"
                                  )}
                                />
                              ))}
                              <span className="ml-1 text-xs text-slate-500">
                                {s.minProficiency}/5
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* JD Tab */}
        <TabsContent value="jd">
          <JdTab planId={plan.id} />
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="space-y-4">
            {/* Sub-nav: Board / Setup */}
            <div className="flex gap-2">
              <button
                onClick={() => setPipelineView("board")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pipelineView === "board"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Kanban className="mr-1.5 inline h-3.5 w-3.5" />
                Board
              </button>
              <button
                onClick={() => setPipelineView("setup")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pipelineView === "setup"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Setup
              </button>
            </div>

            {pipelineView === "board" ? (
              <KanbanBoard
                planId={plan.id}
                onCandidateClick={(appId) => setSelectedAppId(appId)}
              />
            ) : (
              <PipelineSetup planId={plan.id} />
            )}
          </div>

          {/* Candidate Detail Sheet */}
          {selectedAppId && (
            <CandidateSheet
              applicationId={selectedAppId}
              planId={plan.id}
              onClose={() => setSelectedAppId(null)}
              onUpdated={() => {
                // The board will refetch on its own when tab is re-rendered
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="feedback">
          <Card className="border-slate-200">
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center">
                <MessageSquare className="h-10 w-10 text-indigo-300" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  Interview Feedback
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Select a candidate from the Pipeline tab to view or submit feedback.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Feedback can be submitted per-candidate via the candidate detail sheet.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <DecisionsTab planId={plan.id} filledRoles={plan.filledRoles} totalRoles={plan.totalRoles} />
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Analytics
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Coming soon — Hiring analytics and insights
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || "N/A"}</p>
    </div>
  );
}

interface DecisionRow {
  id: string;
  decision: string;
  createdAt: string;
  offerCtc: string | null;
  communicationSent: boolean;
  communicationDraft: string | null;
  application?: { candidate?: { name?: string } };
  decidedBy?: { name?: string };
}

function DecisionsTab({
  planId,
  filledRoles,
  totalRoles,
}: {
  planId: string;
  filledRoles: number;
  totalRoles: number;
}) {
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(`/api/hiring-plans/${planId}/decisions`);
        if (res.ok) {
          const data = await res.json();
          setDecisions(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [planId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Roles Filled</p>
              <p className="text-xs text-slate-500">
                {filledRoles} of {totalRoles} roles filled
              </p>
            </div>
            <span className="text-2xl font-bold text-indigo-600">
              {filledRoles}/{totalRoles}
            </span>
          </div>
          <Progress value={filledRoles} max={totalRoles} className="mt-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-indigo-600" />
            Decisions ({decisions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {decisions.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<Award className="h-6 w-6" />}
                title="No decisions made yet"
                description="Decisions will appear here as candidates progress through the pipeline."
              />
            </div>
          ) : (
            <DataTable className="rounded-none border-0 shadow-none">
              <DataTableHeader>
                <tr>
                  <DataTableHead>Candidate</DataTableHead>
                  <DataTableHead>Decision</DataTableHead>
                  <DataTableHead>By</DataTableHead>
                  <DataTableHead>Date</DataTableHead>
                  <DataTableHead>Offer CTC</DataTableHead>
                  <DataTableHead>Communication</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {decisions.map((d) => (
                  <DataTableRow key={d.id}>
                    <DataTableCell className="font-medium text-slate-900">
                      {d.application?.candidate?.name ?? "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge
                        variant={
                          d.decision === "SELECTED" ? "success" : "destructive"
                        }
                      >
                        {d.decision}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>{d.decidedBy?.name ?? "—"}</DataTableCell>
                    <DataTableCell>
                      {new Date(d.createdAt).toLocaleDateString()}
                    </DataTableCell>
                    <DataTableCell>
                      {d.offerCtc
                        ? `₹${Number(d.offerCtc).toLocaleString()}`
                        : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      {d.communicationSent ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Check className="h-3 w-3" /> Sent
                        </span>
                      ) : d.communicationDraft ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Mail className="h-3 w-3" /> Draft
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
