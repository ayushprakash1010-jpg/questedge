"use client";

export function ExternalJobSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 animate-pulse">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
        <div className="h-7 w-7 rounded-lg bg-slate-100 shrink-0" />
      </div>

      {/* Meta */}
      <div className="flex gap-3 mb-3">
        <div className="h-4 bg-slate-100 rounded w-24" />
        <div className="h-4 bg-slate-100 rounded w-16" />
        <div className="h-4 bg-slate-100 rounded w-20" />
      </div>

      {/* Salary */}
      <div className="h-6 bg-emerald-50 rounded-lg w-32 mb-3" />

      {/* Skills */}
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 bg-slate-100 rounded-md w-14" />
        <div className="h-5 bg-slate-100 rounded-md w-20" />
        <div className="h-5 bg-slate-100 rounded-md w-16" />
        <div className="h-5 bg-slate-100 rounded-md w-12" />
      </div>

      {/* Description */}
      <div className="space-y-1.5 mb-3">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex justify-between">
        <div className="flex gap-2">
          <div className="h-4 bg-slate-100 rounded w-20" />
          <div className="h-4 bg-slate-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function ExternalJobSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ExternalJobSkeleton key={i} />
      ))}
    </div>
  );
}

