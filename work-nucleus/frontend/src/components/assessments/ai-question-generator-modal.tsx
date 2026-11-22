"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Loader2,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  generateAiAssessmentQuestions,
  batchAddAssessmentQuestions,
  HiringAssessment,
  QuestionType,
  Difficulty,
  GeneratedQuestionItem,
} from "@/lib/assessment-api";

interface AiQuestionGeneratorModalProps {
  assessment: HiringAssessment;
  isOpen: boolean;
  onClose: () => void;
  onQuestionsAdded: () => void;
}

const TOPIC_SUGGESTIONS = [
  "React Hooks, Server Components & State Management",
  "Node.js, Express & REST API Architecture",
  "PostgreSQL Query Optimization & Indexing",
  "TypeScript Generics, Type Narrowing & Utility Types",
  "Cloud Security, Docker & Microservices Basics",
  "System Design, Caching & Distributed Concurrency",
];

export function AiQuestionGeneratorModal({
  assessment,
  isOpen,
  onClose,
  onQuestionsAdded,
}: AiQuestionGeneratorModalProps) {
  // Step 1: 'CONFIG' | 'REVIEW'
  const [step, setStep] = useState<"CONFIG" | "REVIEW">("CONFIG");

  // Config form state
  const [topic, setTopic] = useState(
    assessment.title ? `${assessment.title}` : ""
  );
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [questionType, setQuestionType] = useState<QuestionType>("MCQ");
  const [pointsPerQuestion, setPointsPerQuestion] = useState<number>(5);
  const [context, setContext] = useState<string>("");

  // Generation & Review state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError("Please specify a topic or skill domain.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await generateAiAssessmentQuestions(assessment.id, {
        topic: topic.trim(),
        count: Number(count),
        difficulty,
        questionType,
        pointsPerQuestion: Number(pointsPerQuestion),
        context: context.trim() || undefined,
      });

      if (!res.questions || res.questions.length === 0) {
        throw new Error("No questions were generated. Please try a different topic or prompt.");
      }

      setGeneratedQuestions(res.questions);
      // Select all by default
      setSelectedIndices(new Set(res.questions.map((_, i) => i)));
      setStep("REVIEW");
    } catch (err: any) {
      console.error("AI Generation error:", err);
      setError(err.message || "Failed to generate questions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    const updated = new Set(selectedIndices);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setSelectedIndices(updated);
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === generatedQuestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(generatedQuestions.map((_, i) => i)));
    }
  };

  const handleQuestionTextChange = (index: number, newText: string) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text: newText };
      return next;
    });
  };

  const handleOptionTextChange = (qIndex: number, optIndex: number, newText: string) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      const options = [...q.options];
      options[optIndex] = { ...options[optIndex], text: newText };
      q.options = options;
      next[qIndex] = q;
      return next;
    });
  };

  const handleSetCorrectOption = (qIndex: number, optIndex: number) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      if (q.type === "MULTI_SELECT") {
        const options = q.options.map((opt, i) =>
          i === optIndex ? { ...opt, isCorrect: !opt.isCorrect } : opt
        );
        q.options = options;
      } else {
        const options = q.options.map((opt, i) => ({
          ...opt,
          isCorrect: i === optIndex,
        }));
        q.options = options;
      }
      next[qIndex] = q;
      return next;
    });
  };

  const handleSaveToAssessment = async () => {
    const questionsToSave = generatedQuestions.filter((_, idx) => selectedIndices.has(idx));
    if (questionsToSave.length === 0) {
      setError("Please select at least one question to add.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await batchAddAssessmentQuestions(
        assessment.id,
        questionsToSave.map((q) => ({
          text: q.text,
          type: q.type,
          difficulty: q.difficulty,
          category: q.category || "Technical",
          points: q.points || pointsPerQuestion,
          explanation: q.explanation,
          options: q.options,
          tags: [q.category || "AI Generated"],
        }))
      );

      onQuestionsAdded();
      onClose();
    } catch (err: any) {
      console.error("Failed to batch save questions:", err);
      setError(err.message || "Failed to save questions to assessment.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = selectedIndices.size;
  const totalPointsToAdd = generatedQuestions
    .filter((_, idx) => selectedIndices.has(idx))
    .reduce((sum, q) => sum + (q.points || pointsPerQuestion), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Generate Assessment Questions with AI
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 tracking-wide">
                  Gemini Powered
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {step === "CONFIG"
                  ? "Configure parameters and prompt to synthesize targeted test questions."
                  : `Review and curate ${generatedQuestions.length} AI-drafted questions before adding.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CONFIGURATION FORM */}
          {step === "CONFIG" && (
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Topic / Skills */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assessment Topic & Skills Domain <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Next.js 14 App Router, Server Actions, React Hooks, and Auth0"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-400">Quick suggestions:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {TOPIC_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setTopic(sug)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors border border-slate-200/60"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid: Count, Difficulty, Question Type, Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Question Count */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Question Count
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions (Recommended)</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    <option value="EASY">Easy (Junior / Associate)</option>
                    <option value="MEDIUM">Medium (Mid-level / Standard)</option>
                    <option value="HARD">Hard (Senior / Staff / Lead)</option>
                  </select>
                </div>

                {/* Question Type */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Question Format
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  >
                    <option value="MCQ">Single Choice (MCQ)</option>
                    <option value="MULTI_SELECT">Multiple Choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>

                {/* Points */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Points Per Question
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={pointsPerQuestion}
                    onChange={(e) => setPointsPerQuestion(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  />
                </div>
              </div>

              {/* Special Context / Prompt refinement */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Special Focus & Requirements (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Context for Gemini</span>
                </div>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Focus on practical debugging scenarios, common production pitfalls, performance edge-cases, and avoid pure textbook definitions."
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
                />
              </div>

              {/* Notice */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 leading-relaxed">
                  <strong className="font-semibold">Review-First Guarantee:</strong> Questions are drafted into an interactive preview drawer. You can inspect answers, tweak questions or distractors, and choose exactly which ones to add.
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW & CURATION LIST */}
          {step === "REVIEW" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {selectedIndices.size === generatedQuestions.length ? "Deselect All" : "Select All"}
                  </button>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600 font-medium">
                    {selectedCount} of {generatedQuestions.length} selected ({totalPointsToAdd} pts)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("CONFIG")}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                  >
                    <Sliders className="h-3 w-3" />
                    Adjust Prompt
                  </button>
                  <span className="text-xs text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    disabled={isGenerating}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((q, qIdx) => {
                  const isSelected = selectedIndices.has(qIdx);
                  return (
                    <div
                      key={qIdx}
                      className={`border rounded-2xl p-4 transition-all ${
                        isSelected
                          ? "border-indigo-200 bg-white shadow-sm ring-1 ring-indigo-500/20"
                          : "border-slate-200 bg-slate-50/50 opacity-70"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(qIdx)}
                          className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />

                        <div className="flex-1 space-y-3">
                          {/* Badges & Points */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-indigo-600">
                              Question {qIdx + 1}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {q.type}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                q.difficulty === "HARD"
                                  ? "bg-rose-100 text-rose-700"
                                  : q.difficulty === "MEDIUM"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              ({q.points || pointsPerQuestion} pts)
                            </span>
                          </div>

                          {/* Editable Question Text */}
                          <textarea
                            value={q.text}
                            onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                            rows={2}
                            className="w-full text-xs font-semibold text-slate-800 p-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none resize-none bg-white"
                          />

                          {/* Editable Options */}
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Options (Click radio to set correct answer):
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={opt.id || oIdx}
                                  onClick={() => handleSetCorrectOption(qIdx, oIdx)}
                                  className={`p-2 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                    opt.isCorrect
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium shadow-xs"
                                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                  }`}
                                >
                                  <div
                                    className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 border ${
                                      opt.isCorrect
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {opt.isCorrect && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                  </div>
                                  <input
                                    type="text"
                                    value={opt.text}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      handleOptionTextChange(qIdx, oIdx, e.target.value)
                                    }
                                    className="flex-1 bg-transparent border-none text-xs focus:outline-none text-inherit font-medium"
                                  />
                                  {opt.isCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-700 shrink-0">
                                      ✓ Correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Explanation */}
                          {q.explanation && (
                            <div className="text-[11px] text-slate-500 bg-slate-100/70 p-2 rounded-lg">
                              <span className="font-semibold text-slate-700">Explanation: </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {step === "CONFIG" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isGenerating || !topic.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synthesizing Questions with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate {count} Questions</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("CONFIG")}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                ← Back to Config
              </button>
              <button
                type="button"
                onClick={handleSaveToAssessment}
                disabled={isSaving || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Adding to Assessment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Add {selectedCount} Selected Questions ({totalPointsToAdd} pts)</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
