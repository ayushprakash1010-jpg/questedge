"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Star, ChevronDown, ChevronUp, MessageSquare, Brain,
  BarChart3, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react";

interface SkillRating {
  skill: { id: string; name: string; category: string };
  rating: number;
  notes: string | null;
}

interface FeedbackItem {
  id: string;
  overallRating: number;
  recommendation: string;
  strengths: string | null;
  concerns: string | null;
  qualitativeNotes: string | null;
  durationMinutes: number | null;
  isSubmitted: boolean;
  submittedAt: string | null;
  interviewer: { id: string; name: string; email: string };
  stage: { id: string; name: string; stageType: string };
  skillRatings: SkillRating[];
}

interface FeedbackGroup {
  stage: { id: string; name: string; stageType: string; stageOrder: number };
  feedbacks: FeedbackItem[];
}

interface AiSummary {
  overallAssessment: string;
  keyStrengths: string[];
  areasOfConcern: string[];
  skillAnalysis: { skillName: string; category: string; averageRating: number; assessment: string }[];
  recommendation: string;
  confidence: string;
  riskFactors: string[];
}

interface AiScore {
  score: number;
  breakdown: { category: string; score: number; weight: number; weightedScore: number }[];
  confidence: string;
  keyFactors: string[];
}

const recommendationColors: Record<string, string> = {
  STRONG_YES: "bg-green-100 text-green-700",
  YES: "bg-emerald-50 text-emerald-700",
  NEUTRAL: "bg-slate-100 text-slate-700",
  NO: "bg-orange-50 text-orange-700",
  STRONG_NO: "bg-red-100 text-red-700",
};

const categoryColors: Record<string, string> = {
  TECHNICAL: "bg-blue-50 text-blue-700",
  LEADERSHIP: "bg-purple-50 text-purple-700",
  BEHAVIOURAL: "bg-green-50 text-green-700",
  COMMUNICATION: "bg-amber-50 text-amber-700",
  DOMAIN: "bg-cyan-50 text-cyan-700",
  technical: "bg-blue-50 text-blue-700",
  leadership: "bg-purple-50 text-purple-700",
  behavioural: "bg-green-50 text-green-700",
  communication: "bg-amber-50 text-amber-700",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

export function FeedbackDisplay({
  applicationId,
  aiSummary,
  totalScore,
}: {
  applicationId: string;
  aiSummary: string | null;
  totalScore: string | null;
}) {
  const [groups, setGroups] = useState<FeedbackGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [score, setScore] = useState<AiScore | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    if (aiSummary) {
      try {
        setSummary(JSON.parse(aiSummary));
      } catch {
        // invalid
      }
    }
  }, [aiSummary]);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/feedback`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        if (data.length > 0) setExpandedStage(data[0].stage.id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/feedback?action=summarize`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // ignore
    } finally {
      setSummarizing(false);
    }
  };

  const handleScore = async () => {
    setScoring(true);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/feedback?action=score`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setScore(data);
      }
    } catch {
      // ignore
    } finally {
      setScoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const submittedCount = groups.reduce(
    (acc, g) => acc + g.feedbacks.filter((f) => f.isSubmitted).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Feedback List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            Interview Feedback ({submittedCount} submitted)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-slate-400">No feedback submitted yet</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.stage.id} className="rounded-lg border border-slate-100">
                  <button
                    onClick={() =>
                      setExpandedStage(expandedStage === group.stage.id ? null : group.stage.id)
                    }
                    className="flex w-full items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{group.stage.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {group.feedbacks.filter((f) => f.isSubmitted).length}/{group.feedbacks.length}
                      </Badge>
                    </div>
                    {expandedStage === group.stage.id ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {expandedStage === group.stage.id && (
                    <div className="space-y-2 border-t border-slate-100 p-3">
                      {group.feedbacks.map((fb) => (
                        <div
                          key={fb.id}
                          className="rounded-lg border border-slate-50 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {fb.interviewer.name}
                              </span>
                              {!fb.isSubmitted && (
                                <Badge variant="outline" className="text-xs text-amber-600">
                                  Draft
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      fb.overallRating >= n
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-200"
                                    )}
                                  />
                                ))}
                              </div>
                              <Badge
                                variant="outline"
                                className={cn("text-xs", recommendationColors[fb.recommendation])}
                              >
                                {fb.recommendation.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>

                          {/* Toggle expand */}
                          <button
                            onClick={() =>
                              setExpandedFeedback(expandedFeedback === fb.id ? null : fb.id)
                            }
                            className="mt-1 text-xs text-indigo-600 hover:underline"
                          >
                            {expandedFeedback === fb.id ? "Show less" : "Show details"}
                          </button>

                          {expandedFeedback === fb.id && (
                            <div className="mt-3 space-y-3">
                              {fb.strengths && (
                                <div>
                                  <p className="text-xs font-medium text-green-700">Strengths</p>
                                  <p className="mt-0.5 text-xs text-slate-600">{fb.strengths}</p>
                                </div>
                              )}
                              {fb.concerns && (
                                <div>
                                  <p className="text-xs font-medium text-red-700">Concerns</p>
                                  <p className="mt-0.5 text-xs text-slate-600">{fb.concerns}</p>
                                </div>
                              )}
                              {fb.qualitativeNotes && (
                                <div>
                                  <p className="text-xs font-medium text-slate-700">Notes</p>
                                  <p className="mt-0.5 text-xs text-slate-600">{fb.qualitativeNotes}</p>
                                </div>
                              )}
                              {fb.skillRatings.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-700">Skill Ratings</p>
                                  <div className="mt-1 space-y-1">
                                    {fb.skillRatings.map((sr) => (
                                      <div
                                        key={sr.skill.id}
                                        className="flex items-center justify-between text-xs"
                                      >
                                        <span className="text-slate-600">{sr.skill.name}</span>
                                        <div className="flex items-center gap-1">
                                          {[1, 2, 3, 4, 5].map((n) => (
                                            <div
                                              key={n}
                                              className={cn(
                                                "h-1.5 w-1.5 rounded-full",
                                                sr.rating >= n ? "bg-indigo-600" : "bg-slate-200"
                                              )}
                                            />
                                          ))}
                                          <span className="ml-1 text-slate-500">{sr.rating}/5</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {fb.durationMinutes && (
                                <p className="text-xs text-slate-400">
                                  Duration: {fb.durationMinutes} minutes
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Summary */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-purple-600" />
              AI Summary
            </CardTitle>
            {submittedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSummarize}
                disabled={summarizing}
              >
                <RefreshCw className={cn("mr-1 h-3 w-3", summarizing && "animate-spin")} />
                {summary ? "Regenerate" : "Generate Summary"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <p className="text-sm text-slate-400">
              {submittedCount === 0
                ? "Submit feedback first to generate an AI summary"
                : "Click Generate Summary to create an AI-powered assessment"}
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-900">{summary.overallAssessment}</p>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    summary.recommendation === "hire"
                      ? "bg-green-50 text-green-700"
                      : summary.recommendation === "conditional_hire"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  )}
                >
                  {summary.recommendation.replace("_", " ").toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Confidence: {summary.confidence}
                </Badge>
              </div>

              {summary.keyStrengths.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700">Key Strengths</p>
                  <ul className="mt-1 space-y-1">
                    {summary.keyStrengths.map((s, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.areasOfConcern.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700">Areas of Concern</p>
                  <ul className="mt-1 space-y-1">
                    {summary.areasOfConcern.map((c, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                        <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.riskFactors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700">Risk Factors</p>
                  <ul className="mt-1 space-y-1">
                    {summary.riskFactors.map((r, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Score */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-amber-600" />
              AI Score
            </CardTitle>
            {submittedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleScore}
                disabled={scoring}
              >
                <RefreshCw className={cn("mr-1 h-3 w-3", scoring && "animate-spin")} />
                {score || totalScore ? "Rescore" : "Generate Score"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!score && !totalScore ? (
            <p className="text-sm text-slate-400">
              {submittedCount === 0
                ? "Submit feedback first to generate a score"
                : "Click Generate Score to calculate an AI-powered candidate score"}
            </p>
          ) : score ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={cn("text-4xl font-bold", scoreColor(score.score))}>
                  {Math.round(score.score)}
                </span>
                <div>
                  <p className="text-sm text-slate-600">out of 100</p>
                  <Badge variant="outline" className="text-xs">
                    Confidence: {score.confidence}
                  </Badge>
                </div>
              </div>

              {score.breakdown.length > 0 && (
                <div className="space-y-2">
                  {score.breakdown.map((b) => (
                    <div key={b.category}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 capitalize">{b.category}</span>
                        <span className="text-slate-500">
                          {b.score.toFixed(1)}/5 ({b.weight}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            categoryColors[b.category] ? "bg-indigo-500" : "bg-indigo-500"
                          )}
                          style={{ width: `${(b.score / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {score.keyFactors.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {score.keyFactors.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className={cn("text-3xl font-bold", scoreColor(Number(totalScore)))}>
                {Math.round(Number(totalScore))}
              </span>
              <p className="text-sm text-slate-500">out of 100</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
