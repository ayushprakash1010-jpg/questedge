"use client";

import React, { useState } from "react";
import { Copy, Check, Send, X, ExternalLink, Link2, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";
import { sendAssessmentInvite, HiringAssessment } from "@/lib/assessment-api";

interface InviteModalProps {
  assessment: HiringAssessment;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ assessment, isOpen, onClose }: InviteModalProps) {
  const [candidateId, setCandidateId] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retakeWarning, setRetakeWarning] = useState<{
    score: number;
    percentage: string;
    passed?: boolean;
    completedAt?: string;
    candidateName?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent, allowRetake = false) => {
    if (e) e.preventDefault();

    setIsGenerating(true);
    setError(null);
    setRetakeWarning(null);
    try {
      const payload: any = { allowRetake };
      const trimmed = candidateId.trim();
      if (trimmed) {
        if (trimmed.includes("@")) {
          payload.candidateEmail = trimmed;
        } else if (trimmed.includes("-") && trimmed.length >= 32) {
          payload.candidateId = trimmed;
        } else {
          payload.candidateEmail = trimmed;
        }
      }
      const attempt = await sendAssessmentInvite(assessment.id, payload);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const path = `/assessment/${attempt.accessToken}`;
      setGeneratedLink(`${origin}${path}`);
    } catch (err: any) {
      const msg = err.message || "";
      if (err.alreadyCompleted || msg.toLowerCase().includes("already completed")) {
        setRetakeWarning({
          score: err.score ?? 0,
          percentage: err.percentage ?? "0.0",
          passed: err.passed,
          completedAt: err.completedAt,
          candidateName: err.candidateName,
        });
      } else {
        setError(msg || "Failed to generate assessment link");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Invite Candidate to Assessment</h3>
              <p className="text-xs text-slate-500">{assessment.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!generatedLink ? (
          <form onSubmit={handleGenerate} className="space-y-4">
                        <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Candidate Email or Profile ID
              </label>
              <input
                type="text"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                placeholder="e.g. candidate@example.com or leave blank for instant link"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter a candidate&apos;s email to send an invite, or leave blank to generate an open test link.
              </p>
            </div>

            {retakeWarning && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-900">
                      Candidate Already Completed Assessment
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      This candidate previously submitted this assessment with a score of{" "}
                      <strong>{retakeWarning.score} pts ({retakeWarning.percentage}%)</strong>
                      {retakeWarning.completedAt && (
                        <> on {new Date(retakeWarning.completedAt).toLocaleDateString()}</>
                      )}.
                    </p>
                    <p className="text-[11px] text-amber-700/80">
                      Retakes should only be granted for legitimate issues (e.g. tech failure or power loss).
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => setRetakeWarning(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-amber-100/60 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleGenerate(undefined, true)}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {isGenerating ? "Generating..." : "Allow Retake"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {error}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Direct Link"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Assessment Invite Ready
              </div>
              <p className="text-xs text-emerald-700">
                Share this unique link with the candidate. The evaluation will occur entirely within QuestEdge with tab-switch proctoring.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Candidate Assessment URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <a
                href={generatedLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                Preview candidate page <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
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

