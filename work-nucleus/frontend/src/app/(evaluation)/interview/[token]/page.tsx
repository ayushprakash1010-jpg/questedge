"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Video, User, AlertTriangle, Loader2 } from "lucide-react";
import { fetchCandidateVideoRoom, VideoInterviewStatus } from "@/lib/assessment-api";
import { JitsiMeetRoom } from "@/components/assessments/jitsi-meet-room";

export default function CandidateInterviewJoinPage() {
  const params = useParams();
  const token = params.token as string;

  const [roomInfo, setRoomInfo] = useState<{
    id: string;
    roomName: string;
    scheduledAt: string;
    status: VideoInterviewStatus;
    candidateProfile?: { name: string };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetchCandidateVideoRoom(token)
      .then((data) => setRoomInfo(data))
      .catch((err) => setError(err.message || "Failed to load video interview session"))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-3" />
        <p className="text-sm font-medium text-slate-300">Checking interview session credentials...</p>
      </div>
    );
  }

  if (error || !roomInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-800 text-center space-y-4 text-white">
          <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">Interview Link Inactive</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || "This interview link is no longer valid, has been completed, or has expired."}
          </p>
          <Link
            href="/"
            className="inline-block text-xs font-semibold text-sky-400 hover:underline pt-2"
          >
            Return to QuestEdge Home
          </Link>
        </div>
      </div>
    );
  }

  const candidateName = roomInfo.candidateProfile?.name || "Candidate";

  return (
    <div className="h-screen max-h-screen bg-slate-950 flex flex-col text-white overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 shrink-0 bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
            QE
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">QuestEdge Video Interview</h1>
            <p className="text-xs text-slate-400">Candidate: {candidateName}</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Encrypted WebRTC Session
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-4 flex flex-col overflow-hidden min-h-0">
        {!joined ? (
          <div className="max-w-md w-full mx-auto my-auto bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl text-center space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
              <Video className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Ready to join your interview?</h2>
              <p className="text-xs text-slate-400 mt-1">
                Scheduled for {new Date(roomInfo.scheduledAt).toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs text-slate-300 space-y-1.5">
              <div className="font-bold text-white mb-1">Before entering:</div>
              <p>• Grant camera and microphone permissions when prompted</p>
              <p>• Ensure good lighting and minimal background noise</p>
              <p>• No external app or login is required</p>
            </div>

            <button
              onClick={() => setJoined(true)}
              className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Video className="h-4 w-4" />
              Join Interview Room
            </button>
          </div>
        ) : (
          <div className="flex-1 w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl min-h-0 flex flex-col">
            <JitsiMeetRoom
              roomName={roomInfo.roomName}
              displayName={candidateName}
              isAdmin={false}
              onLeave={() => setJoined(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

