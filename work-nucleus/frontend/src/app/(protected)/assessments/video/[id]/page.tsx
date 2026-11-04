"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Video,
  User,
  Star,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Loader2,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  fetchVideoInterview,
  startVideoInterview,
  endVideoInterview,
  submitVideoInterviewFeedback,
  VideoInterview,
} from "@/lib/assessment-api";
import { JitsiMeetRoom } from "@/components/assessments/jitsi-meet-room";

export default function InterviewerVideoRoomPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [interview, setInterview] = useState<VideoInterview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Scorecard state
  const [technicalScore, setTechnicalScore] = useState(7);
  const [communicationScore, setCommunicationScore] = useState(8);
  const [cultureFitScore, setCultureFitScore] = useState(8);
  const [leadershipScore, setLeadershipScore] = useState(7);
  const [recommendation, setRecommendation] = useState("HIRE");
  const [notes, setNotes] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");

  const loadInterview = useCallback(async () => {
    try {
      const data = await fetchVideoInterview(id);
      setInterview(data);
      if (data.status === "SCHEDULED") {
        await startVideoInterview(id);
      }
    } catch (err) {
      console.error("Failed to load video interview:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  const copyCandidateLink = () => {
    if (!interview) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/interview/${interview.candidateAccessToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFinishInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const overallRating = Math.round(
        (technicalScore + communicationScore + cultureFitScore + leadershipScore) / 4
      );

      await submitVideoInterviewFeedback(id, {
        technicalScore,
        communicationScore,
        cultureFitScore,
        leadershipScore,
        overallRating,
        recommendation,
        notes,
        strengths,
        weaknesses,
      });

      await endVideoInterview(id);
      alert("Interview feedback saved successfully!");
      router.push("/assessments");
    } catch (err: any) {
      alert(err.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Entering video interview suite...</p>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
        <h3 className="font-bold text-slate-900 text-lg">Interview Session Not Found</h3>
        <Link href="/assessments" className="mt-4 inline-block text-xs font-semibold text-indigo-600">
          ← Back to Assessments
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] pb-2 space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/assessments"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Interview Room: {interview.candidateProfile?.name || "Candidate"}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Room ID: {interview.roomName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCandidateLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedLink ? "Link Copied!" : "Copy Candidate Join Link"}
          </button>
        </div>
      </div>

      {/* Split Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left: Jitsi Meet Room (7 cols) */}
        <div className="lg:col-span-7 h-full rounded-2xl overflow-hidden border border-slate-800 shadow-md">
          <JitsiMeetRoom
            roomName={interview.roomName}
            displayName={interview.interviewer?.name || "QuestEdge Interviewer"}
            isAdmin={true}
          />
        </div>

        {/* Right: Candidate Dossier & Evaluation Scorecard (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Live Evaluation Scorecard</h3>
            <p className="text-xs text-slate-500">
              Score the candidate across key dimensions in real time. Notes and scores are saved directly to their pipeline profile.
            </p>
          </div>

          {/* Candidate Quick Profile */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                {interview.candidateProfile?.name}
              </div>
              {interview.application?.aiMatchScore && (
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  AI Fit: {interview.application.aiMatchScore}%
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">{interview.candidateProfile?.email}</div>

            {interview.candidateProfile?.resumeUrl && (
              <a
                href={interview.candidateProfile.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline pt-1 font-semibold"
              >
                <FileText className="h-3.5 w-3.5" /> View Resume
              </a>
            )}
          </div>

          {/* Scoring Form */}
          <form onSubmit={handleFinishInterview} className="space-y-4 text-xs">
            {/* Technical Score Slider */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Technical Competence</span>
                <span className="font-bold text-indigo-600">{technicalScore} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={technicalScore}
                onChange={(e) => setTechnicalScore(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Communication Score Slider */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Communication & Articulation</span>
                <span className="font-bold text-indigo-600">{communicationScore} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={communicationScore}
                onChange={(e) => setCommunicationScore(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Culture Fit Slider */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Culture & Values Alignment</span>
                <span className="font-bold text-indigo-600">{cultureFitScore} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={cultureFitScore}
                onChange={(e) => setCultureFitScore(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Leadership Slider */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Problem Solving & Ownership</span>
                <span className="font-bold text-indigo-600">{leadershipScore} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={leadershipScore}
                onChange={(e) => setLeadershipScore(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Recommendation */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hiring Recommendation
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
              >
                <option value="STRONG_HIRE">⭐ Strong Hire</option>
                <option value="HIRE">✅ Hire</option>
                <option value="LEAN_HIRE">⚖️ Lean Hire</option>
                <option value="LEAN_REJECT">⚠️ Lean Reject</option>
                <option value="REJECT">❌ Reject</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Interviewer Notes & Rationale
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key takeaways, system design depth, behavioral observations..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Key Strengths</label>
                <textarea
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="e.g. Fast problem solver, strong SQL skills"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Areas to Improve</label>
                <textarea
                  rows={2}
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="e.g. Needs deeper caching experience"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Submit Evaluation & Complete Round
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

