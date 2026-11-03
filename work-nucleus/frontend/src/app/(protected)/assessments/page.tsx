"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Code2,
  FileQuestion,
  Video,
  Plus,
  Users,
  BarChart3,
  CheckCircle2,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Send,
  Loader2,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";
import {
  fetchAssessments,
  deleteAssessment,
  fetchVideoInterviews,
  HiringAssessment,
  VideoInterview,
  AssessmentType,
} from "@/lib/assessment-api";
import { InviteModal } from "@/components/assessments/invite-modal";

export default function AssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<HiringAssessment[]>([]);
  const [interviews, setInterviews] = useState<VideoInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "QUIZ" | "CODING" | "VIDEO">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForInvite, setSelectedForInvite] = useState<HiringAssessment | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assessList, videoList] = await Promise.all([
        fetchAssessments(),
        fetchVideoInterviews().catch(() => []),
      ]);
      setAssessments(assessList);
      setInterviews(videoList);
    } catch (err) {
      console.error("Failed to load assessments:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    try {
      await deleteAssessment(id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete assessment");
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    const matchesTab =
      activeTab === "ALL" ||
      (activeTab === "QUIZ" && a.type === "QUIZ") ||
      (activeTab === "CODING" && a.type === "CODING") ||
      (activeTab === "VIDEO" && a.type === "VIDEO_INTERVIEW");
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.mandate?.title && a.mandate.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const totalAttempts = assessments.reduce((sum, a) => sum + (a._count?.attempts || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            In-Platform Assessment & Interview Suite
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Zero Bypass Proctoring
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Evaluate engineering, MBA, and general candidates directly within QuestEdge to track full pipeline progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/assessments/create"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Assessment
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Assessments
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{assessments.length}</div>
          <div className="text-xs text-slate-400 mt-1">Quizzes, Coding & Interviews</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Candidate Attempts
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalAttempts}</div>
          <div className="text-xs text-emerald-600 mt-1">Tracked in-platform</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Video Interviews
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Video className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{interviews.length}</div>
          <div className="text-xs text-slate-400 mt-1">Embedded Jitsi Meet rooms</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Platform Retention
            </span>
            <div className="h-8 w-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">100%</div>
          <div className="text-xs text-violet-600 mt-1">Zero bypass / leak prevention</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Modules
          </button>
          <button
            onClick={() => setActiveTab("QUIZ")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "QUIZ"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileQuestion className="h-3.5 w-3.5 text-amber-500" />
            MCQ / Quiz (MBA)
          </button>
          <button
            onClick={() => setActiveTab("CODING")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "CODING"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Code2 className="h-3.5 w-3.5 text-indigo-500" />
            Coding (Eng)
          </button>
          <button
            onClick={() => setActiveTab("VIDEO")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "VIDEO"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Video className="h-3.5 w-3.5 text-sky-500" />
            Video Interview
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or mandate..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium">Loading assessments...</p>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Code2 className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-1">No assessments found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Get started by creating your first in-platform assessment. Candidates will complete it directly on QuestEdge.
          </p>
          <Link
            href="/assessments/create"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Assessment
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Assessment</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Mandate Role</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Pass Cutoff</th>
                  <th className="py-3.5 px-4">Attempts</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {filteredAssessments.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/assessments/${a.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 text-sm">{a.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {a.description || "No description provided"}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          a.type === "CODING"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : a.type === "QUIZ"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {a.type === "CODING" && <Code2 className="h-3 w-3" />}
                        {a.type === "QUIZ" && <FileQuestion className="h-3 w-3" />}
                        {a.type === "VIDEO_INTERVIEW" && <Video className="h-3 w-3" />}
                        {a.type === "VIDEO_INTERVIEW" ? "VIDEO" : a.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      {a.mandate?.title || <span className="text-slate-400 italic">General / Standalone</span>}
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {a.durationMinutes} mins
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-700">
                      <span className="font-semibold">{a.passingPercentage}%</span>
                      <span className="text-slate-400 text-[10px] ml-1">({a.totalPoints} pts)</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {a._count?.attempts || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedForInvite(a)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1"
                          title="Invite Candidate"
                        >
                          <Send className="h-3 w-3" />
                          Invite
                        </button>

                        <Link
                          href={`/assessments/${a.id}/analytics`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="View Scorecards & Analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Link>

                        <button
                          onClick={(e) => handleDelete(a.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Assessment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Video Interviews Section */}
      {interviews.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Video className="h-5 w-5 text-sky-600" />
              Scheduled Video Interview Rooms
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interviews.map((iv) => (
              <div
                key={iv.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                    {iv.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(iv.scheduledAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {iv.candidateProfile?.name || "Candidate"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Interviewer: {iv.interviewer?.name || iv.interviewer?.email}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/assessments/video/${iv.id}`}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-3 rounded-xl text-xs text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Enter Interview Room
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {selectedForInvite && (
        <InviteModal
          assessment={selectedForInvite}
          isOpen={Boolean(selectedForInvite)}
          onClose={() => setSelectedForInvite(null)}
        />
      )}
    </div>
  );
}

