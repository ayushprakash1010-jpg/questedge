import * as React from "react";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Pipeline kanban card — see design-system-v2/CLAUDE.md §6 (Kanban) and
// design-system-v2/ui-kit/03-Pipeline-Kanban.html. SLA + score badge colors
// come from the v2 helpers below; callers don't need to compute them.

const slaBadgeClass = (days: number, slaMaxDays: number): string => {
  if (slaMaxDays <= 0) return "bg-slate-100 text-slate-600";
  const pct = days / slaMaxDays;
  if (pct < 0.5) return "bg-emerald-50 text-emerald-700";
  if (pct < 1.0) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

const scoreBadgeClass = (score: number): string => {
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
};

export interface CandidateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  role?: string;
  initials?: string;
  avatarUrl?: string;
  score?: number;
  daysInStage: number;
  slaMaxDays: number;
  yearsExperience?: number;
  feedbackCount?: number;
  isDragging?: boolean;
}

export const CandidateCard = React.forwardRef<HTMLDivElement, CandidateCardProps>(
  (
    {
      name,
      role,
      initials,
      avatarUrl,
      score,
      daysInStage,
      slaMaxDays,
      yearsExperience,
      feedbackCount,
      isDragging,
      className,
      ...props
    },
    ref
  ) => {
    const computedInitials =
      initials ??
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
      <div
        ref={ref}
        className={cn(
          "cursor-grab rounded-lg border border-slate-200/70 bg-white p-3 shadow-[var(--shadow-xs)] transition-all duration-150 hover:-translate-y-px hover:border-indigo-200 hover:shadow-md",
          isDragging && "cursor-grabbing opacity-50 shadow-xl",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <Avatar size="sm" className="h-7 w-7 text-[10px]">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
              <AvatarFallback>{computedInitials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                {name}
              </p>
              {role ? (
                <p className="mt-0.5 truncate text-[11px] text-slate-400">{role}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
              slaBadgeClass(daysInStage, slaMaxDays)
            )}
          >
            {daysInStage}d
          </span>
          {typeof score === "number" ? (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                scoreBadgeClass(score)
              )}
            >
              {score}
            </span>
          ) : null}
        </div>

        {(yearsExperience !== undefined || typeof feedbackCount === "number") && (
          <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-2 text-[10px] text-slate-400">
            {yearsExperience !== undefined ? (
              <span>{yearsExperience}y exp</span>
            ) : (
              <span />
            )}
            {typeof feedbackCount === "number" ? (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {feedbackCount}
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  }
);
CandidateCard.displayName = "CandidateCard";

export { slaBadgeClass, scoreBadgeClass };
