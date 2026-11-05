"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Code2,
  FileQuestion,
  Clock,
  Award,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ArrowRight,
  User,
  Mail,
  Video,
} from "lucide-react";

interface PublicAssessmentInfo {
  id: string;
  title: string;
  description: string | null;
  type: string;
  durationMinutes: number;
  totalPoints: number;
  passingPercentage: number;
  instructions: string | null;
  _count: { questions: number; codingChallenges: number };
}

export default function PublicAssessmentRegistrationPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;
  const router = useRouter();

  const [info, setInfo] = useState<PublicAssessmentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v2/assessment-take/public/${assessmentId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Assessment not found or no longer available.");
        return res.json();
      })
      .then((data) => setInfo(data))
      .catch((err) => setError(err.message || "Failed to load assessment"))
      .finally(() => setIsLoading(false));
  }, [assessmentId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setRegError("Please enter both your name and email address.");
      return;
    }
    if (!email.includes("@")) {
      setRegError("Please enter a valid email address.");
      return;
    }

    setIsRegistering(true);
    setRegError(null);
    try {
      const res = await fetch(`/api/v2/assessment-take/public/${assessmentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Registration failed. You may have already completed this assessment.");
      }
      const data = await res.json();
      router.push(`/assessment/${data.accessToken}`);
    } catch (err: any) {
      setRegError(err.message || "Failed to register");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 max-w-md w-full text-center shadow-lg">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Assessment Unavailable</h2>
          <p className="text-sm text-slate-500">{error || "This assessment link is no longer active."}</p>
        </div>
      </div>
    );
  }

  const typeIcon = info.type === "CODING" ? <Code2 className="h-5 w-5" /> : info.type === "VIDEO" ? <Video className="h-5 w-5" /> : <FileQuestion className="h-5 w-5" />;
  const typeLabel = info.type === "CODING" ? "Coding Challenge" : info.type === "VIDEO" ? "Video Interview" : "MCQ / Quiz";
  const typeColor = info.type === "CODING" ? "text-blue-600 bg-blue-50 border-blue-200" : info.type === "VIDEO" ? "text-purple-600 bg-purple-50 border-purple-200" : "text-amber-600 bg-amber-50 border-amber-200";

  const itemCount = info.type === "CODING" ? info._count.codingChallenges : info._count.questions;
  const itemLabel = info.type === "CODING" ? "Coding Problems" : "Questions";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">QuestEdge Assessment</h1>
          <p className="text-sm text-slate-400">In-Platform Evaluation Portal</p>
        </div>

        {/* Assessment Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${typeColor}`}>
              {typeIcon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{info.title}</h2>
              {info.description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{info.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div className="text-center p-2.5 bg-slate-50 rounded-xl">
              <Clock className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <span className="text-sm font-bold text-slate-800 block">{info.durationMinutes}m</span>
              <span className="text-[10px] text-slate-400 font-semibold">Duration</span>
            </div>
            <div className="text-center p-2.5 bg-slate-50 rounded-xl">
              <Award className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <span className="text-sm font-bold text-slate-800 block">{info.totalPoints} pts</span>
              <span className="text-[10px] text-slate-400 font-semibold">Total Score</span>
            </div>
            <div className="text-center p-2.5 bg-slate-50 rounded-xl">
              <FileQuestion className="h-4 w-4 text-slate-400 mx-auto mb-1" />
              <span className="text-sm font-bold text-slate-800 block">{itemCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">{itemLabel}</span>
            </div>
          </div>

          {info.instructions && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">📋 Instructions:</span> {info.instructions}
            </div>
          )}
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Enter Your Details to Begin</h3>
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {regError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {regError}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  Proceed to Assessment
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
            By proceeding, you agree to be evaluated under proctored conditions. Tab switching and fullscreen exits are monitored.
          </p>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slate-300 text-center">
          Powered by QuestEdge — In-Platform Assessment Engine
        </p>
      </div>
    </div>
  );
}
