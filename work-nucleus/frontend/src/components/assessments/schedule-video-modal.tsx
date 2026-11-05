"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Video, Copy, Check, X, ExternalLink, Calendar, User, Mail, Sparkles, Loader2 } from "lucide-react";
import { scheduleVideoInterview, VideoInterview } from "@/lib/assessment-api";

interface ScheduleVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (interview: VideoInterview) => void;
}

export function ScheduleVideoModal({
  isOpen,
  onClose,
  onCreated,
}: ScheduleVideoModalProps) {
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInterview, setCreatedInterview] = useState<VideoInterview | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateEmail.trim()) {
      setError("Please enter a valid candidate email.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const interview = await scheduleVideoInterview({
        candidateEmail: candidateEmail.trim(),
        candidateName: candidateName.trim() || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      });

      setCreatedInterview(interview);
      if (onCreated) {
        onCreated(interview);
      }
    } catch (err: any) {
      setError(err.message || "Failed to schedule video interview session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidateUrl = createdInterview
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${createdInterview.candidateAccessToken}`
    : "";

  const copyToClipboard = () => {
    if (!candidateUrl) return;
    navigator.clipboard.writeText(candidateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Schedule Video Interview</h3>
              <p className="text-xs text-slate-500">Embedded Jitsi Meet room with live scorecard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!createdInterview ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Candidate Email *
              </label>
              <input
                type="email"
                required
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="e.g. candidate@example.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Candidate Full Name
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Scheduled Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Leave empty to start or open the room immediately.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating Room...
                  </>
                ) : (
                  <>
                    <Video className="h-3.5 w-3.5" />
                    Create Video Room
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
              <div className="flex items-center gap-2 text-sky-800 text-xs font-bold mb-1">
                <Sparkles className="h-4 w-4 text-sky-600" />
                Video Room Ready!
              </div>
              <p className="text-xs text-sky-700">
                Send the unique join link to{" "}
                <span className="font-semibold text-sky-900">
                  {createdInterview.candidateProfile?.name || createdInterview.candidateProfile?.email}
                </span>
                . The candidate does not need any login or password.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Candidate Join URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={candidateUrl}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors shrink-0"
                  title="Copy candidate join link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <Link
                href={`/assessments/video/${createdInterview.id}`}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs text-center transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Video className="h-4 w-4" />
                Enter Room Now as Interviewer
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

