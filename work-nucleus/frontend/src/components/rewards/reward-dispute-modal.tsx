"use client";

import { useState } from "react";
import { raiseRewardDispute, DisputePayload } from "@/lib/marketplace-api";
import {
  AlertTriangle,
  X,
  Loader2,
  FileText,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { toast } from "@/components/ui/toaster";

interface RewardDisputeModalProps {
  reward: {
    id: string;
    rewardAmount: number;
    currency?: string;
    candidateName?: string;
    mandateTitle?: string;
    recruiterName?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDisputeRaised: () => void;
}

const REASONS: { value: DisputePayload["reason"]; label: string; description: string }[] = [
  {
    value: "CLAWBACK_EARLY_EXIT",
    label: "Candidate Early Resignation (90-Day Guarantee)",
    description: "Candidate departed or resigned within the contractual retention guarantee window.",
  },
  {
    value: "OWNERSHIP_CONFLICT",
    label: "Candidate Ownership Contention",
    description: "Duplicate referral submission or pre-existing candidate ownership conflict.",
  },
  {
    value: "SALARY_MISMATCH",
    label: "Salary / Reward Base Calculation Mismatch",
    description: "Actual offered CTC differs from mandate percentage calculation.",
  },
  {
    value: "FRAUDULENT_SUBMISSION",
    label: "Unauthorized / Fraudulent Representation",
    description: "Candidate was submitted without consent or misrepresented.",
  },
  {
    value: "OTHER",
    label: "Other Contractual Dispute",
    description: "Other contractual or operational dispute needing mediation.",
  },
];

export function RewardDisputeModal({
  reward,
  isOpen,
  onClose,
  onDisputeRaised,
}: RewardDisputeModalProps) {
  const [reason, setReason] = useState<DisputePayload["reason"]>("CLAWBACK_EARLY_EXIT");
  const [details, setDetails] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const containerRef = useFocusTrap({
    isOpen,
    onClose,
  });


  if (!isOpen || !reward) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim() || details.trim().length < 10) {
      toast.error("Please provide at least 10 characters explaining the dispute.");
      return;
    }

    try {
      setSubmitting(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      await raiseRewardDispute(accessToken, reward.id, {
        reason,
        details: details.trim(),
        evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
      });

      toast.success("Dispute raised successfully. Reward placed under mediation.");
      onDisputeRaised();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to raise dispute. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-700">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="dispute-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Raise Reward Dispute
              </h2>
              <p className="text-xs text-slate-500">
                Formal arbitration & audit log recording
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex justify-between items-center">
            <div>
              <span className="text-slate-400 block font-medium">Bounty Amount</span>
              <span className="font-bold text-slate-900 text-sm">
                ₹{Number(reward.rewardAmount).toLocaleString("en-IN")}
              </span>
            </div>
            {reward.candidateName && (
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Candidate</span>
                <span className="font-semibold text-slate-800">
                  {reward.candidateName}
                </span>
              </div>
            )}
          </div>

          {/* Reason selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Dispute Category
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              {REASONS.find((r) => r.value === reason)?.description}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Dispute Rationale & Background Details *
            </label>
            <textarea
              required
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain the reason for disputing this payout (minimum 10 characters)..."
              className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Evidence URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Supporting Evidence URL (Optional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://storage.example.com/resignation-letter.pdf"
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[10px] text-slate-400">
              Link to resignation letter, candidate email, or ownership trail.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || details.trim().length < 10}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording Dispute...
                </>
              ) : (
                "Submit Formal Dispute"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
