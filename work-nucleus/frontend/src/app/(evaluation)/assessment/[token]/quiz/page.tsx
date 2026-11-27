"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  fetchCandidateAttempt,
  startCandidateAttempt,
  submitCandidateQuiz,
  AssessmentAttempt,
} from "@/lib/assessment-api";
import { AntiCheatWrapper } from "@/components/assessments/anti-cheat-wrapper";
import { TimerBar } from "@/components/assessments/timer-bar";
import { QuizPlayer, QuizPlayerHandle } from "@/components/assessments/quiz-player";
import { toast } from "@/components/ui/toaster";

export default function CandidateQuizPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quizPlayerRef = useRef<QuizPlayerHandle | null>(null);

  useEffect(() => {
    fetchCandidateAttempt(token)
      .then((data) => {
        if (data.status === "COMPLETED" || data.status === "TIMED_OUT") {
          router.push(`/assessment/${token}/complete`);
          return;
        }
        setAttempt(data);
        if (data.status === "NOT_STARTED") {
          startCandidateAttempt(token).catch(console.error);
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load attempt");
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
        toast.error(err.message || "Failed to submit answers");
        setIsSubmitting(false);
      }
    },
    [token, router]
  );

  const handleTimerExpire = useCallback(() => {
    if (!isSubmitting) {
      toast.warning("Time limit reached! Submitting your answers now.");
      if (quizPlayerRef.current) {
        void quizPlayerRef.current.submitNow();
      } else {
        void handleSubmit([]);
      }
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
        ref={quizPlayerRef}
        questions={attempt.assessment.questions || []}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </AntiCheatWrapper>
  );
}

