"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { AlertTriangle, Maximize2, ShieldAlert } from "lucide-react";
import { updateCandidateAntiCheat } from "@/lib/assessment-api";

interface AntiCheatWrapperProps {
  token: string;
  children: React.ReactNode;
  maxTabSwitches?: number;
  onExceededViolations?: () => void;
}

export function AntiCheatWrapper({
  token,
  children,
  maxTabSwitches = 5,
  onExceededViolations,
}: AntiCheatWrapperProps) {
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const isEnforcingFullscreen = useRef(false);

  const reportViolation = useCallback(
    async (switches: number, exits: number) => {
      try {
        await updateCandidateAntiCheat(token, {
          tabSwitchCount: switches,
          fullscreenExits: exits,
        });
      } catch (err) {
        console.error("Failed to report anti-cheat metrics", err);
      }
    },
    [token]
  );

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const updated = prev + 1;
          setWarningMessage(
            `Tab switch detected (${updated}/${maxTabSwitches}). Please remain on this tab. Excessive tab switches will automatically flag or disqualify your attempt.`
          );
          setShowWarning(true);
          reportViolation(updated, fullscreenExits);

          if (updated >= maxTabSwitches && onExceededViolations) {
            onExceededViolations();
          }
          return updated;
        });
      }
    };

    const handleWindowBlur = () => {
      // Also catch window focus loss
      if (!document.hidden) {
        setTabSwitches((prev) => {
          const updated = prev + 1;
          setWarningMessage(
            `Window focus lost (${updated}/${maxTabSwitches}). Please keep your assessment in focus.`
          );
          setShowWarning(true);
          reportViolation(updated, fullscreenExits);
          return updated;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [fullscreenExits, maxTabSwitches, onExceededViolations, reportViolation]);

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isEnforcingFullscreen.current) {
        setFullscreenExits((prev) => {
          const updated = prev + 1;
          setWarningMessage(
            `Fullscreen mode exited (${updated} times). Please maintain fullscreen mode during the evaluation.`
          );
          setShowWarning(true);
          reportViolation(tabSwitches, updated);
          return updated;
        });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [reportViolation, tabSwitches]);

  // Prevent right click and copy-paste shortcuts during test
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const preventKeys = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+V, F12, Inspect Element
      if (
        (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "u")) ||
        e.key === "F12"
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("keydown", preventKeys);

    return () => {
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("keydown", preventKeys);
    };
  }, []);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        isEnforcingFullscreen.current = true;
        setShowWarning(false);
      }
    } catch (e) {
      console.warn("Fullscreen request denied or not supported:", e);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 select-none">
      {/* Top Warning Banner if any flags */}
      {(tabSwitches > 0 || fullscreenExits > 0) && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>
              Proctoring Active: Tab switches: {tabSwitches}/{maxTabSwitches} | Fullscreen exits: {fullscreenExits}
            </span>
          </div>
          <button
            onClick={requestFullscreen}
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 px-2.5 py-0.5 rounded text-xs transition-colors"
          >
            <Maximize2 className="h-3 w-3" />
            Enable Fullscreen
          </button>
        </div>
      )}

      {/* Warning Modal Alert */}
      {showWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Anti-Cheat Alert</h3>
                <p className="text-xs text-slate-500">Activity logged by QuestEdge proctoring</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-5 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-100">
              {warningMessage}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowWarning(false);
                  requestFullscreen();
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors shadow-sm"
              >
                I Understand & Continue Test
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

