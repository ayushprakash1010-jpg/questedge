"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Sparkles,
  Check,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { BrandLoader } from "@/components/ui/brand-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { PageHeader } from "@/components/shared/page-header";
import { useProfile } from "@/hooks/use-profile";
import { readResponseError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface TrainingModuleItem {
  id: string;
  title: string;
  category: string;
  isDefault: boolean;
  estimatedMinutes: number | null;
  completed: boolean;
  completedAt: string | null;
  contentMarkdown?: string;
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

function renderMarkdownLines(md: string) {
  return md.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={i} className="text-sm font-semibold text-slate-900 mt-3">
          {trimmed.slice(4)}
        </h4>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={i} className="text-base font-bold text-slate-900 mt-4">
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={i} className="text-lg font-bold text-slate-900 mt-2">
          {trimmed.slice(2)}
        </h2>
      );
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <li key={i} className="ml-5 list-disc text-sm text-slate-700 leading-relaxed">
          {trimmed.slice(2)}
        </li>
      );
    }
    return (
      <p key={i} className="text-sm text-slate-700 leading-relaxed">
        {trimmed}
      </p>
    );
  });
}

export default function TrainingPage() {
  const { profile } = useProfile();
  const canManage = profile?.role === "ADMIN" || profile?.role === "HR";
  const isAdmin = profile?.role === "ADMIN";

  const [modules, setModules] = useState<TrainingModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [readingModule, setReadingModule] = useState<TrainingModuleItem | null>(null);
  const [loadingReader, setLoadingReader] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("INTERVIEWING_SKILLS");
  const [newMinutes, setNewMinutes] = useState("15");
  const [newMarkdown, setNewMarkdown] = useState("");

  const fetchModules = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/training-modules");
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to load training modules"));
      }
      const data = await res.json();
      setModules(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load training modules";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const openModuleReader = async (mod: TrainingModuleItem) => {
    setReadingModule(mod);
    setLoadingReader(true);
    try {
      const res = await fetch(`/api/training-modules/${mod.id}`);
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to load module content"));
      }
      const detail = await res.json();
      setReadingModule((prev) => (prev ? { ...prev, ...detail } : detail));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load module content");
    } finally {
      setLoadingReader(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/training-modules?action=seed", {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readResponseError(res, "Seed failed"));
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
      if (!res.ok) throw new Error(await readResponseError(res, "Failed to mark complete"));
      const nowIso = new Date().toISOString();
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, completed: true, completedAt: nowIso } : m
        )
      );
      setReadingModule((prev) =>
        prev && prev.id === moduleId ? { ...prev, completed: true, completedAt: nowIso } : prev
      );
      toast.success("Module marked completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark complete");
    } finally {
      setCompleting(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMarkdown.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/training-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          estimatedMinutes: parseInt(newMinutes, 10) || 15,
          contentMarkdown: newMarkdown.trim(),
        }),
      });
      if (!res.ok) throw new Error(await readResponseError(res, "Failed to create module"));
      toast.success("Training module created");
      setCreateOpen(false);
      setNewTitle("");
      setNewMarkdown("");
      await fetchModules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create module");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      const res = await fetch(`/api/training-modules/${moduleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readResponseError(res, "Failed to delete module"));
      toast.success("Module deleted");
      if (readingModule?.id === moduleId) setReadingModule(null);
      await fetchModules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete module");
    }
  };

  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return <BrandLoader fullscreen={false} message="Loading training modules..." />;
  }

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle="Read interviewer guidelines and track module completion."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              {modules.length === 0 && (
                <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
                  <Sparkles className="h-4 w-4" />
                  {seeding ? "Setting up..." : "Set Up Default Modules"}
                </Button>
              )}
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New Module
              </Button>
            </div>
          ) : null
        }
      />

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={fetchModules}>
            Retry
          </Button>
        </div>
      )}

      {modules.length > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Your Progress</p>
                <p className="text-xs text-slate-500">
                  {completedCount} of {totalCount} modules completed
                </p>
              </div>
              <span className="text-2xl font-bold text-indigo-600">
                {progressPercent}%
              </span>
            </div>
            <Progress value={completedCount} max={totalCount} className="mt-3" />
          </CardContent>
        </Card>
      )}

      {modules.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No Training Modules"
          description={
            canManage
              ? `Create a module or seed the default curriculum for your hiring team.`
              : "Your organization hasn't published training modules yet."
          }
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
              onClick={() => openModuleReader(mod)}
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
                          Completed {new Date(mod.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => openModuleReader(mod)}>
                      <BookOpen className="h-3 w-3" />
                      Read
                    </Button>
                    {isAdmin && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDeleteModule(mod.id)}
                        title="Delete module"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reader Modal */}
      {readingModule && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <Badge
                  variant="outline"
                  className={cn("text-xs mb-1", categoryColors[readingModule.category] ?? "")}
                >
                  {categoryLabels[readingModule.category] ?? readingModule.category}
                </Badge>
                <h2 className="text-lg font-semibold text-slate-900">{readingModule.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setReadingModule(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close reader"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1">
              {loadingReader ? (
                <BrandLoader fullscreen={false} message="Loading module content..." />
              ) : readingModule.contentMarkdown ? (
                renderMarkdownLines(readingModule.contentMarkdown)
              ) : (
                <p className="text-sm text-slate-500">No content available for this module.</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
              <span className="text-xs text-slate-500">
                {readingModule.completed ? "Completed" : "Finish reading and mark completed"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setReadingModule(null)}>
                  Close
                </Button>
                {!readingModule.completed && (
                  <Button
                    size="sm"
                    onClick={() => handleComplete(readingModule.id)}
                    disabled={completing}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {completing ? "Saving..." : "Mark Completed"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Module Modal (Admin / HR) */}
      {createOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Training Module</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateModule} className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Structured Behavioral Interviewing"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    <option value="JD_FORMAT">Job Descriptions</option>
                    <option value="INTERVIEWING_SKILLS">Interviewing</option>
                    <option value="FEEDBACK_GUIDELINES">Feedback</option>
                    <option value="HIRING_PROCESS">Process</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Minutes</label>
                  <Input
                    type="number"
                    min={1}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content (Markdown) *</label>
                <Textarea
                  required
                  rows={7}
                  value={newMarkdown}
                  onChange={(e) => setNewMarkdown(e.target.value)}
                  placeholder="# Module Heading&#10;&#10;- Key evaluation principles..."
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || !newTitle.trim() || !newMarkdown.trim()}>
                  {creating ? "Creating..." : "Create Module"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
