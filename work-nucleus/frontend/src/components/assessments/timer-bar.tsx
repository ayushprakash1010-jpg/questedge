"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface TimerBarProps {
  durationMinutes: number;
  startedAt?: string;
  onExpire: () => void;
  title: string;
}

export function TimerBar({
  durationMinutes,
  startedAt,
  onExpire,
  title,
}: TimerBarProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!startedAt) return durationMinutes * 60;
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - start) / 1000);
    const remaining = durationMinutes * 60 - elapsedSeconds;
    return remaining > 0 ? remaining : 0;
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const totalSeconds = durationMinutes * 60;
  const percentage = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 300; // < 5 mins

  return (
    <div className="w-full bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
          QE
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm">{title}</h2>
          <p className="text-xs text-slate-500">In-Platform Evaluation Session</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-36 hidden sm:block">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                isUrgent ? "bg-rose-500" : "bg-indigo-600"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm border transition-colors ${
            isUrgent
              ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          {isUrgent ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4 text-slate-400" />}
          <span>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

