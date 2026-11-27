"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { readResponseError } from "@/lib/api";

export interface EligibleApplicationOption {
  id: string;
  candidate: { id: string; name: string; email: string };
  hiringPlan: { id: string; title: string; designation: string; department: string };
  decision?: {
    id: string;
    decision: string;
    offerCtc: string | null;
    offerDesignation: string | null;
    joiningDate: string | null;
  } | null;
}

export interface OfferTemplateOption {
  id: string;
  name: string;
  version: number;
  isActive?: boolean;
}

interface CreateOfferDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (offerId: string) => void;
  preselectedApplicationId?: string;
}

export function CreateOfferDialog({
  open,
  onClose,
  onCreated,
  preselectedApplicationId,
}: CreateOfferDialogProps) {
  const [applications, setApplications] = useState<EligibleApplicationOption[]>([]);
  const [templates, setTemplates] = useState<OfferTemplateOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicationId, setApplicationId] = useState(preselectedApplicationId || "");
  const [templateId, setTemplateId] = useState("");
  const [fixedAnnual, setFixedAnnual] = useState("");
  const [variableAnnual, setVariableAnnual] = useState("0");
  const [joiningBonus, setJoiningBonus] = useState("0");
  const [currency, setCurrency] = useState("INR");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/v2/offers/eligible-applications").then(async (r) => {
        if (!r.ok) throw new Error(await readResponseError(r, "Failed to load selected candidates"));
        return r.json();
      }),
      fetch("/api/v2/offer-templates?activeOnly=true").then(async (r) => {
        if (!r.ok) throw new Error(await readResponseError(r, "Failed to load offer templates"));
        return r.json();
      }),
    ])
      .then(([apps, tmpls]) => {
        if (cancelled) return;
        const appList: EligibleApplicationOption[] = Array.isArray(apps) ? apps : [];
        const tmplList: OfferTemplateOption[] = Array.isArray(tmpls) ? tmpls : [];
        setApplications(appList);
        setTemplates(tmplList);

        const targetAppId = preselectedApplicationId || appList[0]?.id || "";
        setApplicationId(targetAppId);
        const matched = appList.find((a) => a.id === targetAppId);
        if (matched?.decision?.offerCtc) {
          setFixedAnnual(String(matched.decision.offerCtc));
        }
        if (tmplList[0]?.id) {
          setTemplateId(tmplList[0].id);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize offer form");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, preselectedApplicationId]);

  const handleSelectApplication = (nextId: string) => {
    setApplicationId(nextId);
    const matched = applications.find((a) => a.id === nextId);
    if (matched?.decision?.offerCtc) {
      setFixedAnnual(String(matched.decision.offerCtc));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId || !templateId) return;
    const fixedNum = Number(fixedAnnual);
    if (Number.isNaN(fixedNum) || fixedNum < 0) {
      setError("Fixed annual CTC must be a valid non-negative number.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        applicationId,
        templateId,
        compensation: {
          fixedAnnual: fixedNum,
          variableAnnual: Math.max(0, Number(variableAnnual) || 0),
          joiningBonus: Math.max(0, Number(joiningBonus) || 0),
          currency: currency || "INR",
        },
      };
      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString();
      }

      const res = await fetch("/api/v2/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await readResponseError(res, "Failed to create draft offer"));
      }
      const created = await res.json();
      toast.success("Draft offer created");
      onCreated(created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create draft offer";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Create Draft Offer</h2>
              <p className="text-xs text-slate-500">Issue an offer package for a selected candidate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close create offer modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              Loading selected candidates and offer templates...
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selected Candidate *
                </label>
                {applications.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No unselected-offer applications in SELECTED state. Mark a candidate SELECTED in Hiring Plans first.
                  </p>
                ) : (
                  <Select
                    value={applicationId}
                    onChange={(e) => handleSelectApplication(e.target.value)}
                    disabled={!!preselectedApplicationId && applications.some((a) => a.id === preselectedApplicationId)}
                  >
                    <option value="">Select candidate application...</option>
                    {applications.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.candidate.name} — {a.hiringPlan.designation || a.hiringPlan.title}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Offer Template *
                  </label>
                  <Link href="/offers/templates" className="text-[11px] text-indigo-600 hover:underline">
                    Manage Templates
                  </Link>
                </div>
                {templates.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
                    <span>No active offer templates exist yet.</span>
                    <Link href="/offers/templates" className="font-semibold underline shrink-0">
                      Create Template
                    </Link>
                  </div>
                ) : (
                  <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    <option value="">Select offer template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (v{t.version})
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fixed Annual CTC *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 1800000"
                    value={fixedAnnual}
                    onChange={(e) => setFixedAnnual(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Variable Annual
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={variableAnnual}
                    onChange={(e) => setVariableAnnual(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Joining Bonus
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={joiningBonus}
                    onChange={(e) => setJoiningBonus(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Offer Expiry Date (optional)
                </label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-52"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || submitting || !applicationId || !templateId || !fixedAnnual}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Draft Offer"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
