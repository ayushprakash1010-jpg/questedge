"use client";

import { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
  Shield,
  Clock,
  Globe,
  Link2,
  ExternalLink,
} from "lucide-react";

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
    technicalSkills: { name: string; proficiencyExpected: number; assessmentCriteria: string }[];
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
  APPROVED: "bg-green-50 text-green-700 border-green-200",
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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/hiring-plans/${planId}/jd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalContext: additionalContext || undefined }),
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

  // Fetch publish status if JD is already published
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

  // Loading state
  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  // Generating state
  if (generating) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            AI is crafting your job description...
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Powered by Claude AI. This may take a moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No JD exists
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
            Let Claude AI generate a professional job description based on your hiring plan details,
            skills, and team structure.
          </p>
          <div className="mt-6 w-full max-w-md space-y-3">
            <Textarea
              placeholder="Optional: Add additional context or instructions for the AI (e.g., 'emphasize remote work culture', 'include startup environment')..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[80px]"
            />
            <Button onClick={handleGenerate} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // JD Display
  const content = editing && editContent ? editContent : jd.content;
  const fitment = jd.fitmentMapping;
  const evaluation = jd.evaluationParameters;

  return (
    <div className="space-y-6">
      {/* Approval Banner */}
      {(jd.status === "APPROVED" || jd.status === "PUBLISHED") && jd.approvedBy && jd.approvedAt && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <Shield className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            Approved by {jd.approvedBy.name} on{" "}
            {new Date(jd.approvedAt).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Published Banner */}
      {jd.status === "PUBLISHED" && publicUrl && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">Published</span>
            <span className="text-sm text-indigo-600">&mdash;</span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-indigo-600 underline hover:text-indigo-800"
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
            <Link2 className="mr-1 h-3 w-3" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      )}

      {/* Header with actions */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">
            {content.title || "Job Description"}
          </h2>
          <Badge variant="outline" className={cn(statusStyles[jd.status])}>
            {jd.status.replace("_", " ")}
          </Badge>
          {jd.generatedByAi && (
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
              <Sparkles className="mr-1 h-3 w-3" />
              AI Generated
            </Badge>
          )}
          <span className="text-xs text-slate-400">v{jd.version}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Version dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowVersions(!showVersions);
                if (!showVersions && versions.length === 0) fetchVersions();
              }}
            >
              <Clock className="mr-1 h-3 w-3" />
              Versions
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {showVersions && (
              <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {versions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-400">Loading...</p>
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

          {/* Edit / Save / Cancel */}
          {editing ? (
            <>
              <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                <Check className="mr-1 h-3 w-3" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              {(jd.status === "DRAFT" || jd.status === "PENDING_APPROVAL") && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              )}
            </>
          )}

          {/* Approve */}
          {(jd.status === "DRAFT" || jd.status === "PENDING_APPROVAL") && !editing && (
            <Button size="sm" onClick={handleApprove} disabled={approving}>
              <Shield className="mr-1 h-3 w-3" />
              {approving ? "Approving..." : "Approve"}
            </Button>
          )}

          {/* Publish */}
          {jd.status === "APPROVED" && !editing && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Globe className="mr-1 h-3 w-3" />
              {publishing ? "Publishing..." : "Publish Job"}
            </Button>
          )}

          {/* Regenerate */}
          {!editing && (
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editContent?.summary || ""}
              onChange={(e) =>
                setEditContent((prev) => prev ? { ...prev, summary: e.target.value } : prev)
              }
              className="min-h-[100px]"
            />
          ) : (
            <p className="text-sm leading-relaxed text-slate-600">{content.summary}</p>
          )}
        </CardContent>
      </Card>

      {/* Key Responsibilities */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Key Responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editContent?.responsibilities?.join("\n") || ""}
              onChange={(e) =>
                setEditContent((prev) =>
                  prev
                    ? { ...prev, responsibilities: e.target.value.split("\n").filter(Boolean) }
                    : prev
                )
              }
              className="min-h-[200px]"
              placeholder="One responsibility per line"
            />
          ) : (
            <ol className="ml-4 list-decimal space-y-2">
              {content.responsibilities?.map((r, i) => (
                <li key={i} className="text-sm text-slate-600">
                  {r}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Qualifications */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-green-700">Required Qualifications</CardTitle>
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
                            required: e.target.value.split("\n").filter(Boolean),
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
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {q}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-indigo-700">Preferred Qualifications</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editContent?.qualifications?.preferred?.join("\n") || ""}
                onChange={(e) =>
                  setEditContent((prev) =>
                    prev
                      ? {
                          ...prev,
                          qualifications: {
                            ...prev.qualifications,
                            preferred: e.target.value.split("\n").filter(Boolean),
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
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    {q}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fitment Mapping */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Fitment Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FitmentField label="Role" value={fitment.role} />
            <FitmentField label="Designation" value={fitment.designation} />
            <FitmentField
              label="CTC Range"
              value={
                fitment.ctcRange
                  ? `${fitment.ctcRange.currency} ${fitment.ctcRange.min?.toLocaleString()} - ${fitment.ctcRange.max?.toLocaleString()}`
                  : "N/A"
              }
            />
            <FitmentField label="Industry" value={fitment.industry} />
            <FitmentField label="Reporting To" value={fitment.reportingTo} />
            <FitmentField label="HOD" value={fitment.hod} />
            <FitmentField label="Team Size" value={fitment.teamSize ? String(fitment.teamSize) : "N/A"} />
            <FitmentField label="Team Levels" value={fitment.teamLevels || "N/A"} />
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Parameters */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Evaluation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Technical Skills */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-blue-700">Technical Skills</h4>
              <div className="space-y-3">
                {evaluation.technicalSkills?.map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{s.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div
                            key={j}
                            className={cn(
                              "h-2 w-2 rounded-full",
                              j < s.proficiencyExpected ? "bg-blue-600" : "bg-slate-200"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{s.assessmentCriteria}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Leadership Skills */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-purple-700">Leadership Skills</h4>
              <div className="space-y-3">
                {evaluation.leadershipSkills?.map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3">
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    <ul className="mt-1 space-y-1">
                      {s.indicators?.map((ind, j) => (
                        <li key={j} className="text-xs text-slate-500">
                          &bull; {ind}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Behavioural Skills */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-green-700">Behavioural Skills</h4>
              <div className="space-y-3">
                {evaluation.behaviouralSkills?.map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3">
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    <p className="mt-1 text-xs text-slate-500">{s.assessmentCriteria}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Company & Work Mode */}
      {(content.aboutCompany || content.workMode) && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">About & Work Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.aboutCompany && (
              <div>
                <p className="text-xs font-medium text-slate-500">About the Company</p>
                {editing ? (
                  <Textarea
                    value={editContent?.aboutCompany || ""}
                    onChange={(e) =>
                      setEditContent((prev) =>
                        prev ? { ...prev, aboutCompany: e.target.value } : prev
                      )
                    }
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-slate-600">{content.aboutCompany}</p>
                )}
              </div>
            )}
            {content.workMode && (
              <div>
                <p className="text-xs font-medium text-slate-500">Work Mode</p>
                <Badge variant="outline" className="mt-1">
                  {content.workMode}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      <p className="text-xs text-slate-400">
        Created by {jd.createdBy?.name} on {new Date(jd.createdAt).toLocaleDateString()}
        {jd.generatedByAi && " — Powered by Claude AI"}
      </p>
    </div>
  );
}

function FitmentField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
