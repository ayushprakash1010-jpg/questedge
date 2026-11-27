"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, ClipboardCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLoader } from "@/components/ui/brand-loader";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const STAGES = [
  "DRAFT",
  "GOAL_SETTING",
  "SELF_ASSESSMENT",
  "MANAGER_REVIEW",
  "PEER_FEEDBACK",
  "CALIBRATION",
  "COMMUNICATED",
  "CLOSED",
] as const;

interface CycleDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  goalSettingDeadline: string;
  selfAssessmentDeadline: string;
  managerReviewDeadline: string;
  calibrationDeadline: string;
  ratingScale?: Array<{ value: number; label: string }>;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function AdminAppraisalCycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCycle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v2/appraisal/cycles/${cycleId}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Appraisal cycle could not be loaded");
      }
      setCycle(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cycle");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  async function advanceStage() {
    if (!cycle) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/appraisal/cycles/${cycle.id}/advance`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Advance failed");
      }
      toast.success(`Advanced cycle to ${body?.status || "next stage"}`);
      setCycle(body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to advance stage");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <BrandLoader fullscreen={false} message="Loading appraisal cycle..." />;
  }

  if (error || !cycle) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="border-rose-200 bg-rose-50/40">
          <CardHeader>
            <CardTitle className="text-rose-900">Cycle Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-rose-700">{error || "Cycle not found."}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadCycle}>
                Retry
              </Button>
              <Link href="/admin/appraisal/cycles">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Cycles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStageIndex = STAGES.indexOf(cycle.status as (typeof STAGES)[number]);
  const scale = Array.isArray(cycle.ratingScale) ? cycle.ratingScale : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Appraisal Administration"
        title={cycle.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Badge variant="outline">{cycle.type}</Badge>
            <Badge>{cycle.status}</Badge>
            <span>
              {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
            </span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/appraisal/cycles">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Cycles
              </Button>
            </Link>
            <Link href={`/appraisal/cycles/${cycle.id}/assessment`}>
              <Button variant="outline" size="sm">
                <ClipboardCheck className="h-4 w-4" />
                Self-Assessment
              </Button>
            </Link>
            <Link href="/appraisal">
              <Button variant="outline" size="sm">
                <Scale className="h-4 w-4" />
                Appraisal Hub
              </Button>
            </Link>
            {cycle.status !== "CLOSED" && (
              <Button size="sm" disabled={busy} onClick={advanceStage}>
                {busy ? "Advancing..." : "Advance Stage"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Stage Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {STAGES.map((stage, idx) => {
              const completed = currentStageIndex > idx;
              const active = currentStageIndex === idx;
              return (
                <div
                  key={stage}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : completed
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{stage.replace(/_/g, " ")}</span>
                    {completed && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Deadlines & Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 text-sm">
            {[
              ["Cycle Start", cycle.startDate],
              ["Goal Setting Deadline", cycle.goalSettingDeadline],
              ["Self-Assessment Deadline", cycle.selfAssessmentDeadline],
              ["Manager Review Deadline", cycle.managerReviewDeadline],
              ["Calibration Deadline", cycle.calibrationDeadline],
              ["Cycle End", cycle.endDate],
            ].map(([label, date]) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-slate-900">{formatDate(date)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configured Rating Scale</CardTitle>
          </CardHeader>
          <CardContent>
            {scale.length === 0 ? (
              <p className="text-sm text-slate-500">Default scale configured.</p>
            ) : (
              <div className="space-y-2">
                {scale.map((item) => (
                  <div
                    key={item.value}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-indigo-600">{item.value}</span>
                    <span className="text-slate-700">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
