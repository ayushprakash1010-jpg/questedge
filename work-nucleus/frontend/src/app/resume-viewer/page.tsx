"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Download, ExternalLink, X, FileText, AlertCircle } from "lucide-react";

function ResumeViewerContent() {
  const searchParams = useSearchParams();
  const candidateId = searchParams.get("candidateId");
  const isMyResume = searchParams.get("myResume") === "true";
  const rawName = searchParams.get("name") || "Candidate";
  const cleanName = rawName.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "Candidate";

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Set browser tab title dynamically so it never shows "(anonymous)"
    document.title = `${rawName} - Resume | QuestEdge`;
  }, [rawName]);

  const loadResumeUrl = async () => {
    try {
      setLoading(true);
      setError(null);

      const tokenRes = await fetch("/api/auth/token");
      if (!tokenRes.ok) {
        throw new Error("Authentication required. Please sign in.");
      }
      const { accessToken } = await tokenRes.json();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

      const endpoint = isMyResume
        ? `${apiUrl}/api/v1/candidate/profile/my/resume`
        : `${apiUrl}/api/v1/candidate/profile/${candidateId}/resume`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You do not have permission to view this resume.");
        }
        if (res.status === 404) {
          throw new Error("No resume has been uploaded for this candidate.");
        }
        throw new Error("Failed to load resume. Please try again.");
      }

      const data = await res.json();
      if (!data.url) {
        throw new Error("Invalid resume document URL received.");
      }

      setPdfUrl(data.url);
    } catch (err: any) {
      console.error("Failed to load resume", err);
      setError(err?.message || "Failed to load candidate resume.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId || isMyResume) {
      loadResumeUrl();
    } else {
      setError("No candidate identifier specified.");
      setLoading(false);
    }
  }, [candidateId, isMyResume]);

  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      setIsDownloading(true);
      const res = await fetch(pdfUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed, opening direct link", err);
      window.open(pdfUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* Top Application Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
            Q
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                {rawName}
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                PDF
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {cleanName}_Resume.pdf • QuestEdge Verified
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pdfUrl && (
            <>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm disabled:opacity-60"
                title="Download this resume as a PDF file"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Download</span>
              </button>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 hidden sm:inline-flex"
                title="Open raw storage link"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Raw</span>
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => window.close()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Document Viewport */}
      <main className="flex-1 w-full bg-slate-900 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 z-10">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-medium text-slate-300">
              Loading {rawName}'s resume securely...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="h-12 w-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1">
              Resume Unavailable
            </h2>
            <p className="text-sm text-slate-400 max-w-md mb-4">{error}</p>
            <button
              type="button"
              onClick={loadResumeUrl}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {pdfUrl && !loading && (
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            className="w-full h-full border-0 bg-slate-800"
            title={`${rawName} Resume`}
          />
        )}
      </main>
    </div>
  );
}

export default function ResumeViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <ResumeViewerContent />
    </Suspense>
  );
}
