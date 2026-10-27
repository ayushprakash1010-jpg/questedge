import React from "react";
import { cn } from "@/lib/utils";

// ── Base Shimmer Box ─────────────────────────────────────────────

export function Shimmer({
  className,
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200",
        rounded,
        className,
      )}
    />
  );
}

// ── Card Grid Skeleton ───────────────────────────────────────────

export function CardGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
}) {
  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
      ? "grid-cols-1 md:grid-cols-2"
      : columns === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid gap-6", colClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 p-5 border border-slate-200 bg-white rounded-xl shadow-xs"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-4 w-12" />
              </div>
              <Shimmer className="h-5 w-4/5" />
            </div>
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>

          {/* Meta line */}
          <div className="flex items-center gap-3">
            <Shimmer className="h-3.5 w-20" />
            <Shimmer className="h-3.5 w-16" />
            <Shimmer className="h-3.5 w-24" />
          </div>

          {/* Skill chips */}
          <div className="flex items-center gap-1.5 pt-1">
            <Shimmer className="h-5 w-14 rounded-md" />
            <Shimmer className="h-5 w-16 rounded-md" />
            <Shimmer className="h-5 w-12 rounded-md" />
          </div>

          {/* Footer with reward & button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Shimmer className="h-6 w-28 rounded-full" />
            <Shimmer className="h-7 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Table Skeleton ───────────────────────────────────────────────

export function TableSkeleton({
  rows = 5,
  columns = 5,
  hasAvatar = true,
}: {
  rows?: number;
  columns?: number;
  hasAvatar?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Table Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-4 w-20" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {hasAvatar && <Shimmer className="h-10 w-10 rounded-full shrink-0" />}
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-3 w-48" />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-6">
              <Shimmer className="h-3.5 w-24" />
              <Shimmer className="h-6 w-20 rounded-full" />
            </div>

            <Shimmer className="h-7 w-20 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats Grid Skeleton ──────────────────────────────────────────

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-8 w-8 rounded-xl" />
          </div>
          <Shimmer className="h-8 w-20" />
          <Shimmer className="h-3.5 w-32" />
        </div>
      ))}
    </div>
  );
}

// ── Detail Page Skeleton ─────────────────────────────────────────

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 p-6 space-y-4">
        <Shimmer className="h-4 w-32" />
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <Shimmer className="h-8 w-2/3" />
            <div className="flex gap-3">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-28" />
            </div>
          </div>
          <Shimmer className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3">
            <Shimmer className="h-5 w-32" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-4/5" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3">
            <Shimmer className="h-5 w-24" />
            <div className="flex flex-wrap gap-2">
              <Shimmer className="h-6 w-16 rounded-md" />
              <Shimmer className="h-6 w-20 rounded-md" />
              <Shimmer className="h-6 w-14 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
