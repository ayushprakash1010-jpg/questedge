"use client";

import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Loader2, Trophy, Settings2, Users } from "lucide-react";
import WeightCustomizer, { DEFAULT_WEIGHTS, type ScoringWeights } from "./WeightCustomizer";

interface CandidateOption {
  id: string;
  name: string;
  email: string;
  source: string;
  hasResume: boolean;
  hasProfileData?: boolean;
}

interface RankingTriggerProps {
  mandateId: string;
  candidates: CandidateOption[];
  onRankingComplete: (data: any) => void;
}

export default function RankingTrigger({
  mandateId,
  candidates,
  onRankingComplete,
}: RankingTriggerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_WEIGHTS });
  const [error, setError] = useState<string | null>(null);

  const selectable = candidates.filter((c) => c.hasResume || c.hasProfileData);
  const allSelected = selectable.length > 0 && selectable.every((c) => selected.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable.map((c) => c.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const weightsTotal = Object.values(weights).reduce((s, v) => s + v, 0);
  const canRank = selected.size >= 1 && !loading && weightsTotal === 100;

  const handleRank = async () => {
    setLoading(true);
    setError(null);
    try {
      const isCustom = JSON.stringify(weights) !== JSON.stringify(DEFAULT_WEIGHTS);
      const body: any = {
        mandateId,
        candidateIds: Array.from(selected),
      };
      if (isCustom) body.customWeights = weights;

      const res = await fetch("/api/resume-ranking/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ranking failed" }));
        throw new Error(err.message || err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      onRankingComplete(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Select Candidates to Rank
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Choose candidates with uploaded resumes or profile data to rank against this mandate&apos;s JD.
        </p>
      </div>

      {/* Select all */}
      <div className="px-5 py-2 border-b border-gray-50 flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">
            Select all candidates ({selectable.length})
          </span>
        </label>
        <span className="text-xs text-gray-400">
          {selected.size} selected
        </span>
      </div>

      {/* Candidate list */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
        {candidates.map((c) => (
          <label
            key={c.id}
            className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
              !c.hasResume && !c.hasProfileData ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              disabled={!c.hasResume && !c.hasProfileData}
              onChange={() => toggle(c.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-900 truncate block">
                {c.name}
              </span>
              <span className="text-[11px] text-gray-500">{c.email}</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                c.source === "REFERRAL"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {c.source}
            </span>
            {c.hasResume ? (
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
            ) : c.hasProfileData ? (
              <Users className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <span className="text-[10px] text-gray-400">No data</span>
            )}
          </label>
        ))}
        {candidates.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No candidates found for this mandate.
          </div>
        )}
      </div>

      {/* Custom weights toggle */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowWeights(!showWeights)}
          className="flex items-center gap-2 px-5 py-2.5 text-xs text-gray-600 hover:text-gray-900 w-full"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Customize Scoring Weights
          {showWeights ? (
            <ChevronUp className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-auto" />
          )}
        </button>
        {showWeights && (
          <div className="px-5 pb-4">
            <WeightCustomizer weights={weights} onChange={setWeights} />
          </div>
        )}
      </div>

      {/* Action */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={handleRank}
          disabled={!canRank}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            canRank
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing {selected.size} resumes...
            </>
          ) : (
            <>
              <Trophy className="w-4 h-4" />
              Rank {selected.size} Resumes
            </>
          )}
        </button>
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}

export type { CandidateOption };
