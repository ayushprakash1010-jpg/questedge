"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, Phone, ExternalLink, GraduationCap, Award, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateApplication {
  id: string;
  isReferral?: boolean;
  referralId?: string;
  aiMatchScore?: number;
  candidateProfile: { name: string; email: string; headline: string; experienceYears: string | number };
  referral?: { recruiter: { name: string }; status?: string };
  currentStage: { id: string; name: string; stageOrder: number };
}

interface PipelineKanbanProps {
  mandateId: string;
}

const DEFAULT_STAGES = [
  { id: "sourced", name: "Sourced", stageOrder: 1 },
  { id: "screening", name: "Screening", stageOrder: 2 },
  { id: "shortlisted", name: "Shortlisted", stageOrder: 3 },
  { id: "interview", name: "Interview", stageOrder: 4 },
  { id: "offer", name: "Offer / Hired", stageOrder: 5 },
];

export function PipelineKanban({ mandateId }: PipelineKanbanProps) {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [stages, setStages] = useState<{id: string, name: string, stageOrder: number}[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);

  // For native HTML5 DnD
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

  useEffect(() => {
    fetchPipeline();
  }, [mandateId]);

  const fetchPipeline = async () => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/v1/mandates/${mandateId}/pipeline`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
      
      // Ensure all default stages are always shown, and append any custom stages
      const stageMap = new Map<string, { id: string; name: string; stageOrder: number }>();
      DEFAULT_STAGES.forEach((s) => stageMap.set(s.id, s));
      if (Array.isArray(data)) {
        data.forEach((app: any) => {
          if (app.currentStage && !stageMap.has(app.currentStage.id)) {
            stageMap.set(app.currentStage.id, app.currentStage);
          }
        });
      }
      const sortedStages = Array.from(stageMap.values()).sort((a, b) => a.stageOrder - b.stageOrder);
      setStages(sortedStages);
    } catch (err) {
      console.error("Failed to fetch pipeline", err);
      setStages(DEFAULT_STAGES);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    setDraggedAppId(appId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedAppId) return;

    const draggedItem = applications.find(a => a.id === draggedAppId);

    // Optimistic UI update
    setApplications(prev => prev.map(app => 
      app.id === draggedAppId 
        ? { ...app, currentStage: (stages.find(s => s.id === targetStageId) || DEFAULT_STAGES.find(s => s.id === targetStageId) || app.currentStage) as any } 
        : app
    ));

    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      if (draggedItem?.isReferral || draggedItem?.referral) {
        // Map targetStageId to Referral status
        const stageToStatusMap: Record<string, string> = {
          sourced: "ACTIVATED",
          screening: "UNDER_REVIEW",
          shortlisted: "SHORTLISTED",
          interview: "INTERVIEW",
          offer: "HIRED",
        };
        const newStatus = stageToStatusMap[targetStageId] || "UNDER_REVIEW";
        const referralId = draggedItem.referralId || draggedItem.id;

        await fetch(`${apiUrl}/api/v1/mandates/${mandateId}/referrals/${referralId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
      } else {
        await fetch(`${apiUrl}/api/v1/applications/${draggedAppId}/move`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ targetStageId })
        });
      }
    } catch (err) {
      console.error("Failed to move candidate", err);
      fetchPipeline(); // Revert on failure
    }
    setDraggedAppId(null);
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sky-500" /></div>;

  return (
    <div className="space-y-3">
      {applications.length === 0 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
          <span>No candidates actively moved to stages yet. Candidates accepted from the <strong>Referral Inbox</strong> will populate here.</span>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {stages.map((stage) => {
          const stageApps = applications.filter(a => a.currentStage?.id === stage.id);
          
          return (
            <div 
              key={stage.id} 
              className="flex-shrink-0 w-72 bg-slate-50 rounded-xl border border-slate-200 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100/60 rounded-t-xl">
                <h3 className="font-semibold text-slate-800 text-sm">{stage.name}</h3>
                <span className="bg-white text-slate-600 font-semibold text-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                  {stageApps.length}
                </span>
              </div>
              
              <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
                {stageApps.length === 0 ? (
                  <div className="h-28 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-center p-3">
                    <p className="text-xs text-slate-400">Drag candidates here</p>
                  </div>
                ) : (
                  stageApps.map(app => (
                    <div 
                      key={app.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      className="bg-white rounded-lg p-3.5 shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="font-bold text-slate-900 text-sm">{app.candidateProfile.name}</h4>
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4" /></button>
                      </div>
                      <p className="text-xs text-slate-500 mb-2.5 line-clamp-2">{app.candidateProfile.headline || 'No headline provided'}</p>
                      
                      {/* Metadata tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          <Award className="h-3 w-3" /> {app.candidateProfile.experienceYears || 0} yrs exp
                        </span>
                        {app.aiMatchScore != null && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            ★ {app.aiMatchScore}% match
                          </span>
                        )}
                        {app.referral?.status && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            {app.referral.status.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      {/* Referral Badge vs Direct App */}
                      <div className="pt-2 border-t border-slate-100">
                        {app.referral ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-full border border-emerald-100">
                            ✨ Referred by {app.referral.recruiter.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md w-full border border-slate-100">
                            Direct Application
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
