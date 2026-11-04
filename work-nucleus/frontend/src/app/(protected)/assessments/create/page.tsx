"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  FileQuestion,
  Video,
  Clock,
  Award,
  ShieldAlert,
  Sparkles,
  Loader2,
} from "lucide-react";
import { createAssessment, AssessmentType } from "@/lib/assessment-api";
import { Mandate } from "@/lib/marketplace-api";

export default function CreateAssessmentPage() {
  const router = useRouter();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<AssessmentType>("CODING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [totalPoints, setTotalPoints] = useState(100);
  const [mandateId, setMandateId] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [instructions, setInstructions] = useState(
    "Please ensure a stable internet connection. Tab switching and exiting fullscreen mode are strictly monitored."
  );

  useEffect(() => {
    fetch("/api/mandates?limit=100")
      .then((res) => res.json())
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          setMandates(res.data);
        } else if (Array.isArray(res)) {
          setMandates(res);
        }
      })
      .catch((err) => console.warn("Failed to load mandates for dropdown", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide an assessment title");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createAssessment({
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: Number(durationMinutes),
        passingPercentage: Number(passingPercentage),
        totalPoints: Number(totalPoints),
        mandateId: mandateId || undefined,
        shuffleQuestions,
        shuffleOptions,
        instructions: instructions.trim() || undefined,
      });

      // Redirect directly to the assessment editor to add questions / challenges
      router.push(`/assessments/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create assessment");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assessments
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Assessment Module</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure an in-platform technical or business evaluation for your hiring mandates.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Module Type Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Select Assessment Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => setType("CODING")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                type === "CODING"
                  ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Coding Challenge</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Monaco IDE + Judge0 compiler. Ideal for engineering & developer roles.
                </p>
              </div>
            </div>

            <div
              onClick={() => setType("QUIZ")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                type === "QUIZ"
                  ? "border-amber-500 bg-amber-50/50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <FileQuestion className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">MCQ / Quiz</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Timed multiple choice & situational judgment. Ideal for MBA & business roles.
                </p>
              </div>
            </div>

            <div
              onClick={() => setType("VIDEO_INTERVIEW")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                type === "VIDEO_INTERVIEW"
                  ? "border-sky-500 bg-sky-50/50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
                <Video className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Video Interview</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Embedded 1-on-1 Jitsi call with real-time scorecard and resume viewer.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* General Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. Basic Information
          </label>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assessment Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer: React & Algorithms Evaluation"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Objectives
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the scope and purpose of this round to the candidate..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Associated Job Mandate (Optional)
            </label>
            <select
              value={mandateId}
              onChange={(e) => setMandateId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- No specific mandate (General Pool) --</option>
              {mandates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.department || "General"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parameters & Anti-Cheat */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            3. Evaluation Parameters & Proctoring
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-slate-400" />
                Passing Cutoff (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={passingPercentage}
                onChange={(e) => setPassingPercentage(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Points
              </label>
              <input
                type="number"
                min={10}
                max={1000}
                value={totalPoints}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-medium text-slate-700">
                Randomize Question Order (Prevents candidate answer sharing)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-medium text-slate-700">
                Shuffle Option Choices (MCQ A/B/C/D variation)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Candidate Instructions
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/assessments"
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Module...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Create & Add Questions
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
