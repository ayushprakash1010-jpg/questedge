"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, VideoOff } from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiMeetRoomProps {
  roomName: string;
  displayName: string;
  onLeave?: () => void;
  isAdmin?: boolean;
}

export function JitsiMeetRoom({
  roomName,
  displayName,
  onLeave,
  isAdmin = false,
}: JitsiMeetRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scriptLoaded = false;
    let isCancelled = false;

    const loadScript = () => {
      const existingScript = document.getElementById("jitsi-external-api-script") as HTMLScriptElement | null;
      if (existingScript && existingScript.src.includes("meet.ffmuc.net")) {
        if (window.JitsiMeetExternalAPI) {
          initJitsi();
        } else {
          existingScript.addEventListener("load", initJitsi);
        }
        return;
      }
      if (existingScript) {
        existingScript.remove();
        delete (window as any).JitsiMeetExternalAPI;
      }

      const script = document.createElement("script");
      script.id = "jitsi-external-api-script";
      script.src = "https://meet.ffmuc.net/external_api.js";
      script.async = true;
      script.onload = () => {
        if (!isCancelled) initJitsi();
      };
      script.onerror = () => {
        if (!isCancelled) {
          setError("Failed to load video conferencing library. Please verify your internet connection.");
          setLoading(false);
        }
      };
      document.body.appendChild(script);
    };

    const initJitsi = () => {
      if (!containerRef.current || apiRef.current || isCancelled) return;

      try {
        const domain = "meet.ffmuc.net";
        const options = {
          roomName: `QuestEdge_${roomName}`,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          userInfo: {
            displayName: displayName || (isAdmin ? "Interviewer" : "Candidate"),
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            prejoinConfig: {
              enabled: false,
            },
            enableWelcomePage: false,
            enableClosePage: false,
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: "#0f172a",
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "closedcaptions",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "chat",
              "settings",
              "raisehand",
              "videoquality",
              "tileview",
            ],
          },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        // Dismiss loading overlay as soon as the iframe is ready or user joins
        const dismissLoader = () => {
          if (!isCancelled) setLoading(false);
        };

        const iframe = containerRef.current.querySelector("iframe");
        if (iframe) {
          iframe.addEventListener("load", dismissLoader);
        }

        api.addEventListener("videoConferenceJoined", dismissLoader);
        api.addEventListener("participantJoined", dismissLoader);

        // Fallback safety timeout so the spinner never blocks the video feed
        setTimeout(dismissLoader, 1500);

        api.addEventListener("readyToClose", () => {
          if (onLeave) onLeave();
        });
      } catch (err: any) {
        console.error("Jitsi init error:", err);
        setError("Unable to initialize video session: " + err.message);
        setLoading(false);
      }
    };

    loadScript();

    return () => {
      isCancelled = true;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [displayName, isAdmin, onLeave, roomName]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 rounded-2xl overflow-hidden shadow-inner">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 pointer-events-none z-10 text-white space-y-3 transition-opacity">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-300">Connecting to secure video session...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 text-white p-6 text-center space-y-3">
          <VideoOff className="h-10 w-10 text-rose-500" />
          <h4 className="font-bold text-lg">Video Connection Error</h4>
          <p className="text-sm text-slate-400 max-w-sm">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full min-h-[500px]" />
    </div>
  );
}

