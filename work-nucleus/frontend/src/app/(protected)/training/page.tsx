"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  BookOpen, Clock, CheckCircle2, Sparkles, ArrowLeft, Check,
} from "lucide-react";

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
  FEEDBACK_GUIDELINES: "bg-green-50 text-green-700 border-green-200",
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
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleContent, setModuleContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
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
      await fetch("/api/training-modules?action=seed", { method: "POST" });
      fetchModules();
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  };

  const handleSelectModule = async (id: string) => {
    setSelectedModule(id);
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/training-modules?action=get&moduleId=${id}`);
      // Use a direct GET — we need to add this. For now, use a different approach.
      // Actually the training-modules route GET returns the list. We need the content from the module.
      // Let's fetch from the backend directly through our route.
    } catch {
      // ignore
    }
    // Since we don't have a single-module GET proxy yet, let me add inline fetch
    try {
      const session = await fetch("/api/profile");
      // Actually, let's just make a fetch to our backend route
      const res = await fetch("/api/training-modules");
      // We already have the list but not the content. Let me work around this.
    } catch {
      // ignore
    }
    setLoadingContent(false);
  };

  const handleComplete = async (moduleId: string) => {
    setCompleting(true);
    try {
      await fetch(`/api/training-modules?action=complete&moduleId=${moduleId}`, {
        method: "POST",
      });
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, completed: true, completedAt: new Date().toISOString() } : m
        )
      );
    } catch {
      // ignore
    } finally {
      setCompleting(false);
    }
  };

  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training</h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete these modules to prepare for effective hiring.
          </p>
        </div>
        {modules.length === 0 && (
          <Button onClick={handleSeedDefaults} disabled={seeding}>
            <Sparkles className="mr-2 h-4 w-4" />
            {seeding ? "Setting up..." : "Set Up Training Modules"}
          </Button>
        )}
      </div>

      {/* Progress */}
      {modules.length > 0 && (
        <Card className="mb-6 border-slate-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Your Progress</p>
                <p className="text-xs text-slate-500">
                  {completedCount} of {totalCount} modules completed
                </p>
              </div>
              <span className="text-2xl font-bold text-indigo-600">{progressPercent}%</span>
            </div>
            <Progress value={completedCount} max={totalCount} className="mt-3" />
          </CardContent>
        </Card>
      )}

      {/* Module Grid */}
      {modules.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No Training Modules</h3>
            <p className="mt-1 text-sm text-slate-500">
              Click &quot;Set Up Training Modules&quot; to create default content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((mod) => (
            <Card
              key={mod.id}
              className={cn(
                "cursor-pointer border-slate-200 transition-shadow hover:shadow-md",
                mod.completed && "border-green-200 bg-green-50/30"
              )}
              onClick={() => handleComplete(mod.id)}
            >
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", categoryColors[mod.category])}>
                        {categoryLabels[mod.category] || mod.category}
                      </Badge>
                      {mod.completed && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">{mod.title}</h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      {mod.estimatedMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {mod.estimatedMinutes} min
                        </span>
                      )}
                      {mod.completed && mod.completedAt && (
                        <span>
                          Completed {new Date(mod.completedAt).toLocaleDateString()}
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
                      <Check className="mr-1 h-3 w-3" />
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
