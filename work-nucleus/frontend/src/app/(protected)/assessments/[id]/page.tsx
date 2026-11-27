"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  BarChart3,
  Code2,
  FileQuestion,
  Video,
  CheckCircle2,
  Clock,
  Award,
  Loader2,
  HelpCircle,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  fetchAssessment,
  fetchCodingExecutionStatus,
  addAssessmentQuestion,
  deleteAssessmentQuestion,
  addCodingChallenge,
  deleteCodingChallenge,
  HiringAssessment,
  AssessmentQuestion,
  CodingChallenge,
} from "@/lib/assessment-api";
import { InviteModal } from "@/components/assessments/invite-modal";
import { AiQuestionGeneratorModal } from "@/components/assessments/ai-question-generator-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";

export default function AssessmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [assessment, setAssessment] = useState<HiringAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "question" | "challenge"; itemId: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [codingEnabled, setCodingEnabled] = useState(false);

  // New Question Form state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"MCQ" | "MULTI_SELECT" | "TRUE_FALSE">("MCQ");
  const [options, setOptions] = useState([
    { id: "opt_1", text: "", isCorrect: true },
    { id: "opt_2", text: "", isCorrect: false },
    { id: "opt_3", text: "", isCorrect: false },
    { id: "opt_4", text: "", isCorrect: false },
  ]);
  const [explanation, setExplanation] = useState("");
  const [points, setPoints] = useState(10);

  // New Challenge Form state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [constraints, setConstraints] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [maxScore, setMaxScore] = useState(50);
  const [sampleInput, setSampleInput] = useState("5\n1 2 3 4 5");
  const [sampleOutput, setSampleOutput] = useState("15");
  const [hiddenInput, setHiddenInput] = useState("10\n10 20 30 40 50 60 70 80 90 100");
  const [hiddenOutput, setHiddenOutput] = useState("550");

  const loadAssessment = useCallback(async () => {
    try {
      const data = await fetchAssessment(id);
      setAssessment(data);
    } catch (err) {
      console.error("Failed to load assessment:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAssessment();
    fetchCodingExecutionStatus().then(({ enabled }) => setCodingEnabled(enabled));
  }, [loadAssessment]);

  const handleQuestionTypeChange = (nextType: "MCQ" | "MULTI_SELECT" | "TRUE_FALSE") => {
    if (nextType === "TRUE_FALSE") {
      setOptions([
        { id: "opt_true", text: "True", isCorrect: true },
        { id: "opt_false", text: "False", isCorrect: false },
      ]);
    } else if (questionType === "TRUE_FALSE") {
      setOptions([
        { id: "opt_1", text: "", isCorrect: true },
        { id: "opt_2", text: "", isCorrect: false },
        { id: "opt_3", text: "", isCorrect: false },
        { id: "opt_4", text: "", isCorrect: false },
      ]);
    }
    setQuestionType(nextType);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    try {
      await addAssessmentQuestion(id, {
        text: questionText.trim(),
        type: questionType,
        options,
        explanation: explanation.trim() || undefined,
        points: Number(points),
        category: "General",
        difficulty: "MEDIUM",
        tags: [],
        orderIndex: assessment?.questions?.length || 0,
      });
      setShowQuestionModal(false);
      setQuestionText("");
      setExplanation("");
      await loadAssessment();
    } catch (err: any) {
      toast.error(err.message || "Failed to add question");
    }
  };

  const handleDeleteQuestion = (qId: string) => {
    setDeleteTarget({ kind: "question", itemId: qId });
  };

  const handleAddChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTitle.trim() || !challengeDesc.trim()) return;

    try {
      await addCodingChallenge(id, {
        title: challengeTitle.trim(),
        description: challengeDesc.trim(),
        constraints: constraints.trim() || undefined,
        difficulty,
        maxScore: Number(maxScore),
        timeLimitSeconds: 5,
        supportedLanguages: ["python", "javascript", "java", "cpp"],
        starterCode: {},
        sampleTestCases: [
          { id: "sample_1", input: sampleInput, expectedOutput: sampleOutput },
        ],
        hiddenTestCases: [
          { id: "hidden_1", input: hiddenInput, expectedOutput: hiddenOutput, points: Number(maxScore) },
        ],
        orderIndex: assessment?.codingChallenges?.length || 0,
      });
      setShowChallengeModal(false);
      setChallengeTitle("");
      setChallengeDesc("");
      setConstraints("");
      await loadAssessment();
    } catch (err: any) {
      toast.error(err.message || "Failed to add coding challenge");
    }
  };

  const handleDeleteChallenge = (cId: string) => {
    setDeleteTarget({ kind: "challenge", itemId: cId });
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "question") {
        await deleteAssessmentQuestion(id, deleteTarget.itemId);
        toast.success("Question deleted");
      } else {
        await deleteCodingChallenge(id, deleteTarget.itemId);
        toast.success("Coding challenge deleted");
      }
      setDeleteTarget(null);
      await loadAssessment();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading assessment details...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-900 text-lg">Assessment Not Found</h3>
        <Link href="/assessments" className="mt-4 inline-block text-xs font-semibold text-indigo-600">
          ← Back to Assessments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/assessments/${id}/analytics`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
            Candidate Scorecards ({assessment._count?.attempts || 0})
          </Link>

          <button
            onClick={() => setIsInviteOpen(true)}
            disabled={assessment.type === "CODING" && !codingEnabled}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Invite Candidate
          </button>
        </div>
      </div>

      {/* Header Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                  assessment.type === "CODING"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : assessment.type === "QUIZ"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-sky-50 text-sky-700 border border-sky-200"
                }`}
              >
                {assessment.type === "CODING" && <Code2 className="h-3 w-3" />}
                {assessment.type === "QUIZ" && <FileQuestion className="h-3 w-3" />}
                {assessment.type === "VIDEO_INTERVIEW" && <Video className="h-3 w-3" />}
                {assessment.type}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Mandate: {assessment.mandate?.title || "General / Pool"}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{assessment.title}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{assessment.description}</p>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center shrink-0">
            <div>
              <div className="text-xs text-slate-400 font-semibold">Duration</div>
              <div className="text-base font-bold text-slate-800">{assessment.durationMinutes}m</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <div className="text-xs text-slate-400 font-semibold">Pass Cutoff</div>
              <div className="text-base font-bold text-emerald-600">{assessment.passingPercentage}%</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <div className="text-xs text-slate-400 font-semibold">Total Score</div>
              <div className="text-base font-bold text-slate-800">{assessment.totalPoints} pts</div>
            </div>
          </div>
        </div>
      </div>

      {/* QUIZ SECTION */}
      {assessment.type === "QUIZ" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quiz Questions</h2>
              <p className="text-xs text-slate-500">
                {assessment.questions?.length || 0} questions configured for this assessment
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition-all hover:shadow"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                Generate with AI
              </button>
              <button
                onClick={() => setShowQuestionModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Question
              </button>
            </div>
          </div>

          {assessment.questions?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FileQuestion className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No questions added yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-5">
                Draft questions instantly with Gemini AI or create multiple choice questions manually.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                  Draft Questions with AI
                </button>
                <button
                  onClick={() => setShowQuestionModal(true)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Add Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {assessment.questions?.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600">Q{idx + 1}.</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {q.type}
                        </span>
                        <span className="text-xs text-slate-400">({q.points} pts)</span>
                      </div>
                      <h4 className="font-semibold text-slate-800 text-sm">{q.text}</h4>
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={opt.id || oIdx}
                        className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                          opt.isCorrect
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="h-5 w-5 rounded-full bg-white border flex items-center justify-center font-bold text-[10px] shrink-0">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="truncate">{opt.text}</span>
                        {opt.isCorrect && (
                          <span className="text-[10px] text-emerald-600 font-bold ml-auto shrink-0">
                            ✓ Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CODING SECTION */}
      {assessment.type === "CODING" && (
        <div className="space-y-4">
          {!codingEnabled && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Coding IDE Paused Until Post-Launch</p>
                <p className="text-amber-800 mt-0.5">
                  Code execution compiler credentials (JUDGE0_API_KEY) are not configured for launch yet. Candidate invites and challenge additions are temporarily disabled.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Coding Challenges</h2>
              <p className="text-xs text-slate-500">
                {assessment.codingChallenges?.length || 0} coding challenges configured
              </p>
            </div>
            <button
              onClick={() => setShowChallengeModal(true)}
              disabled={!codingEnabled}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Challenge
            </button>
          </div>

          {assessment.codingChallenges?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Code2 className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No coding problems added yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Add algorithmic challenges with sample and hidden grading test cases.
              </p>
              <button
                onClick={() => setShowChallengeModal(true)}
                disabled={!codingEnabled}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors"
              >
                Add First Challenge
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {assessment.codingChallenges?.map((c, idx) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600">Challenge {idx + 1}.</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {c.difficulty}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({c.maxScore} pts max)
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{c.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteChallenge(c.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete challenge"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                    <span>Sample Tests: {c.sampleTestCases?.length || 0}</span>
                    <span>Hidden Grading Tests: {c.hiddenTestCases?.length || 0}</span>
                    <span>Supported: {c.supportedLanguages?.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIDEO INTERVIEW SECTION */}
      {assessment.type === "VIDEO_INTERVIEW" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
          <Video className="h-9 w-9 text-sky-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Live WebRTC Video Interview Module</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Video interview templates do not require static questions or coding problems. Schedule a 1-on-1 encrypted video room from the Assessments hub or invite a candidate below.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Link
              href="/assessments"
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Go to Video Room Scheduler
            </Link>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
            >
              Invite Candidate
            </button>
          </div>
        </div>
      )}

      {/* QUESTION MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Add Question</h3>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. What is the time complexity of searching in a balanced Binary Search Tree?"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => handleQuestionTypeChange(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="MCQ">Single Choice (MCQ)</option>
                    <option value="MULTI_SELECT">Multiple Select</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Options (Select radio/checkbox to mark correct answer)
                </label>
                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type={questionType === "MULTI_SELECT" ? "checkbox" : "radio"}
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        if (questionType === "MULTI_SELECT") {
                          setOptions((prev) =>
                            prev.map((o, i) =>
                              i === idx ? { ...o, isCorrect: e.target.checked } : o
                            )
                          );
                        } else {
                          setOptions((prev) =>
                            prev.map((o, i) => ({ ...o, isCorrect: i === idx }))
                          );
                        }
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((o, i) =>
                            i === idx ? { ...o, text: e.target.value } : o
                          )
                        )
                      }
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                      readOnly={questionType === "TRUE_FALSE"}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Rationale shown in post-submission review..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHALLENGE MODAL */}
      {showChallengeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Add Coding Challenge</h3>
            <form onSubmit={handleAddChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  required
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder="e.g. Invert a Binary Tree or Maximum Subarray Sum"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Score (Points)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Problem Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={challengeDesc}
                  onChange={(e) => setChallengeDesc(e.target.value)}
                  placeholder="Clearly explain the input format, output format, and algorithmic problem statement..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Constraints
                </label>
                <textarea
                  rows={2}
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="1 <= N <= 10^5, -10^9 <= A[i] <= 10^9"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                />
              </div>

              {/* Sample Test Case */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sample Test Input
                  </label>
                  <textarea
                    rows={2}
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sample Test Expected Output
                  </label>
                  <textarea
                    rows={2}
                    value={sampleOutput}
                    onChange={(e) => setSampleOutput(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              {/* Hidden Grading Test Case */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                    Hidden Grading Test Input
                  </label>
                  <textarea
                    rows={2}
                    value={hiddenInput}
                    onChange={(e) => setHiddenInput(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                    Hidden Expected Output
                  </label>
                  <textarea
                    rows={2}
                    value={hiddenOutput}
                    onChange={(e) => setHiddenOutput(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChallengeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Save Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <InviteModal
          assessment={assessment}
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
        />
      )}

      {/* AI Question Generator Modal */}
      {showAiModal && assessment && (
        <AiQuestionGeneratorModal
          assessment={assessment}
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          onQuestionsAdded={() => {
            loadAssessment();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteItem}
        variant="danger"
        title={deleteTarget?.kind === "challenge" ? "Delete coding challenge?" : "Delete question?"}
        description="This item will be permanently removed from the assessment."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}

