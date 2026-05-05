"use client";

import { useEffect, useState } from "react";
import { BookOpen, Clock, CheckCircle2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

interface TrainingModuleItem {
  id: string;
  title: string;
  category: string;
  isDefault: boolean;
  estimatedMinutes: number | null;
  completed: boolean;
  completedAt: string | null;
}

const categoryColors: Record<string, string> = {
  JD_FORMAT: "bg-blue-50 text-blue-700 border-blue-200",
  INTERVIEWING_SKILLS: "bg-purple-50 text-purple-700 border-purple-200",
  FEEDBACK_GUIDELINES: "bg-emerald-50 text-emerald-700 border-emerald-200",
  HIRING_PROCESS: "bg-amber-50 text-amber-700 border-amber-200",
};

const categoryLabels: Record<string, string> = {
  JD_FORMAT: "Job Descriptions",
  INTERVIEWING_SKILLS: "Interviewing",
  FEEDBACK_GUIDELINES: "Feedback",
  HIRING_PROCESS: "Process",
};

export default function TrainingPage() {
  const [modules, setModules] = useState<TrainingModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchModules = async () => {
    try {
      const res = await fetch("/api/training-modules");
      if (res.ok) {
        const data = await res.json();
        setModules(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/training-modules?action=seed", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Seed failed");
      await fetchModules();
      toast.success("Default training modules created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleComplete = async (moduleId: string) => {
    setCompleting(true);
    try {
      const res = await fetch(
        `/api/training-modules?action=complete&moduleId=${moduleId}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to mark complete");
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, completed: true, completedAt: new Date().toISOString() }
            : m
        )
      );
      toast.success("Module completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark complete");
    } finally {
      setCompleting(false);
    }
  };

  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle="Complete these modules to prepare for effective hiring."
        actions={
          modules.length === 0 ? (
            <Button size="sm" onClick={handleSeedDefaults} disabled={seeding}>
              <Sparkles className="h-4 w-4" />
              {seeding ? "Setting up..." : "Set Up Training Modules"}
            </Button>
          ) : null
        }
      />

      {modules.length > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Your Progress
                </p>
                <p className="text-xs text-slate-500">
                  {completedCount} of {totalCount} modules completed
                </p>
              </div>
              <span className="text-2xl font-bold text-indigo-600">
                {progressPercent}%
              </span>
            </div>
            <Progress
              value={completedCount}
              max={totalCount}
              className="mt-3"
            />
          </CardContent>
        </Card>
      )}

      {modules.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No Training Modules"
          description={`Click "Set Up Training Modules" to create default content.`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((mod) => (
            <Card
              key={mod.id}
              className={cn(
                "card-hover cursor-pointer",
                mod.completed && "border-emerald-200 bg-emerald-50/30"
              )}
              onClick={() => !mod.completed && handleComplete(mod.id)}
            >
              <CardContent className="py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", categoryColors[mod.category] ?? "")}
                      >
                        {categoryLabels[mod.category] ?? mod.category}
                      </Badge>
                      {mod.completed && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      {mod.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      {mod.estimatedMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {mod.estimatedMinutes} min
                        </span>
                      )}
                      {mod.completed && mod.completedAt && (
                        <span>
                          Completed{" "}
                          {new Date(mod.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {!mod.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(mod.id);
                      }}
                      disabled={completing}
                    >
                      <Check className="h-3 w-3" />
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
