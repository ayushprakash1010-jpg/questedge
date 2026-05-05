import * as React from "react";
import { cn } from "@/lib/utils";

// v2 empty state — see design-system-v2/preview/components.html (Empty States).
// Render with an icon, a title, optional description, and an optional action.
// Two presets used today: empty-list ("No hiring plans yet" + primary CTA) and
// empty-AI ("No AI insights yet" + ai CTA).
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon,
      iconBg = "bg-indigo-50",
      iconColor = "text-indigo-600",
      title,
      description,
      action,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-slate-200 px-8 py-10 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <div
          className={cn(
            "flex h-13 w-13 items-center justify-center rounded-full",
            iconBg,
            iconColor
          )}
          style={{ height: 52, width: 52 }}
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description ? (
        <p className="text-sm text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
