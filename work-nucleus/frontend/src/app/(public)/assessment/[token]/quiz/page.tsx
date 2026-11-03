"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  fetchCandidateAttempt,
  submitCandidateQuiz,
  AssessmentAttempt,
} from "@/lib/assessment-api";
import { AntiCheatWrapper } from "@/components/assessments/anti-cheat-wrapper";
import { TimerBar } from "@/components/assessments/timer-bar";
import { QuizPlayer } from "@/components/assessments/quiz-player";

export default function CandidateQuizPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCandidateAttempt(token)
      .then((data) => setAttempt(data))
      .catch((err) => {
        alert(err.message || "Failed to load attempt");
        router.push(`/assessment/${token}`);
      })
      .finally(() => setIsLoading(false));
  }, [token, router]);

  const handleSubmit = useCallback(
    async (
      responses: Array<{
        questionId: string;
        selectedOptions?: string[];
        textAnswer?: string;
        timeTakenMs?: number;
      }>
    ) => {
      setIsSubmitting(true);
      try {
        await submitCandidateQuiz(token, responses);
        router.push(`/assessment/${token}/complete`);
      } catch (err: any) {
        alert(err.message || "Failed to submit answers");
        setIsSubmitting(false);
      }
    },
    [token, router]
  );

  const handleTimerExpire = useCallback(() => {
    // Automatically submit with empty/current answers when timer hits 0
    if (!isSubmitting) {
      alert("Time limit reached! Submitting your answers now.");
      handleSubmit([]);
    }
  }, [handleSubmit, isSubmitting]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium text-slate-500">Preparing questions...</p>
      </div>
    );
  }

  if (!attempt) return null;

  return (
    <AntiCheatWrapper token={token} onExceededViolations={handleTimerExpire}>
      <TimerBar
        durationMinutes={attempt.assessment.durationMinutes}
        startedAt={attempt.startedAt}
        onExpire={handleTimerExpire}
        title={attempt.assessment.title}
      />

      <QuizPlayer
        questions={attempt.assessment.questions || []}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </AntiCheatWrapper>
  );
}

