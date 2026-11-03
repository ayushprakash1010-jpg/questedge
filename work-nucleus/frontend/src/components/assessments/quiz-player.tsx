"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  HelpCircle,
  AlertCircle,
  FileQuestion,
} from "lucide-react";
import { AssessmentQuestion } from "@/lib/assessment-api";

interface QuizPlayerProps {
  questions: AssessmentQuestion[];
  onSubmit: (responses: Array<{
    questionId: string;
    selectedOptions?: string[];
    textAnswer?: string;
    timeTakenMs?: number;
  }>) => Promise<void>;
  isSubmitting?: boolean;
}

export function QuizPlayer({ questions, onSubmit, isSubmitting }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptions: string[]; textAnswer?: string }>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [questionDurations, setQuestionDurations] = useState<Record<string, number>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    // Record start time of current question
    const qId = currentQuestion?.id;
    if (qId && !questionStartTimes[qId]) {
      setQuestionStartTimes((prev) => ({ ...prev, [qId]: Date.now() }));
    }
  }, [currentIndex, currentQuestion?.id, questionStartTimes]);

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    const isMulti = currentQuestion.type === "MULTI_SELECT";

    setAnswers((prev) => {
      const current = prev[qId]?.selectedOptions || [];
      if (isMulti) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [qId]: { ...prev[qId], selectedOptions: next } };
      } else {
        return { ...prev, [qId]: { ...prev[qId], selectedOptions: [optionId] } };
      }
    });
  };

  const handleTextAnswerChange = (val: string) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    setAnswers((prev) => ({
      ...prev,
      [qId]: { selectedOptions: [], textAnswer: val },
    }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const answeredCount = Object.keys(answers).filter(
    (k) => (answers[k]?.selectedOptions?.length || 0) > 0 || (answers[k]?.textAnswer?.trim()?.length || 0) > 0
  ).length;

  const handleSubmitAttempt = async () => {
    const formatted = questions.map((q) => {
      const ans = answers[q.id];
      const start = questionStartTimes[q.id];
      const elapsed = start ? Date.now() - start : 0;
      return {
        questionId: q.id,
        selectedOptions: ans?.selectedOptions || [],
        textAnswer: ans?.textAnswer,
        timeTakenMs: elapsed,
      };
    });

    await onSubmit(formatted);
  };

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-slate-600">No questions available in this assessment.</p>
      </div>
    );
  }

  const currentAnswer = answers[currentQuestion.id]?.selectedOptions || [];
  const currentTextAnswer = answers[currentQuestion.id]?.textAnswer || "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Panel (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-h-[540px]">
          <div>
            {/* Header / Badges */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {currentQuestion.type.replace("_", " ")}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  ({currentQuestion.points} {currentQuestion.points === 1 ? "pt" : "pts"})
                </span>
              </div>

              <button
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  flagged[currentQuestion.id]
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Flag className={`h-3.5 w-3.5 ${flagged[currentQuestion.id] ? "fill-amber-500 text-amber-500" : ""}`} />
                {flagged[currentQuestion.id] ? "Flagged" : "Flag for Review"}
              </button>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 leading-relaxed">
                {currentQuestion.text}
              </h3>
              {currentQuestion.category && (
                <p className="text-xs text-slate-400 mt-2 font-medium">Topic: {currentQuestion.category}</p>
              )}
            </div>

            {/* Options */}
            {currentQuestion.type !== "SUBJECTIVE" ? (
              <div className="space-y-3">
                {currentQuestion.options.map((opt, oIdx) => {
                  const isSelected = currentAnswer.includes(opt.id);
                  const letter = String.fromCharCode(65 + oIdx);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleOptionSelect(opt.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="text-sm font-medium text-slate-700 leading-normal flex-1">
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  Type your detailed response below:
                </label>
                <textarea
                  rows={6}
                  value={currentTextAnswer}
                  onChange={(e) => handleTextAnswerChange(e.target.value)}
                  placeholder="Explain your approach, thoughts, and reasoning..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <Send className="h-4 w-4" />
                Finish & Submit
              </button>
            )}
          </div>
        </div>

        {/* Side Palette (1 col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Questions Overview
            </h4>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered =
                  (answers[q.id]?.selectedOptions?.length || 0) > 0 ||
                  (answers[q.id]?.textAnswer?.trim()?.length || 0) > 0;
                const isFlagged = flagged[q.id];

                let bgClass = "bg-slate-100 text-slate-600 border-slate-200";
                if (isAnswered) bgClass = "bg-emerald-500 text-white border-emerald-600";
                if (isFlagged) bgClass = "bg-amber-400 text-white border-amber-500";
                if (isCurrent) bgClass = "ring-2 ring-indigo-600 ring-offset-2 font-bold " + bgClass;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center text-xs font-semibold transition-all ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400 shrink-0" />
                <span>Flagged ({Object.values(flagged).filter(Boolean).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-200 shrink-0" />
                <span>Unattempted ({questions.length - answeredCount})</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Submit Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Ready to submit your assessment?</h3>
            <p className="text-sm text-slate-600 mb-4">
              You have answered <span className="font-bold text-indigo-600">{answeredCount}</span> out of{" "}
              <span className="font-bold text-slate-800">{questions.length}</span> questions.
              Once submitted, you cannot change your answers.
            </p>

            {questions.length - answeredCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>You still have {questions.length - answeredCount} unanswered questions!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Keep Reviewing
              </button>
              <button
                onClick={handleSubmitAttempt}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

