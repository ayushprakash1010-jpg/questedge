"use client";

import { useState, useEffect } from "react";
import { getExternalJobClickHistory } from "@/lib/external-jobs-api";
import { CompanyLogo } from "./CompanyLogo";
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";

interface ClickEntry {
  id: string;
  clickedAt: string;
  selfReportedApplied: boolean;
  appliedAt?: string | null;
  externalJob: {
    id: string;
    title: string;
    companyName: string;
    location?: string | null;
    applyUrl: string;
    isActive: boolean;
  };
}

interface ExternalJobHistoryProps {
  getToken: () => Promise<string>;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function ExternalJobHistory({ getToken }: ExternalJobHistoryProps) {
  const [history, setHistory] = useState<ClickEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const result = await getExternalJobClickHistory(token, page, 15);
        setHistory(result.history || []);
        setTotalPages(result.pagination?.totalPages || 1);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <History className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">No activity yet</h3>
        <p className="text-sm text-slate-500 max-w-xs">
          When you click &quot;Apply&quot; on external jobs, your activity will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <CompanyLogo
              companyName={entry.externalJob.companyName}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 truncate">
                  {entry.externalJob.title}
                </h4>
                {!entry.externalJob.isActive && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 rounded font-medium">
                    Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {entry.externalJob.companyName}
                {entry.externalJob.location && ` · ${entry.externalJob.location}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {entry.selfReportedApplied ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Applied
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Visited
              </span>
            )}
            <span className="text-[10px] text-slate-400 w-16 text-right">
              {timeAgo(entry.clickedAt)}
            </span>
            {entry.externalJob.isActive && (
              <a
                href={entry.externalJob.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
                title="Open job"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" /> Prev
          </button>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

