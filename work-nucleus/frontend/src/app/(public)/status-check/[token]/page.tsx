"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  Briefcase,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  PartyPopper,
  ThumbsDown,
  Minus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

interface StatusCheckData {
  id: string;
  candidateName: string;
  companyName: string;
  mandateTitle: string;
  question: string;
  hasResponded: boolean;
  response: string | null;
  isExpired: boolean;
  expiresAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ── Status Check Page ─────────────────────────────────────────────

export default function StatusCheckPage() {
  const { token } = useParams<{ token: string }>();

  const [check, setCheck] = useState<StatusCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [details, setDetails] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/candidate-status-check/${token}`);
        if (res.ok) {
          setCheck(await res.json());
        } else {
          const err = await res.json().catch(() => ({}));
          setError(err?.error?.message || "Invalid or expired status check link.");
        }
      } catch {
        setError("Unable to load status check. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedResponse) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/candidate-status-check/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: selectedResponse,
          responseDetails: details || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({ success: true, message: data.message });
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ success: false, message: err?.error?.message || "Failed to submit response." });
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // ── Already responded or expired ──────────────────────────────
  if (check?.hasResponded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Already Responded</h2>
          <p className="text-slate-600">You&apos;ve already submitted your response for this status check. Thank you!</p>
        </div>
      </div>
    );
  }

  if (check?.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Link Expired</h2>
          <p className="text-slate-600">This status check link has expired. If you need to update your status, please contact our support team.</p>
        </div>
      </div>
    );
  }

  // ── Result state ───────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          {result.success ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Thank You!</h2>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Something Went Wrong</h2>
            </>
          )}
          <p className="text-slate-600">{result.message}</p>
        </div>
      </div>
    );
  }

  // ── Main response form ─────────────────────────────────────────
  const responseOptions = [
    {
      value: "HIRED",
      label: "Yes, I was hired!",
      description: "I received and accepted an offer",
      icon: PartyPopper,
      color: "border-green-500 bg-green-50 text-green-800",
      selectedColor: "ring-2 ring-green-500 border-green-500 bg-green-100",
    },
    {
      value: "IN_PROCESS",
      label: "Still in process",
      description: "Interviews or discussions are ongoing",
      icon: Clock,
      color: "border-blue-300 bg-blue-50 text-blue-800",
      selectedColor: "ring-2 ring-blue-500 border-blue-500 bg-blue-100",
    },
    {
      value: "REJECTED",
      label: "Not selected",
      description: "I was not selected for this role",
      icon: ThumbsDown,
      color: "border-slate-300 bg-slate-50 text-slate-700",
      selectedColor: "ring-2 ring-slate-500 border-slate-500 bg-slate-100",
    },
    {
      value: "NOT_INTERESTED",
      label: "No longer interested",
      description: "I withdrew or am no longer pursuing this",
      icon: Minus,
      color: "border-slate-300 bg-slate-50 text-slate-600",
      selectedColor: "ring-2 ring-slate-400 border-slate-400 bg-slate-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 text-white">
            <h1 className="text-xl font-bold">Application Status Check</h1>
            <p className="text-indigo-100 text-sm mt-1">Help us keep your records up to date</p>
          </div>

          <div className="p-6">
            {/* Context */}
            <div className="flex items-start gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
              <Building2 className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-slate-600">
                  Hi <span className="font-semibold text-slate-900">{check?.candidateName}</span>,
                  we&apos;d like to know the status of your application for:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <span className="font-semibold text-slate-900">{check?.mandateTitle}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">at {check?.companyName}</p>
              </div>
            </div>

            {/* Response options */}
            <div className="space-y-3 mb-6">
              {responseOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedResponse === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedResponse(option.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      isSelected ? option.selectedColor : option.color + " hover:shadow-sm"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs opacity-70">{option.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 ml-auto text-current shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Optional details */}
            {selectedResponse && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Any additional details? (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., joined on a specific date, salary details, etc."
                />
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selectedResponse || submitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Response"
              )}
            </button>

            <p className="text-xs text-slate-400 text-center mt-4">
              Your response helps us ensure recruiters are properly rewarded for connecting you with opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
