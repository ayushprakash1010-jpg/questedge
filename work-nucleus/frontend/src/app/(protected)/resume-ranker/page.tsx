"use client";

import React, { useState, useRef } from "react";
import {
  Trophy,
  Upload,
  FileText,
  Loader2,
  X,
  Sparkles,
  BarChart3,
  RefreshCw,
  Clipboard,
} from "lucide-react";
import RankedCandidateCard from "@/components/hiring-plans/resume-ranking/RankedCandidateCard";
import WeightCustomizer, {
  DEFAULT_WEIGHTS,
  type ScoringWeights,
} from "@/components/hiring-plans/resume-ranking/WeightCustomizer";

interface ResumeFile {
  id: string;
  name: string;
  text: string;
}

export default function ResumeRankerPage() {
  // JD state
  const [jdText, setJdText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [workModel, setWorkModel] = useState("");

  // Resume state
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Weights
  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_WEIGHTS });

  // Results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  // Handle file upload (read as text)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      if (text.trim().length > 20) {
        setResumes((prev) => [
          ...prev,
          {
            id: `file-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^.]+$/, ""),
            text: text.substring(0, 10000),
          },
        ]);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addPastedResume = () => {
    if (pasteText.trim().length < 30) return;
    setResumes((prev) => [
      ...prev,
      {
        id: `paste-${Date.now()}`,
        name: pasteName.trim() || `Candidate ${prev.length + 1}`,
        text: pasteText.substring(0, 10000),
      },
    ]);
    setPasteText("");
    setPasteName("");
    setPasteMode(false);
  };

  const removeResume = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const weightsTotal = Object.values(weights).reduce((s, v) => s + v, 0);
  const canRank =
    jdText.trim().length >= 20 &&
    resumes.length >= 1 &&
    !loading &&
    weightsTotal === 100;

  const handleRank = async () => {
    setLoading(true);
    setError(null);
    try {
      const isCustom =
        JSON.stringify(weights) !== JSON.stringify(DEFAULT_WEIGHTS);
      const body: any = {
        jdText: jdText.trim(),
        jobTitle: jobTitle.trim() || undefined,
        location: location.trim() || undefined,
        workModel: workModel || undefined,
        resumes: resumes.map((r) => ({
          resumeText: r.text,
          candidateName: r.name,
        })),
      };
      if (isCustom) body.customWeights = weights;

      const res = await fetch("/api/resume-ranking/quick-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ranking failed" }));
        throw new Error(err.message || err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Quick Resume Ranker
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a job description and upload resumes to get instant AI-powered
          fit analysis — no mandate needed.
        </p>
      </div>

      {!results ? (
        <div className="space-y-5">
          {/* JD Input */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Job Description
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Job Title (e.g., Senior React Developer)"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="col-span-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                />
                <input
                  type="text"
                  placeholder="Location (e.g., Bengaluru)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="col-span-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                />
                <select
                  value={workModel}
                  onChange={(e) => setWorkModel(e.target.value)}
                  className="col-span-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none text-gray-600"
                >
                  <option value="">Work Model</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </div>
              <textarea
                placeholder="Paste the full job description here...&#10;&#10;Include responsibilities, requirements, qualifications, skills needed, etc."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y"
              />
              <p className="text-[11px] text-gray-400">
                {jdText.length} characters
                {jdText.length < 20 && jdText.length > 0 && (
                  <span className="text-amber-500 ml-2">
                    Minimum 20 characters required
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-500" />
                Resumes ({resumes.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setPasteMode(!pasteMode)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                >
                  <Clipboard className="w-3 h-3" />
                  Paste Text
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-50"
                >
                  <Upload className="w-3 h-3" />
                  Upload .txt
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.text"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Paste mode */}
              {pasteMode && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 space-y-3">
                  <input
                    type="text"
                    placeholder="Candidate name (optional)"
                    value={pasteName}
                    onChange={(e) => setPasteName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                  />
                  <textarea
                    placeholder="Paste resume content here...&#10;&#10;Include work experience, skills, education, projects, certifications, etc."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-y bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addPastedResume}
                      disabled={pasteText.trim().length < 30}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                        pasteText.trim().length >= 30
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Add Resume
                    </button>
                    <button
                      onClick={() => {
                        setPasteMode(false);
                        setPasteText("");
                        setPasteName("");
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Resume list */}
              {resumes.length > 0 ? (
                <div className="space-y-2">
                  {resumes.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm text-gray-900 truncate font-medium">
                          {r.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {r.text.length.toLocaleString()} chars
                        </span>
                      </div>
                      <button
                        onClick={() => removeResume(r.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    No resumes added yet. Paste resume text or upload .txt files.
                  </p>
                  <p className="text-xs mt-1">
                    You can add up to 10 resumes for comparison.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Weights */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setShowWeights(!showWeights)}
              className="flex items-center gap-2 px-5 py-3 text-xs text-gray-600 hover:text-gray-900 w-full"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Customize Scoring Weights
              <span className="ml-auto text-gray-400">
                {showWeights ? "▲" : "▼"}
              </span>
            </button>
            {showWeights && (
              <div className="px-5 pb-4">
                <WeightCustomizer weights={weights} onChange={setWeights} />
              </div>
            )}
          </div>

          {/* Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRank}
              disabled={!canRank}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                canRank
                  ? "bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing {resumes.length} resume
                  {resumes.length !== 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  Rank {resumes.length} Resume{resumes.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-4">
          {/* Pool Summary */}
          {results.summary && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
              <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4" />
                Analysis Summary
              </h3>
              <p className="text-sm text-gray-700">{results.summary}</p>
              {results.processingTimeMs && (
                <p className="text-[11px] text-gray-500 mt-2">
                  Analyzed in {(results.processingTimeMs / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          )}

          {/* Back button */}
          <button
            onClick={reset}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> New Analysis
          </button>

          {/* Ranked Cards */}
          <div className="space-y-3">
            {(results.rankings || []).map((r: any, i: number) => (
              <RankedCandidateCard
                key={r.candidateId || i}
                candidate={r}
                defaultExpanded={i === 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
