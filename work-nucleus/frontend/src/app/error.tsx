"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-sm mb-6">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mb-8 max-w-md text-sm text-slate-500">
        We apologize for the inconvenience. An unexpected error has occurred in the application.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-white border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
        >
          Reload Page
        </button>
        <button
          onClick={() => reset()}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
