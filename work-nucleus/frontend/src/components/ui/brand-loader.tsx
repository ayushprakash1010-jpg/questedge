"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLoaderProps {
  /**
   * Use "icon" for the signature QuestEdge "Q" monogram with upward arrow,
   * or "full" for the full wordmark. Defaults to "icon" (Option 2).
   */
  variant?: "icon" | "full";
  /**
   * Primary status text rendered below the loader.
   */
  message?: string;
  /**
   * Secondary supporting text.
   */
  submessage?: string;
  /**
   * When true, takes over the viewport with a fixed backdrop.
   * When false, fits into any section/card container.
   */
  fullscreen?: boolean;
  className?: string;
}

export function BrandLoader({
  variant = "icon",
  message = "Preparing your workspace...",
  submessage,
  fullscreen = true,
  className,
}: BrandLoaderProps) {
  const isIcon = variant === "icon";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center select-none bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm transition-colors",
        fullscreen
          ? "fixed inset-0 z-50 h-screen w-screen"
          : "h-full min-h-[320px] w-full py-12",
        className
      )}
    >
      <div className="relative flex flex-col items-center px-4">
        {/* Soft emerald radial backlight glow */}
        <div
          className="absolute -inset-6 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 blur-2xl pointer-events-none animate-brand-glow"
          aria-hidden="true"
        />

        {/* Breathing Logo / Monogram (Slido-Style) */}
        <div className="relative z-10 flex items-center justify-center animate-brand-breathe">
          {isIcon ? (
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-lg shadow-emerald-500/5 border border-slate-100 dark:border-slate-800">
              <Image
                src="/logo-icon.png"
                alt="QuestEdge"
                width={64}
                height={64}
                priority
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="relative flex items-center justify-center px-4 py-2">
              <Image
                src="/logo.png"
                alt="QuestEdge"
                width={160}
                height={40}
                priority
                className="h-auto w-36 sm:w-44 object-contain dark:hidden"
              />
              <Image
                src="/logo-white.png"
                alt="QuestEdge"
                width={160}
                height={40}
                priority
                className="h-auto w-36 sm:w-44 object-contain hidden dark:block"
              />
            </div>
          )}
        </div>

        {/* Sleek indeterminate shimmer progress line */}
        <div
          className="relative mt-6 h-1 w-28 sm:w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          aria-hidden="true"
        >
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 animate-brand-indeterminate" />
        </div>

        {/* Status text */}
        {message && (
          <p className="mt-4 text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">
            {message}
          </p>
        )}
        {submessage && (
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 text-center max-w-xs">
            {submessage}
          </p>
        )}

        <span className="sr-only">Loading QuestEdge...</span>
      </div>
    </div>
  );
}

export default BrandLoader;
