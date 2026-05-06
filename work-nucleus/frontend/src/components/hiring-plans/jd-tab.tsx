"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Pencil,
  Check,
  X,
  ChevronDown,
  Shield,
  Clock,
  Globe,
  Link2,
  ExternalLink,
  Wand2,
  Search,
  Send,
} from "lucide-react";

// JD editor surface — design-system-v2/ui-kit/06-JD-Editor.html.
// Two-column layout: structured content cards on the left, sticky 320 px
// right panel with three tabs (AI Assistant / Metadata / Quality).

interface JdData {
  id: string;
  version: number;
  status: string;
  generatedByAi: boolean;
  content: {
    title: string;
    summary: string;
    responsibilities: string[];
    qualifications: { required: string[]; preferred: string[] };
    aboutCompany: string;
    workMode: string;
  };
  fitmentMapping: {
    role: string;
    designation: string;
    ctcRange: { min: number; max: number; currency: string };
    reportingTo: string;
    hod: string;
    teamSize: number | null;
    teamLevels: string | null;
    industry: string;
  };
  evaluationParameters: {
    technicalSkills: {
      name: string;
      proficiencyExpected: number;
      assessmentCriteria: string;
    }[];
    leadershipSkills: { name: string; indicators: string[] }[];
    behaviouralSkills: { name: string; assessmentCriteria: string }[];
  };
  createdBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PUBLISHED: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function JdTab({ planId }: { planId: string }) {
  const [jd, setJd] = useState<JdData | null>(null);
  const [versions, setVersions] = useState<JdData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState<JdData["content"] | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchJd = useCallback(async () => {
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/jd`);
      if (res.ok) {
        const data = await res.json();
        setJd(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [planId]);

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/jd?versions=true`);
      if (res.ok) {
        const data = await res.json();
        setVersions(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchJd();
  }, [fetchJd]);

  const handleGenerate = async (extraHint?: string) => {
    setGenerating(true);
    try {
      const ctxParts = [additionalContext, extraHint].filter(Boolean);
      const res = await fetch(`/api/hiring-plans/${planId}/jd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalContext: ctxParts.length > 0 ? ctxParts.join(" — ") : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setJd(data);
        setAdditionalContext("");
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!jd || !editContent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/jd`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdId: jd.id, content: editContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setJd(data);
        setEditing(false);
        setEditContent(null);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!jd) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/jd`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdId: jd.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setJd(data);
      }
    } catch {
      // ignore
    } finally {
      setApproving(false);
    }
  };

  const handlePublish = async () => {
    if (!jd) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "LINKEDIN" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPublicUrl(data.publicUrl);
        setJd((prev) => (prev ? { ...prev, status: "PUBLISHED" } : prev));
      }
    } catch {
      // ignore
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (jd?.status === "PUBLISHED") {
      fetch(`/api/hiring-plans/${planId}/publish`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPublicUrl(data[0].publicUrl);
          }
        })
        .catch(() => {});
    }
  }, [jd?.status, planId]);

  const startEdit = () => {
    if (!jd) return;
    setEditContent(JSON.parse(JSON.stringify(jd.content)));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditContent(null);
  };

  const selectVersion = (v: JdData) => {
    setJd(v);
    setShowVersions(false);
    setEditing(false);
    setEditContent(null);
  };

  // ─── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  // ─── Generating ─────────────────────────────────────────────────────
  if (generating) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            AI is crafting your job description…
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Powered by Claude AI. This may take a moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── No JD yet — empty/generate state ───────────────────────────────
  if (!jd) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-4 shadow-sm">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            Generate Job Description with AI
          </h3>
          <p className="mt-2 max-w-md text-center text-sm text-slate-500">
            Let Claude AI generate a professional job description based on your hiring plan.
          </p>
          <div className="mt-6 w-full max-w-md space-y-3">
            <Textarea
              placeholder="Optional: extra context (e.g., 'emphasize remote work culture')…"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[80px]"
            />
            <Button onClick={() => handleGenerate()} variant="ai" className="w-full">
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = editing && editContent ? editContent : jd.content;
  const fitment = jd.fitmentMapping;
  const evaluation = jd.evaluationParameters;

  // ─── Main editor layout ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* ── Left: editor ───────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn(statusStyles[jd.status])}>
              {jd.status === "APPROVED" && <Check className="h-3 w-3" />}
              {jd.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-slate-400">v{jd.version}</span>
            {jd.generatedByAi && (
              <Badge
                variant="outline"
                className="border-indigo-200 bg-indigo-50 text-indigo-700"
              >
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowVersions(!showVersions);
                  if (!showVersions && versions.length === 0) fetchVersions();
                }}
              >
                <Clock className="h-3 w-3" />
                Versions
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showVersions && (
                <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {versions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-400">Loading…</p>
                  ) : (
                    versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => selectVersion(v)}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50",
                          v.id === jd.id && "bg-indigo-50"
                        )}
                      >
                        <span>
                          v{v.version} — {v.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {editing ? (
              <>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                  <Check className="h-3 w-3" />
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </>
            ) : (
              (jd.status === "DRAFT" || jd.status === "PENDING_APPROVAL") && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              )
            )}

            {(jd.status === "DRAFT" || jd.status === "PENDING_APPROVAL") &&
              !editing && (
                <Button size="sm" onClick={handleApprove} disabled={approving}>
                  <Shield className="h-3 w-3" />
                  {approving ? "Approving…" : "Approve"}
                </Button>
              )}

            {jd.status === "APPROVED" && !editing && (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishing}
              >
                <Send className="h-3 w-3" />
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            )}
          </div>
        </div>

        {/* Approval banner */}
        {(jd.status === "APPROVED" || jd.status === "PUBLISHED") &&
          jd.approvedBy &&
          jd.approvedAt && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              <Shield className="h-4 w-4" />
              Approved by {jd.approvedBy.name} on{" "}
              {new Date(jd.approvedAt).toLocaleDateString()}
            </div>
          )}

        {/* Published banner */}
        {jd.status === "PUBLISHED" && publicUrl && (
          <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-indigo-700">Published</span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-600 underline hover:text-indigo-800"
              >
                {publicUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              <Link2 className="h-3 w-3" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        )}

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {content.title || "Job Description"}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {fitment.designation && (
              <span>{fitment.designation}</span>
            )}
            {fitment.industry && (
              <>
                <span className="text-slate-300">·</span>
                <span>{fitment.industry}</span>
              </>
            )}
            {fitment.ctcRange && (
              <>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                  {fitment.ctcRange.currency}{" "}
                  {(fitment.ctcRange.min / 100000).toFixed(0)}–
                  {(fitment.ctcRange.max / 100000).toFixed(0)} L
                </span>
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About the Role</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editContent?.summary || ""}
                onChange={(e) =>
                  setEditContent((prev) =>
                    prev ? { ...prev, summary: e.target.value } : prev
                  )
                }
                className="min-h-[100px]"
              />
            ) : (
              <p className="text-sm leading-relaxed text-slate-600">
                {content.summary}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What You&rsquo;ll Do</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editContent?.responsibilities?.join("\n") || ""}
                onChange={(e) =>
                  setEditContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          responsibilities: e.target.value
                            .split("\n")
                            .filter(Boolean),
                        }
                      : prev
                  )
                }
                className="min-h-[200px]"
                placeholder="One responsibility per line"
              />
            ) : (
              <ul className="space-y-2">
                {content.responsibilities?.map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm leading-relaxed text-slate-600"
                  >
                    <span className="text-slate-300">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Qualifications */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-emerald-700">
                Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editContent?.qualifications?.required?.join("\n") || ""}
                  onChange={(e) =>
                    setEditContent((prev) =>
                      prev
                        ? {
                            ...prev,
                            qualifications: {
                              ...prev.qualifications,
                              required: e.target.value
                                .split("\n")
                                .filter(Boolean),
                            },
                          }
                        : prev
                    )
                  }
                  className="min-h-[150px]"
                  placeholder="One qualification per line"
                />
              ) : (
                <ul className="space-y-2">
                  {content.qualifications?.required?.map((q, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-indigo-700">
                Preferred
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={
                    editContent?.qualifications?.preferred?.join("\n") || ""
                  }
                  onChange={(e) =>
                    setEditContent((prev) =>
                      prev
                        ? {
                            ...prev,
                            qualifications: {
                              ...prev.qualifications,
                              preferred: e.target.value
                                .split("\n")
                                .filter(Boolean),
                            },
                          }
                        : prev
                    )
                  }
                  className="min-h-[150px]"
                  placeholder="One qualification per line"
                />
              ) : (
                <ul className="space-y-2">
                  {content.qualifications?.preferred?.map((q, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evaluation parameters (still useful for interviewers) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluation Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 lg:grid-cols-3">
              <EvalGroup color="blue" title="Technical">
                {evaluation.technicalSkills?.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div
                            key={j}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              j < s.proficiencyExpected
                                ? "bg-blue-600"
                                : "bg-slate-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.assessmentCriteria}
                    </p>
                  </div>
                ))}
              </EvalGroup>
              <EvalGroup color="purple" title="Leadership">
                {evaluation.leadershipSkills?.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {s.name}
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {s.indicators?.map((ind, j) => (
                        <li key={j} className="text-xs text-slate-500">
                          • {ind}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </EvalGroup>
              <EvalGroup color="emerald" title="Behavioural">
                {evaluation.behaviouralSkills?.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {s.name}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {s.assessmentCriteria}
                    </p>
                  </div>
                ))}
              </EvalGroup>
            </div>
          </CardContent>
        </Card>

        {/* About / Work mode */}
        {(content.aboutCompany || content.workMode) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About &amp; Work Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {content.aboutCompany && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    About the Company
                  </p>
                  {editing ? (
                    <Textarea
                      value={editContent?.aboutCompany || ""}
                      onChange={(e) =>
                        setEditContent((prev) =>
                          prev
                            ? { ...prev, aboutCompany: e.target.value }
                            : prev
                        )
                      }
                      className="mt-1.5"
                    />
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-600">
                      {content.aboutCompany}
                    </p>
                  )}
                </div>
              )}
              {content.workMode && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Work Mode
                  </p>
                  <Badge variant="outline" className="mt-1.5">
                    {content.workMode}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-slate-400">
          Created by {jd.createdBy?.name} on{" "}
          {new Date(jd.createdAt).toLocaleDateString()}
          {jd.generatedByAi && " — Powered by Claude AI"}
        </p>
      </div>

      {/* ── Right: 3-tab panel ─────────────────────────────────────── */}
      <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-80">
        <JdRightPanel
          content={content}
          fitment={fitment}
          additionalContext={additionalContext}
          onChangeContext={setAdditionalContext}
          onGenerate={handleGenerate}
        />
      </aside>
    </div>
  );
}

function EvalGroup({
  color,
  title,
  children,
}: {
  color: "blue" | "purple" | "emerald";
  title: string;
  children: React.ReactNode;
}) {
  const heading = {
    blue: "text-blue-700",
    purple: "text-purple-700",
    emerald: "text-emerald-700",
  }[color];
  return (
    <div>
      <h4 className={cn("mb-2.5 text-xs font-semibold uppercase tracking-wider", heading)}>
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Right panel
// ─────────────────────────────────────────────────────────────────────────

type RightPanelTab = "ai" | "meta" | "quality";

function JdRightPanel({
  content,
  fitment,
  additionalContext,
  onChangeContext,
  onGenerate,
}: {
  content: JdData["content"];
  fitment: JdData["fitmentMapping"];
  additionalContext: string;
  onChangeContext: (v: string) => void;
  onGenerate: (extraHint?: string) => void;
}) {
  const [tab, setTab] = useState<RightPanelTab>("ai");

  return (
    <Card className="overflow-hidden">
      {/* Tab nav */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {[
          { id: "ai" as const, label: "AI Assistant" },
          { id: "meta" as const, label: "Metadata" },
          { id: "quality" as const, label: "Quality" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-indigo-600 bg-white text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-4">
        {tab === "ai" && (
          <AiAssistantPanel
            additionalContext={additionalContext}
            onChangeContext={onChangeContext}
            onGenerate={onGenerate}
          />
        )}
        {tab === "meta" && <MetadataPanel fitment={fitment} content={content} />}
        {tab === "quality" && <QualityPanel content={content} />}
      </div>
    </Card>
  );
}

function AiAssistantPanel({
  additionalContext,
  onChangeContext,
  onGenerate,
}: {
  additionalContext: string;
  onChangeContext: (v: string) => void;
  onGenerate: (extraHint?: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Ask AI to improve the JD
        </p>
        <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-purple-50/60 to-cyan-50/60 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-indigo-600">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </span>
            <span className="text-[11px] font-bold text-purple-800">
              AI Prompt
            </span>
          </div>
          <Textarea
            rows={3}
            value={additionalContext}
            onChange={(e) => onChangeContext(e.target.value)}
            placeholder="e.g. Make tone more inclusive, add growth opportunities…"
            className="text-xs"
          />
          <Button
            variant="ai"
            size="sm"
            onClick={() => onGenerate()}
            className="mt-2 w-full"
          >
            <Sparkles className="h-3 w-3" />
            Generate
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Quick Actions
        </p>
        <div className="space-y-1.5">
          <QuickAction
            icon={Wand2}
            onClick={() =>
              onGenerate("Regenerate the JD from scratch using the latest plan details.")
            }
          >
            Generate from scratch
          </QuickAction>
          <QuickAction
            icon={Pencil}
            onClick={() =>
              onGenerate("Shorten the JD to about 400 words while keeping all key information.")
            }
          >
            Shorten to 400 words
          </QuickAction>
          <QuickAction
            icon={Search}
            onClick={() =>
              onGenerate("Review the JD for inclusive language and remove any biased phrasing.")
            }
          >
            Bias check
          </QuickAction>
        </div>
      </div>

      <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
        Inline suggestions and one-click apply are not yet wired up. The actions
        above run a full regenerate with the prompt as extra context.
      </p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700"
    >
      <Icon className="h-3 w-3 shrink-0" />
      {children}
    </button>
  );
}

function MetadataPanel({
  fitment,
  content,
}: {
  fitment: JdData["fitmentMapping"];
  content: JdData["content"];
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Job Details
        </p>
        <div className="space-y-2.5">
          <MetaField label="Job Title" value={content.title} />
          <MetaField label="Designation" value={fitment.designation} />
          <MetaField label="Industry" value={fitment.industry} />
          <MetaField label="Reporting To" value={fitment.reportingTo} />
          <MetaField label="HOD" value={fitment.hod} />
          {fitment.teamSize !== null && (
            <MetaField
              label="Team Size"
              value={`${fitment.teamSize} people`}
            />
          )}
          {fitment.teamLevels && (
            <MetaField label="Team Levels" value={fitment.teamLevels} />
          )}
          {fitment.ctcRange && (
            <MetaField
              label="CTC Range"
              value={`${fitment.ctcRange.currency} ${fitment.ctcRange.min.toLocaleString()} – ${fitment.ctcRange.max.toLocaleString()}`}
            />
          )}
          <MetaField label="Work Mode" value={content.workMode} />
        </div>
      </div>

      <p className="rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-500">
        These fields come from the parent hiring plan. Use the plan&rsquo;s Edit
        page to change them.
      </p>
    </div>
  );
}

function MetaField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-600">{label}</p>
      <p className="mt-0.5 text-xs text-slate-700">{value || "—"}</p>
    </div>
  );
}

function QualityPanel({ content }: { content: JdData["content"] }) {
  const stats = useMemo(() => computeQuality(content), [content]);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          JD Quality Score
        </p>
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg font-bold text-white shadow-md">
            {stats.overall}
          </div>
          <p className="flex-1 text-xs leading-relaxed text-slate-600">
            {stats.overall >= 80
              ? "Strong JD — ready to publish."
              : stats.overall >= 60
                ? "Good JD — a few improvements could increase application rates."
                : "Needs work — fill in missing sections to improve."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <ScoreBar label="Clarity" score={stats.clarity} />
        <ScoreBar label="Inclusivity" score={stats.inclusivity} />
        <ScoreBar label="Completeness" score={stats.completeness} />
        <ScoreBar label="Readability" score={stats.readability} />
      </div>

      <div className="rounded-lg border border-slate-200 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Word Count
        </p>
        <p className="mt-1 text-xl font-bold text-slate-900">
          {stats.wordCount}{" "}
          <span className="text-xs font-normal text-slate-400">words</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Optimal: 400–600 words · Reading time ~
          {Math.max(1, Math.round(stats.wordCount / 220))} min
        </p>
      </div>

      <p className="text-[11px] text-slate-400">
        Scores are heuristic estimates. Inclusivity flags common biased phrases;
        completeness checks each expected section.
      </p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const tone = score >= 80 ? "emerald" : score >= 60 ? "amber" : "red";
  const bar = {
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
  }[tone];
  const text = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  }[tone];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-600">{label}</span>
        <span className={cn("font-semibold", text)}>{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", bar)}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

// Lightweight quality heuristics — see comment in QualityPanel.
function computeQuality(content: JdData["content"]): {
  overall: number;
  clarity: number;
  inclusivity: number;
  completeness: number;
  readability: number;
  wordCount: number;
} {
  const sections = [
    content.summary,
    content.responsibilities?.join(" ") ?? "",
    content.qualifications?.required?.join(" ") ?? "",
    content.qualifications?.preferred?.join(" ") ?? "",
    content.aboutCompany,
  ].filter(Boolean) as string[];

  const text = sections.join(" ").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Completeness — % of expected sections that are non-empty
  const expected = [
    content.summary,
    content.responsibilities?.length ? "y" : "",
    content.qualifications?.required?.length ? "y" : "",
    content.qualifications?.preferred?.length ? "y" : "",
    content.aboutCompany,
  ];
  const completeness = Math.round(
    (expected.filter(Boolean).length / expected.length) * 100
  );

  // Inclusivity — penalise common biased phrases
  const biasFlags = [
    /\brock\s*star\b/i,
    /\bninja\b/i,
    /\bguru\b/i,
    /\baggressive\b/i,
    /\bdominant\b/i,
    /\bdigital native\b/i,
    /\bculture fit\b/i,
    /\byoung and energetic\b/i,
  ];
  const flagged = biasFlags.filter((re) => re.test(text)).length;
  const inclusivity = Math.max(40, 100 - flagged * 10);

  // Readability — Flesch-style approximation via avg sentence length
  const sentences =
    text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean).length || 1;
  const avgSentence = wordCount / sentences;
  const readability =
    avgSentence > 25
      ? Math.max(40, 100 - (avgSentence - 25) * 4)
      : avgSentence < 8
        ? 70
        : 85;

  // Clarity — combine word-count band + completeness signal
  const inBand = wordCount >= 350 && wordCount <= 700;
  const clarity = Math.min(
    100,
    Math.round((inBand ? 90 : 70) * 0.7 + completeness * 0.3)
  );

  const overall = Math.round(
    (clarity + inclusivity + completeness + readability) / 4
  );

  return {
    overall,
    clarity,
    inclusivity,
    completeness,
    readability,
    wordCount,
  };
}

