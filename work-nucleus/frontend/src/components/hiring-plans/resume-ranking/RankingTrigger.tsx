"use client";

import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Loader2, Trophy, Settings2, Users } from "lucide-react";
import WeightCustomizer, { DEFAULT_WEIGHTS, type ScoringWeights } from "./WeightCustomizer";
import RulesEditor, { DEFAULT_SHORTLISTING_RULES, type ShortlistingRules } from "./ShortlistingRules";
import ScorecardReview, { type ReviewedRequirement } from "./ScorecardReview";
import styles from "./RankingControls.module.css";

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
  lastSettings?: { weights: ScoringWeights; shortlistingRules: Partial<ShortlistingRules> } | null;
  onRankingComplete: (data: any) => void;
}

export default function RankingTrigger({
  mandateId,
  candidates,
  lastSettings,
  onRankingComplete,
}: RankingTriggerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState<ScoringWeights>(lastSettings?.weights || { ...DEFAULT_WEIGHTS });
  const [rules, setRules] = useState<ShortlistingRules>({ ...DEFAULT_SHORTLISTING_RULES, ...lastSettings?.shortlistingRules });
  const [draft, setDraft] = useState<{ key: string; id: string; requirements: ReviewedRequirement[] } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const inputs = { mandateId, customWeights: weights, shortlistingRules: rules };
  const settingsKey = JSON.stringify(inputs);
  const current = draft?.key === settingsKey ? draft : null;
  const invalidate = () => { setDraft(null); setConfirmed(false); };
  const prepare = async () => {
    setDrafting(true);
    setError(null);
    setConfirmed(false);
    try {
      const response = await fetch("/api/resume-ranking/scorecard", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: settingsKey,
      });
      const data = await response.json();
      if (!response.ok || !data.scorecard?.length) throw new Error(data.error?.message || "Could not prepare the scorecard.");
      setDraft({ key: settingsKey, id: data.scorecardId, requirements: data.scorecard });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare the scorecard."); }
    finally { setDrafting(false); }
  };
  const [error, setError] = useState<string | null>(null);

  const MAX_RANKING_BATCH = 50;
  const selectable = candidates.filter((c) => c.hasResume || c.hasProfileData);
  const allSelected =
    selectable.length > 0 &&
    selectable
      .slice(0, MAX_RANKING_BATCH)
      .every((c) => selected.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      setError(null);
    } else {
      const batch = selectable.slice(0, MAX_RANKING_BATCH);
      setSelected(new Set(batch.map((c) => c.id)));
      if (selectable.length > MAX_RANKING_BATCH) {
        setError(
          `Capped selection to the first ${MAX_RANKING_BATCH} candidates (maximum batch size allowed by the ranking engine).`
        );
      } else {
        setError(null);
      }
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
      setError(null);
    } else {
      if (next.size >= MAX_RANKING_BATCH) {
        setError(`You can select at most ${MAX_RANKING_BATCH} candidates per ranking batch.`);
        return;
      }
      next.add(id);
    }
    setSelected(next);
  };

  const weightsTotal = Object.values(weights).reduce((s, v) => s + v, 0);
  const canRank =
    selected.size >= 1 &&
    selected.size <= MAX_RANKING_BATCH &&
    !loading && current && confirmed &&
    weightsTotal === 100;

  const handleRank = async () => {
    if (!canRank || !current) return;
    setLoading(true);
    setError(null);
    try {
      const body: any = {
        ...inputs,
        confirmedScorecardId: current.id,
        candidateIds: Array.from(selected),
      };

      const res = await fetch("/api/resume-ranking/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ranking failed" }));
        if (res.status === 409) invalidate();
        throw new Error(err.error?.message || err.message || "Ranking failed.");
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
            {selectable.length > MAX_RANKING_BATCH
              ? `Select up to ${MAX_RANKING_BATCH} candidates (${Math.min(selectable.length, MAX_RANKING_BATCH)} of ${selectable.length})`
              : `Select all candidates (${selectable.length})`}
          </span>
        </label>
        <span className="text-xs text-gray-400">
          {selected.size}/{MAX_RANKING_BATCH} selected
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
          type="button"
          aria-expanded={showWeights}
          aria-controls={"mandate-ranking-controls-" + mandateId}
          onClick={() => setShowWeights(!showWeights)}
          className="flex items-center gap-2 px-5 py-2.5 text-xs text-gray-600 hover:text-gray-900 w-full"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Ranking weights and shortlisting rules
          {showWeights ? (
            <ChevronUp className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-auto" />
          )}
        </button>
        {showWeights && (
          <div id={"mandate-ranking-controls-" + mandateId} className={styles.layout + " px-5 pb-4"}>
            <div className={styles.panels}>
            <WeightCustomizer weights={weights} onChange={(value) => { invalidate(); setWeights(value); }} />
            <RulesEditor rules={rules} requirements={current?.requirements} onChange={(value) => { invalidate(); setRules(value); }} />
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <section className="px-5 py-4 border-t border-gray-100">
        <h3 className="text-sm font-semibold">Mandate scorecard</h3>
        {current ? <ScorecardReview requirements={current.requirements} confirmed={confirmed} onConfirm={setConfirmed} /> :
          <button type="button" onClick={prepare} disabled={drafting || weightsTotal !== 100} className="mt-2 text-sm text-blue-700 disabled:opacity-50">
            {drafting ? "Preparing scorecard…" : "Review requirements and points"}
          </button>}
      </section>
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
