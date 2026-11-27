"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { toast } from "@/components/ui/toaster";

type CycleType = "ANNUAL" | "MID_YEAR" | "PROBATION" | "SPECIAL";

interface ScaleItem {
  value: number;
  label: string;
}

const DEFAULT_SCALE: ScaleItem[] = [
  { value: 1, label: "Needs Improvement" },
  { value: 2, label: "Developing" },
  { value: 3, label: "Meets Expectations" },
  { value: 4, label: "Exceeds Expectations" },
  { value: 5, label: "Exceptional" },
];

function toInputDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function NewAppraisalCyclePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<CycleType>("ANNUAL");
  const [startDate, setStartDate] = useState(() => toInputDate(0));
  const [endDate, setEndDate] = useState(() => toInputDate(90));
  const [goalSettingDeadline, setGoalSettingDeadline] = useState(() => toInputDate(21));
  const [selfAssessmentDeadline, setSelfAssessmentDeadline] = useState(() => toInputDate(45));
  const [managerReviewDeadline, setManagerReviewDeadline] = useState(() => toInputDate(65));
  const [calibrationDeadline, setCalibrationDeadline] = useState(() => toInputDate(80));
  const [ratingScale, setRatingScale] = useState<ScaleItem[]>(DEFAULT_SCALE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateScaleLabel(idx: number, label: string) {
    setRatingScale((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, label } : item))
    );
  }

  function addScaleLevel() {
    setRatingScale((prev) => [
      ...prev,
      { value: prev.length + 1, label: `Level ${prev.length + 1}` },
    ]);
  }

  function removeScaleLevel(idx: number) {
    if (ratingScale.length <= 2) return;
    setRatingScale((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((item, i) => ({ ...item, value: i + 1 }))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Cycle name must be at least 2 characters.");
      return;
    }
    if (
      !startDate ||
      !endDate ||
      !goalSettingDeadline ||
      !selfAssessmentDeadline ||
      !managerReviewDeadline ||
      !calibrationDeadline
    ) {
      setError("Please fill in all cycle and milestone dates.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be after the start date.");
      return;
    }
    if (ratingScale.some((s) => !s.label.trim())) {
      setError("Every rating scale level must have a label.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v2/appraisal/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          goalSettingDeadline: new Date(goalSettingDeadline).toISOString(),
          selfAssessmentDeadline: new Date(selfAssessmentDeadline).toISOString(),
          managerReviewDeadline: new Date(managerReviewDeadline).toISOString(),
          calibrationDeadline: new Date(calibrationDeadline).toISOString(),
          ratingScale: ratingScale.map((s) => ({
            value: s.value,
            label: s.label.trim(),
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message || "Failed to create appraisal cycle";
        throw new Error(msg);
      }

      toast.success("Appraisal cycle created");
      router.push(body?.id ? `/admin/appraisal/cycles/${body.id}` : "/admin/appraisal/cycles");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create cycle";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Appraisals"
        title="Start New Appraisal Cycle"
        subtitle="Define the review period, stage deadlines, and competency rating scale."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/appraisal">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Back to Appraisals
              </Button>
            </Link>
            <Link href="/admin/appraisal/cycles">
              <Button variant="outline" size="sm">
                All Cycles
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <Card className="mb-6 border-rose-200 bg-rose-50/50">
          <CardContent className="py-3 text-sm text-rose-700">{error}</CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cycle Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cycle-name">Cycle Name</Label>
              <Input
                id="cycle-name"
                placeholder="e.g. FY26 Annual Performance Review"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cycle-type">Cycle Type</Label>
              <Select
                id="cycle-type"
                value={type}
                onChange={(e) => setType(e.target.value as CycleType)}
              >
                <option value="ANNUAL">Annual</option>
                <option value="MID_YEAR">Mid-Year</option>
                <option value="PROBATION">Probation</option>
                <option value="SPECIAL">Special</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Stage Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-deadline">Goal Setting Deadline</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={goalSettingDeadline}
                onChange={(e) => setGoalSettingDeadline(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="self-deadline">Self-Assessment Deadline</Label>
              <Input
                id="self-deadline"
                type="date"
                value={selfAssessmentDeadline}
                onChange={(e) => setSelfAssessmentDeadline(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manager-deadline">Manager Review Deadline</Label>
              <Input
                id="manager-deadline"
                type="date"
                value={managerReviewDeadline}
                onChange={(e) => setManagerReviewDeadline(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calibration-deadline">Calibration Deadline</Label>
              <Input
                id="calibration-deadline"
                type="date"
                value={calibrationDeadline}
                onChange={(e) => setCalibrationDeadline(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Rating Scale</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addScaleLevel}>
              <Plus className="h-3.5 w-3.5" />
              Add Level
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {ratingScale.map((item, idx) => (
              <div key={item.value} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                  {item.value}
                </span>
                <Input
                  value={item.label}
                  onChange={(e) => updateScaleLabel(idx, e.target.value)}
                  placeholder={`Label for rating ${item.value}`}
                  required
                />
                {ratingScale.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScaleLevel(idx)}
                    aria-label={`Remove rating ${item.value}`}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/appraisal/cycles">
            <Button type="button" variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating Cycle..." : "Create Appraisal Cycle"}
          </Button>
        </div>
      </form>
    </div>
  );
}
