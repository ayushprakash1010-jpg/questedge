import * as React from "react";
import { cn } from "@/lib/utils";

// v2 progress — see design-system-v2/CLAUDE.md §4 (Progress).
// Default fill is the v2 brand gradient (indigo → cyan); `variant="amber"`
// is reserved for at-risk/behind progress per `preview/components.html`.
type ProgressVariant = "default" | "amber";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: ProgressVariant;
}

const fillClass: Record<ProgressVariant, string> = {
  default: "from-indigo-500 to-cyan-500",
  amber: "from-amber-500 to-amber-600",
};

function Progress({
  className,
  value = 0,
  max = 100,
  variant = "default",
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
          fillClass[variant]
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { Progress };
