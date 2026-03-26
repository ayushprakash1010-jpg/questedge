"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Save, Send, Star, Clock } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface FeedbackFormProps {
  applicationId: string;
  stageId: string;
  stageName: string;
  candidateName: string;
  roleName: string;
  skills: Skill[];
  onSubmitted?: () => void;
  onClose?: () => void;
}

const RECOMMENDATIONS = [
  { value: "STRONG_YES", label: "Strong Yes", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "YES", label: "Yes", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  { value: "NEUTRAL", label: "Neutral", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "NO", label: "No", color: "bg-orange-50 text-orange-700 border-orange-300" },
  { value: "STRONG_NO", label: "Strong No", color: "bg-red-100 text-red-700 border-red-300" },
];

const RATING_LABELS = ["", "Poor", "Below Avg", "Average", "Good", "Excellent"];

const categoryColors: Record<string, string> = {
  TECHNICAL: "bg-blue-50 text-blue-700 border-blue-200",
  LEADERSHIP: "bg-purple-50 text-purple-700 border-purple-200",
  BEHAVIOURAL: "bg-green-50 text-green-700 border-green-200",
  COMMUNICATION: "bg-amber-50 text-amber-700 border-amber-200",
  DOMAIN: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export function FeedbackForm({
  applicationId,
  stageId,
  stageName,
  candidateName,
  roleName,
  skills,
  onSubmitted,
  onClose,
}: FeedbackFormProps) {
  const [overallRating, setOverallRating] = useState(0);
  const [recommendation, setRecommendation] = useState("");
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [qualitativeNotes, setQualitativeNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [skillRatings, setSkillRatings] = useState<Record<string, { rating: number; notes: string }>>({});
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing draft
  useEffect(() => {
    async function loadDraft() {
      try {
        const res = await fetch(`/api/applications/${applicationId}/feedback`);
        if (!res.ok) return;
        const data = await res.json();
        // Find our feedback for this stage
        for (const group of data) {
          for (const fb of group.feedbacks) {
            if (fb.stageId === stageId) {
              setFeedbackId(fb.id);
              setOverallRating(fb.overallRating);
              setRecommendation(fb.recommendation);
              setStrengths(fb.strengths || "");
              setConcerns(fb.concerns || "");
              setQualitativeNotes(fb.qualitativeNotes || "");
              setDurationMinutes(fb.durationMinutes || "");
              setIsSubmitted(fb.isSubmitted);
              const ratings: Record<string, { rating: number; notes: string }> = {};
              for (const sr of fb.skillRatings || []) {
                ratings[sr.skill.id] = { rating: sr.rating, notes: sr.notes || "" };
              }
              setSkillRatings(ratings);
              return;
            }
          }
        }
      } catch {
        // No existing draft
      }
    }
    loadDraft();
  }, [applicationId, stageId]);

  const saveDraft = useCallback(async () => {
    if (!overallRating || !recommendation || isSubmitted) return;
    setSaving(true);
    try {
      const body = {
        stageId,
        overallRating,
        recommendation,
        strengths: strengths || undefined,
        concerns: concerns || undefined,
        qualitativeNotes: qualitativeNotes || undefined,
        durationMinutes: durationMinutes || undefined,
        skillRatings: Object.entries(skillRatings)
          .filter(([, v]) => v.rating > 0)
          .map(([skillId, v]) => ({
            skillId,
            rating: v.rating,
            notes: v.notes || undefined,
          })),
      };

      const res = await fetch(`/api/applications/${applicationId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedbackId(data.id);
        setLastSaved(new Date());
      }
    } catch {
      // Silent save failure
    } finally {
      setSaving(false);
    }
  }, [applicationId, stageId, overallRating, recommendation, strengths, concerns, qualitativeNotes, durationMinutes, skillRatings, isSubmitted]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (overallRating && recommendation && !isSubmitted) {
      autoSaveTimer.current = setTimeout(saveDraft, 30000);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [overallRating, recommendation, strengths, concerns, qualitativeNotes, durationMinutes, skillRatings, saveDraft, isSubmitted]);

  const handleSubmit = async () => {
    if (!overallRating || !recommendation) return;

    // Save first if no feedbackId
    if (!feedbackId) {
      await saveDraft();
    }

    // Need feedbackId to submit
    setSubmitting(true);
    try {
      // Save latest draft first
      await saveDraft();

      // Then submit
      const res = await fetch(
        `/api/applications/${applicationId}/feedback?action=submit&feedbackId=${feedbackId}`,
        { method: "POST" }
      );
      if (res.ok) {
        setIsSubmitted(true);
        onSubmitted?.();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const updateSkillRating = (skillId: string, rating: number) => {
    setSkillRatings((prev) => ({
      ...prev,
      [skillId]: { ...prev[skillId], rating, notes: prev[skillId]?.notes || "" },
    }));
  };

  const updateSkillNotes = (skillId: string, notes: string) => {
    setSkillRatings((prev) => ({
      ...prev,
      [skillId]: { ...prev[skillId], rating: prev[skillId]?.rating || 0, notes },
    }));
  };

  // Group skills by category
  const skillsByCategory = skills.reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Send className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-green-900">Feedback Submitted</h3>
          <p className="mt-1 text-sm text-green-700">
            Your feedback for {candidateName} has been submitted successfully.
          </p>
          {onClose && (
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-slate-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{candidateName}</h2>
              <p className="text-sm text-slate-500">
                {roleName} &middot; {stageName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {lastSaved && (
                <>
                  <Clock className="h-3 w-3" />
                  Last saved {lastSaved.toLocaleTimeString()}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Ratings */}
      {skills.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Skill Ratings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(skillsByCategory).map(([category, catSkills]) => (
              <div key={category}>
                <Badge variant="outline" className={cn("mb-3 text-xs", categoryColors[category])}>
                  {category}
                </Badge>
                <div className="space-y-3">
                  {catSkills.map((skill) => (
                    <div key={skill.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">{skill.name}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => updateSkillRating(skill.id, n)}
                              className="group relative"
                              title={RATING_LABELS[n]}
                            >
                              <Star
                                className={cn(
                                  "h-5 w-5 transition-colors",
                                  (skillRatings[skill.id]?.rating || 0) >= n
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-200 group-hover:text-amber-200"
                                )}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-xs text-slate-500">
                            {RATING_LABELS[skillRatings[skill.id]?.rating || 0] || "—"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                        className="mt-1 text-xs text-indigo-600 hover:underline"
                      >
                        {expandedSkill === skill.id ? "Hide notes" : "Add notes"}
                      </button>
                      {expandedSkill === skill.id && (
                        <Textarea
                          className="mt-2 text-sm"
                          placeholder={`Notes for ${skill.name}...`}
                          value={skillRatings[skill.id]?.notes || ""}
                          onChange={(e) => updateSkillNotes(skill.id, e.target.value)}
                          rows={2}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overall Assessment */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Overall Rating */}
          <div>
            <label className="text-sm font-medium text-slate-700">Overall Rating *</label>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setOverallRating(n)}
                  className="group"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      overallRating >= n
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200 group-hover:text-amber-200"
                    )}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm text-slate-600">
                {RATING_LABELS[overallRating] || "Select rating"}
              </span>
            </div>
          </div>

          {/* Recommendation */}
          <div>
            <label className="text-sm font-medium text-slate-700">Recommendation *</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {RECOMMENDATIONS.map((rec) => (
                <button
                  key={rec.value}
                  type="button"
                  onClick={() => setRecommendation(rec.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                    recommendation === rec.value
                      ? cn(rec.color, "ring-2 ring-offset-1")
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {rec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <label className="text-sm font-medium text-slate-700">Strengths</label>
            <Textarea
              className="mt-1"
              placeholder="Key strengths observed during the interview..."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
            />
          </div>

          {/* Concerns */}
          <div>
            <label className="text-sm font-medium text-slate-700">Concerns</label>
            <Textarea
              className="mt-1"
              placeholder="Any concerns or areas of improvement..."
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              rows={3}
            />
          </div>

          {/* General Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700">General Notes</label>
            <Textarea
              className="mt-1"
              placeholder="Additional notes..."
              value={qualitativeNotes}
              onChange={(e) => setQualitativeNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-slate-700">Interview Duration (minutes)</label>
            <Input
              type="number"
              className="mt-1 w-32"
              placeholder="45"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : "")}
              min={0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={saving || !overallRating || !recommendation}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !overallRating || !recommendation}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </div>
  );
}
