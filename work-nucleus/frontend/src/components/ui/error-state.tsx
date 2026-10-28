import React from "react";
import { AlertTriangle, RefreshCw, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  onResetFilters?: () => void;
  onReset?: () => void;
  className?: string;
}

export function ErrorBanner({
  title = "Failed to load data",
  message = "A network error occurred or the service is temporarily unavailable. Please try again.",
  onRetry,
  isRetrying = false,
  onResetFilters,
  onReset,
  className,
}: ErrorBannerProps) {
  const handleReset = onResetFilters || onReset;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-rose-950">{title}</h4>
          <p className="text-xs text-rose-700/90 leading-relaxed max-w-xl">
            {message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {handleReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-rose-700 hover:bg-rose-100 hover:text-rose-900"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset filters
          </Button>
        )}
        {onRetry && (
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs gap-1.5"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")}
            />
            {isRetrying ? "Retrying..." : "Try Again"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErrorCard({
  title = "Something went wrong",
  message = "We were unable to retrieve the requested records. Please check your connection and retry.",
  onRetry,
  isRetrying = false,
  onResetFilters,
  className,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/50 to-white shadow-xs max-w-lg mx-auto",
        className,
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-inner">
        <XCircle className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {message}
      </p>

      <div className="flex items-center gap-3">
        {onResetFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="text-xs border-slate-200"
          >
            Clear Filters
          </Button>
        )}
        {onRetry && (
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")}
            />
            {isRetrying ? "Retrying..." : "Retry Request"}
          </Button>
        )}
      </div>
    </div>
  );
}
