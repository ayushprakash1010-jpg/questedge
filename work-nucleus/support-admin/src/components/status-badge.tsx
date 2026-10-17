import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle, Clock, BadgeCheck, BadgeX } from "lucide-react";

type Variant =
  | "active"
  | "inactive"
  | "verified"
  | "unverified"
  | "ACTIVE"
  | "DRAFT"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED"
  | "PENDING"
  | "ELIGIBLE"
  | "APPROVED"
  | "PAID"
  | "DISPUTED"
  | "SUCCESS"
  | "ERROR"
  | "ADMIN"
  | "HR"
  | "HIRING_MANAGER"
  | "INTERVIEWER"
  | "VIEWER"
  | "SUPPORT_REP"
  | "SUPPORT_ADMIN"
  | string;

interface StatusBadgeProps {
  value: Variant;
  /** Optional explicit label — defaults to the value itself (title-cased) */
  label?: string;
  className?: string;
}

const presets: Record<string, { classes: string; icon?: React.ElementType }> = {
  // Active state
  active: { classes: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle2 },
  ACTIVE: { classes: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle2 },
  SUCCESS: { classes: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle2 },
  PAID: { classes: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle2 },
  APPROVED: { classes: "bg-indigo-50 text-indigo-700 border border-indigo-200" },

  // Warning / pending
  DRAFT: { classes: "bg-amber-50 text-amber-700 border border-amber-200", icon: Clock },
  PENDING: { classes: "bg-amber-50 text-amber-700 border border-amber-200", icon: Clock },
  ELIGIBLE: { classes: "bg-blue-50 text-blue-700 border border-blue-200" },
  PAUSED: { classes: "bg-orange-50 text-orange-700 border border-orange-200" },

  // Danger
  inactive: { classes: "bg-slate-100 text-slate-500 border border-slate-200", icon: XCircle },
  CLOSED: { classes: "bg-slate-100 text-slate-500 border border-slate-200", icon: XCircle },
  CANCELLED: { classes: "bg-red-50 text-red-500 border border-red-200", icon: XCircle },
  ERROR: { classes: "bg-red-50 text-red-600 border border-red-200", icon: AlertCircle },
  DISPUTED: { classes: "bg-red-50 text-red-600 border border-red-200", icon: AlertCircle },

  // Verification
  verified: { classes: "bg-green-50 text-green-700 border border-green-200", icon: BadgeCheck },
  unverified: { classes: "bg-slate-100 text-slate-500 border border-slate-200", icon: BadgeX },

  // Roles
  SUPPORT_ADMIN: { classes: "bg-red-50 text-red-700 border border-red-200" },
  SUPPORT_REP: { classes: "bg-amber-50 text-amber-700 border border-amber-200" },
  ADMIN: { classes: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  HR: { classes: "bg-blue-50 text-blue-700 border border-blue-200" },
  HIRING_MANAGER: { classes: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  INTERVIEWER: { classes: "bg-teal-50 text-teal-700 border border-teal-200" },
  VIEWER: { classes: "bg-slate-100 text-slate-600 border border-slate-200" },
};

function toLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * StatusBadge — covers all MandateStatus, RewardStatus, Role, isActive, isVerified enums.
 * Text content always present (no color-only status) — satisfies accessibility requirement.
 */
export function StatusBadge({ value, label, className }: StatusBadgeProps) {
  const preset = presets[value] ?? { classes: "bg-slate-100 text-slate-600 border border-slate-200" };
  const Icon = preset.icon;
  const displayLabel = label ?? toLabel(value);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        preset.classes,
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {displayLabel}
    </span>
  );
}
