"use client";

import { useState, useEffect } from "react";
import { getRewardAuditTrail } from "@/lib/marketplace-api";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Hash,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
} from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface RewardAuditModalProps {
  rewardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RewardAuditModal({
  rewardId,
  isOpen,
  onClose,
}: RewardAuditModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useFocusTrap({
    isOpen,
    onClose,
  });


  useEffect(() => {
    if (!isOpen || !rewardId) return;

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const trail = await getRewardAuditTrail(accessToken, rewardId);
        if (isMounted) setData(trail);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load cryptographic audit trail.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, rewardId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="audit-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                Immutable Audit Trail & Cryptographic Proof
              </h2>
              <p className="text-xs text-slate-500">
                SOC 2 SC-12 Tamper-Evident SHA-256 Ledger
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-500">
                Verifying cryptographic hash chain & fetching logs...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Error</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Cryptographic Tamper-Evidence Status Card */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  data.securityChain?.chainIntact
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-red-50/70 border-red-200 text-red-900"
                }`}
              >
                <div className="flex items-start gap-3">
                  {data.securityChain?.chainIntact ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {data.securityChain?.chainIntact
                        ? "Cryptographic Chain Verified Intact"
                        : "Integrity Anomaly Detected"}
                    </h3>
                    <p className="text-xs mt-0.5 opacity-90">
                      {data.securityChain?.chainIntact
                        ? `All ${data.securityChain.totalOrgBlocksVerified} cryptographic security blocks sequentially verified with zero tampering detected.`
                        : "Cryptographic hash chain mismatch. Tamper alert triggered."}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-1 rounded-md uppercase font-bold tracking-wider ${
                    data.securityChain?.chainIntact
                      ? "bg-emerald-200/60 text-emerald-800"
                      : "bg-red-200/60 text-red-800"
                  }`}
                >
                  SHA-256 Validated
                </span>
              </div>

              {/* Reward Snapshot */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Amount</span>
                  <span className="font-bold text-slate-800 text-sm">
                    ₹{Number(data.rewardAmount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Status</span>
                  <span
                    className={`inline-block font-semibold px-2 py-0.5 rounded text-[10px] ${
                      data.status === "PAID" || data.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : data.status === "DISPUTED"
                        ? "bg-amber-100 text-amber-800"
                        : data.status === "CANCELLED"
                        ? "bg-red-100 text-red-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {data.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Recruiter</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {data.recruiterName || "Recruiter"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Candidate</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {data.candidateName || "Candidate"}
                  </span>
                </div>
              </div>

              {/* Active Dispute Details (if any) */}
              {data.dispute && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Dispute Case: {data.dispute.reason}
                    </span>
                    <span className="font-semibold bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px]">
                      {data.dispute.status}
                    </span>
                  </div>
                  <p className="text-amber-800">{data.dispute.details}</p>
                  {data.dispute.evidenceUrls?.length > 0 && (
                    <div className="pt-1">
                      <span className="text-amber-700 font-medium">Evidence Documents: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {data.dispute.evidenceUrls.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-amber-900 underline hover:text-amber-700"
                          >
                            <FileText className="w-3 h-3" /> Proof #{i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.dispute.resolution && (
                    <div className="mt-2 pt-2 border-t border-amber-200 text-amber-900 bg-white/60 p-2.5 rounded-lg">
                      <span className="font-bold text-emerald-800 block">
                        Resolution: {data.dispute.resolution.decision}
                      </span>
                      <p className="mt-0.5">{data.dispute.resolution.resolutionNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chronological Event History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Chronological Transaction Log
                </h4>
                {data.history?.length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {data.history.map((ev: any, idx: number) => (
                      <div key={idx} className="relative text-xs">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-slate-800">
                            {ev.action?.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {ev.reason && (
                          <p className="text-slate-500 mt-0.5">
                            Reason: {ev.reason}
                          </p>
                        )}
                        {ev.decision && (
                          <p className="text-emerald-700 font-medium mt-0.5">
                            Decision: {ev.decision}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No custom dispute history recorded.
                  </p>
                )}
              </div>

              {/* Cryptographic Hash Blocks */}
              {data.securityChain?.entries?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Cryptographic Ledger Hash Blocks
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.securityChain.entries.map((b: any) => (
                      <div
                        key={b.id}
                        className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[10px] space-y-1"
                      >
                        <div className="flex items-center justify-between text-indigo-400">
                          <span>{b.payload?.action || b.eventType}</span>
                          <span className="text-slate-500">
                            {new Date(b.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="truncate text-emerald-400">
                          hash: {b.hash}
                        </div>
                        <div className="truncate text-slate-500">
                          prev: {b.prevHash || "0000000000000000000000000000000000000000000000000000000000000000"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
