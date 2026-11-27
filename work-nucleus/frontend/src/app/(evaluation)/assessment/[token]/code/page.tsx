"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  fetchCandidateAttempt,
  startCandidateAttempt,
  completeCandidateCodeAssessment,
  AssessmentAttempt,
} from "@/lib/assessment-api";
import { AntiCheatWrapper } from "@/components/assessments/anti-cheat-wrapper";
import { TimerBar } from "@/components/assessments/timer-bar";
import { CodingWorkspace } from "@/components/assessments/coding-workspace";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";

export default function CandidateCodePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

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

  const handleComplete = useCallback(async () => {
    setConfirmCompleteOpen(true);
  }, []);

  const submitComplete = useCallback(async () => {
    setCompleting(true);
    try {
      await completeCandidateCodeAssessment(token);
      setConfirmCompleteOpen(false);
      router.push(`/assessment/${token}/complete`);
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize coding submission");
    } finally {
      setCompleting(false);
    }
  }, [token, router]);

  const handleTimerExpire = useCallback(async () => {
    toast.warning("Time limit reached! Submitting your final code now.");
    try {
      await completeCandidateCodeAssessment(token);
      router.push(`/assessment/${token}/complete`);
    } catch (err) {
      router.push(`/assessment/${token}/complete`);
    }
  }, [token, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium text-slate-300">Loading Monaco Code Sandbox...</p>
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

      <CodingWorkspace
        token={token}
        challenges={attempt.assessment.codingChallenges || []}
        onComplete={handleComplete}
      />
      <ConfirmDialog
        open={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        onConfirm={submitComplete}
        title="Finish coding assessment?"
        description="Are you sure you want to finish and submit your coding assessment?"
        confirmLabel="Submit Assessment"
        loading={completing}
      />
    </AntiCheatWrapper>
  );
}

