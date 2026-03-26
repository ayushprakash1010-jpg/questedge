"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const categoryColors: Record<string, string> = {
  TECHNICAL: "bg-blue-50 text-blue-700 border-blue-200",
  LEADERSHIP: "bg-purple-50 text-purple-700 border-purple-200",
  BEHAVIOURAL: "bg-green-50 text-green-700 border-green-200",
  COMMUNICATION: "bg-amber-50 text-amber-700 border-amber-200",
  DOMAIN: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export default function HiringPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [plan, setPlan] = useState<HiringPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [pipelineView, setPipelineView] = useState<"board" | "setup">("board");

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
              <h1 className="text-2xl font-bold text-slate-900">{plan.title}</h1>
              <Badge
                variant="outline"
                className={cn(statusColors[plan.status])}
              >
                {plan.status}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
              <span>Q{plan.quarter} {plan.year}</span>
              <span>{plan.department}</span>
              <span>{formatBudget(plan.budgetMin, plan.budgetMax, plan.currency)}</span>
            </div>
          </div>
          <Link href={`/hiring-plans/${plan.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
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
                        variant="outline"
                        className={cn("mb-3 text-xs", categoryColors[category])}
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
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Feedback
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Coming soon — Interview feedback and scoring
              </p>
            </CardContent>
          </Card>
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
