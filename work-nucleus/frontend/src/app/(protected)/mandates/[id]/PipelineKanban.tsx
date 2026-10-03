"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, Phone, ExternalLink, GraduationCap, Award, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateApplication {
  id: string;
  candidateProfile: { name: string; email: string; headline: string; experienceYears: string | number };
  referral?: { recruiter: { name: string } };
  currentStage: { id: string; name: string; stageOrder: number };
}

interface PipelineKanbanProps {
  mandateId: string;
}

export function PipelineKanban({ mandateId }: PipelineKanbanProps) {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [stages, setStages] = useState<{id: string, name: string}[]>([]);
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
      const res = await fetch(`/api/v1/mandates/${mandateId}/pipeline`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setApplications(data);
      
      // Extract unique stages
      const uniqueStages = new Map();
      data.forEach((app: any) => {
        if (app.currentStage) {
          uniqueStages.set(app.currentStage.id, app.currentStage);
        }
      });
      // Sort by stageOrder
      const sortedStages = Array.from(uniqueStages.values()).sort((a: any, b: any) => a.stageOrder - b.stageOrder);
      setStages(sortedStages);
    } catch (err) {
      console.error("Failed to fetch pipeline", err);
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

    // Optimistic UI update
    setApplications(prev => prev.map(app => 
      app.id === draggedAppId 
        ? { ...app, currentStage: stages.find(s => s.id === targetStageId) as any } 
        : app
    ));

    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      await fetch(`/api/v1/applications/${draggedAppId}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ targetStageId })
      });
    } catch (err) {
      console.error("Failed to move candidate", err);
      fetchPipeline(); // Revert on failure
    }
    setDraggedAppId(null);
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sky-500" /></div>;

  if (stages.length === 0) return (
    <div className="h-64 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
      <p>No candidates in pipeline yet.</p>
    </div>
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[600px]">
      {stages.map((stage) => {
        const stageApps = applications.filter(a => a.currentStage?.id === stage.id);
        
        return (
          <div 
            key={stage.id} 
            className="flex-shrink-0 w-80 bg-slate-50 rounded-xl border border-slate-200 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100/50 rounded-t-xl">
              <h3 className="font-semibold text-slate-700 text-sm">{stage.name}</h3>
              <span className="bg-white text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">{stageApps.length}</span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {stageApps.map(app => (
                <div 
                  key={app.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, app.id)}
                  className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-sky-300 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 text-sm">{app.candidateProfile.name}</h4>
                    <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4" /></button>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{app.candidateProfile.headline || 'No headline provided'}</p>
                  
                  {/* Metadata tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      <Award className="h-3 w-3" /> {app.candidateProfile.experienceYears || 0} yrs exp
                    </span>
                  </div>

                  {/* Referral Badge vs Direct App */}
                  <div className="pt-3 border-t border-slate-100">
                    {app.referral ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-full border border-emerald-100">
                        ✨ Referred by {app.referral.recruiter.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md w-full border border-slate-100">
                        Direct Application
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
