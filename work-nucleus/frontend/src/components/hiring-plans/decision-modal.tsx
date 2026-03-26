"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  X, Check, Ban, Mail, Loader2, Send, Edit3, Eye,
} from "lucide-react";

interface DecisionModalProps {
  applicationId: string;
  candidateName: string;
  roleName: string;
  onDecisionMade: () => void;
  onClose: () => void;
}

interface CommDraft {
  subject: string;
  body: string;
}

export function DecisionModal({
  applicationId,
  candidateName,
  roleName,
  onDecisionMade,
  onClose,
}: DecisionModalProps) {
  const [decision, setDecision] = useState<"SELECTED" | "REJECTED" | null>(null);
  const [offerCtc, setOfferCtc] = useState("");
  const [offerDesignation, setOfferDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commDraft, setCommDraft] = useState<CommDraft | null>(null);
  const [editingComm, setEditingComm] = useState(false);
  const [decisionMade, setDecisionMade] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);

  const handleSubmit = async () => {
    if (!decision) return;
    setSubmitting(true);
    try {
      const body: any = {
        decision,
        decisionNotes: decisionNotes || undefined,
      };
      if (decision === "SELECTED") {
        if (offerCtc) body.offerCtc = parseFloat(offerCtc);
        if (offerDesignation) body.offerDesignation = offerDesignation;
        if (joiningDate) body.joiningDate = joiningDate;
      }

      const res = await fetch(`/api/applications/${applicationId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.communicationDraft) {
          setCommDraft(data.communicationDraft as CommDraft);
        }
        setDecisionMade(true);

        // Poll for communication draft if not immediately available
        if (!data.communicationDraft) {
          setTimeout(async () => {
            const decRes = await fetch(`/api/applications/${applicationId}/decision`);
            if (decRes.ok) {
              const decData = await decRes.json();
              if (decData.communicationDraft) {
                setCommDraft(decData.communicationDraft as CommDraft);
              }
            }
          }, 3000);
        }

        onDecisionMade();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveComm = async () => {
    if (!commDraft) return;
    await fetch(`/api/applications/${applicationId}/decision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(commDraft),
    });
    setEditingComm(false);
  };

  const handleMarkSent = async () => {
    setMarkingSent(true);
    try {
      await fetch(`/api/applications/${applicationId}/decision?action=send`, {
        method: "POST",
      });
      onClose();
    } catch {
      // handle error
    } finally {
      setMarkingSent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {decisionMade ? "Decision Recorded" : "Make Decision"}
            </h2>
            <p className="text-sm text-slate-500">
              {candidateName} &middot; {roleName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {!decisionMade ? (
            <div className="space-y-5">
              {/* Decision Toggle */}
              <div>
                <label className="text-sm font-medium text-slate-700">Decision *</label>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => setDecision("SELECTED")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all",
                      decision === "SELECTED"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-200 text-slate-500 hover:border-green-200"
                    )}
                  >
                    <Check className="h-4 w-4" />
                    Select
                  </button>
                  <button
                    onClick={() => setDecision("REJECTED")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all",
                      decision === "REJECTED"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-slate-200 text-slate-500 hover:border-red-200"
                    )}
                  >
                    <Ban className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Offer Details (only for selection) */}
              {decision === "SELECTED" && (
                <div className="space-y-3 rounded-lg border border-green-100 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">Offer Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-green-700">Offer CTC</label>
                      <Input
                        type="number"
                        placeholder="e.g. 1500000"
                        value={offerCtc}
                        onChange={(e) => setOfferCtc(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-green-700">Designation</label>
                      <Input
                        placeholder="e.g. Senior Engineer"
                        value={offerDesignation}
                        onChange={(e) => setOfferDesignation(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-green-700">Joining Date</label>
                    <Input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="mt-1 w-48"
                    />
                  </div>
                </div>
              )}

              {/* Decision Notes */}
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Textarea
                  className="mt-1"
                  placeholder="Decision notes (optional)..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!decision || submitting}
                  className={cn(
                    decision === "SELECTED" && "bg-green-600 hover:bg-green-700",
                    decision === "REJECTED" && "bg-red-600 hover:bg-red-700"
                  )}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    "Confirm Decision"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Decision Badge */}
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-sm px-3 py-1",
                    decision === "SELECTED"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  )}
                >
                  {decision === "SELECTED" ? "Selected" : "Rejected"}
                </Badge>
                <span className="text-sm text-slate-500">Decision recorded</span>
              </div>

              {/* Communication Preview */}
              {!commDraft ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating communication draft...
                </div>
              ) : (
                <Card className="border-slate-200">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Email Preview</span>
                      </div>
                      <button
                        onClick={() => setEditingComm(!editingComm)}
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {editingComm ? <><Eye className="h-3 w-3" /> Preview</> : <><Edit3 className="h-3 w-3" /> Edit</>}
                      </button>
                    </div>

                    <div className="mt-3">
                      {editingComm ? (
                        <div className="space-y-2">
                          <Input
                            value={commDraft.subject}
                            onChange={(e) => setCommDraft({ ...commDraft, subject: e.target.value })}
                            placeholder="Subject"
                          />
                          <Textarea
                            value={commDraft.body}
                            onChange={(e) => setCommDraft({ ...commDraft, body: e.target.value })}
                            rows={8}
                          />
                          <Button size="sm" variant="outline" onClick={handleSaveComm}>
                            Save Changes
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-slate-500">Subject</p>
                          <p className="text-sm font-medium text-slate-900">{commDraft.subject}</p>
                          <p className="mt-3 text-xs text-slate-500">Body</p>
                          <div className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                            {commDraft.body}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {commDraft && (
                  <Button onClick={handleMarkSent} disabled={markingSent}>
                    <Send className="mr-2 h-4 w-4" />
                    {markingSent ? "Sending..." : "Mark as Sent"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
