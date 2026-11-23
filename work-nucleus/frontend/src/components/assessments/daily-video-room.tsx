"use client";

import React, { useState } from "react";
import { Loader2, VideoOff, Maximize2, ShieldCheck, RefreshCw } from "lucide-react";

interface DailyVideoRoomProps {
  roomName?: string;
  roomUrl?: string;
  displayName?: string;
  onLeave?: () => void;
  isAdmin?: boolean;
}

export function DailyVideoRoom({
  roomName,
  roomUrl,
  displayName,
  onLeave,
  isAdmin = false,
}: DailyVideoRoomProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Compute canonical room URL
  const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN || "questedge.daily.co";
  let targetUrl = roomUrl;

  if (!targetUrl && roomName) {
    if (roomName.startsWith("http")) {
      targetUrl = roomName;
    } else {
      const cleanName = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      targetUrl = `https://${dailyDomain}/${cleanName}`;
    }
  }

  if (!targetUrl) {
    targetUrl = `https://${dailyDomain}/questedge-interview`;
  }

  // Pre-fill user name in Daily Prebuilt
  const userParam = displayName || (isAdmin ? "Interviewer" : "Candidate");
  const finalSrc = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}userName=${encodeURIComponent(
    userParam
  )}`;

  return (
    <div className="relative w-full h-full flex-1 min-h-[500px] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex flex-col border border-slate-800">
      {/* Top security & connection indicator */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] text-emerald-400 font-semibold shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          QuestEdge HD Encrypted
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 text-white space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-slate-200">
            Connecting to secure video session...
          </p>
          <p className="text-xs text-slate-400">
            Please allow camera and microphone access when prompted.
          </p>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 text-white p-6 text-center space-y-3">
          <VideoOff className="h-10 w-10 text-rose-500" />
          <h4 className="font-bold text-lg">Unable to Connect Video</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Could not reach the video conferencing server. Please verify your internet connection.
          </p>
          <button
            onClick={() => {
              setHasError(false);
              setLoading(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Connection
          </button>
        </div>
      )}

      {/* Daily.co Prebuilt IFrame */}
      <iframe
        src={finalSrc}
        allow="camera; microphone; autoplay; display-capture; fullscreen"
        allowFullScreen
        onLoad={() => setLoading(false)}
        onError={() => {
          setHasError(true);
          setLoading(false);
        }}
        className="w-full h-full flex-1 border-0 min-h-[500px]"
        title="QuestEdge Video Interview"
      />
    </div>
  );
}
