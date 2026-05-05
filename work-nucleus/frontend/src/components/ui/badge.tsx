import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// v2 badge — see design-system-v2/CLAUDE.md §4 (Badges + skill categories).
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-indigo-50 text-indigo-700 border-indigo-100",
        secondary: "bg-slate-100 text-slate-700 border-slate-200",
        destructive: "bg-red-50 text-red-700 border-red-200",
        outline: "border-slate-200 text-slate-600 bg-transparent",
        success: "bg-emerald-50 text-emerald-700 border-emerald-100",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        info: "bg-blue-50 text-blue-700 border-blue-200",
        // Skill categories
        skillTechnical: "bg-blue-50 text-blue-700 border-blue-200",
        skillLeadership: "bg-purple-50 text-purple-700 border-purple-200",
        skillBehavioural: "bg-emerald-50 text-emerald-700 border-emerald-200",
        skillCommunication: "bg-yellow-50 text-yellow-700 border-yellow-200",
        skillDomain: "bg-cyan-50 text-cyan-700 border-cyan-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Hiring-plan / candidate status helper. Maps domain status enums to v2
// badge colors so callers don't repeat the mapping.
export type PlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type CandidateStatus =
  | "ACTIVE"
  | "SELECTED"
  | "REJECTED"
  | "ON_HOLD"
  | "WITHDRAWN";

const planStatusVariant: Record<PlanStatus, BadgeProps["variant"]> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

const candidateStatusVariant: Record<CandidateStatus, BadgeProps["variant"]> = {
  ACTIVE: "info",
  SELECTED: "success",
  REJECTED: "destructive",
  ON_HOLD: "warning",
  WITHDRAWN: "secondary",
};

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: PlanStatus;
}
function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={planStatusVariant[status]} className={className} {...props}>
      {children ?? status}
    </Badge>
  );
}

interface CandidateStatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: CandidateStatus;
}
function CandidateStatusBadge({ status, className, children, ...props }: CandidateStatusBadgeProps) {
  return (
    <Badge variant={candidateStatusVariant[status]} className={className} {...props}>
      {children ?? status.replace("_", " ")}
    </Badge>
  );
}

export { Badge, StatusBadge, CandidateStatusBadge, badgeVariants };
