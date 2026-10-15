import * as React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// AI recommendation card — see design-system-v2/CLAUDE.md §7 (AI insight card).
// Three severities map 1:1 to the v2 `severityConfig` colors. The optional
// recommendation block sits at the bottom of the card with a tinted-white
// background so the recommendation reads as a distinct sub-block.

type Severity = "info" | "warning" | "critical";

interface SeverityConfig {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  recBorder: string;
  recLabel: string;
  linkColor: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const severityConfig: Record<Severity, SeverityConfig> = {
  info: {
    bg: "bg-blue-50/50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    recBorder: "border-blue-200/40",
    recLabel: "text-blue-700",
    linkColor: "text-blue-600 hover:text-blue-800",
    Icon: Info,
  },
  warning: {
    bg: "bg-amber-50/50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    recBorder: "border-amber-200/40",
    recLabel: "text-amber-900",
    linkColor: "text-amber-700 hover:text-amber-900",
    Icon: AlertTriangle,
  },
  critical: {
    bg: "bg-red-50/50",
    border: "border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    recBorder: "border-red-200/40",
    recLabel: "text-red-700",
    linkColor: "text-red-600 hover:text-red-800",
    Icon: AlertCircle,
  },
};

export interface AiInsightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  severity: Severity;
  title: string;
  description: React.ReactNode;
  recommendation?: React.ReactNode;
  category?: string;
  /** Optional internal href for a direct action link at the bottom of the card */
  actionHref?: string;
  /** Label text shown next to the arrow icon on the action link */
  actionLabel?: string;
}

export function AiInsightCard({
  severity,
  title,
  description,
  recommendation,
  category,
  actionHref,
  actionLabel,
  className,
  ...props
}: AiInsightCardProps) {
  const cfg = severityConfig[severity];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-5 transition-shadow duration-200 hover:shadow-md",
        cfg.bg,
        cfg.border,
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          cfg.iconBg
        )}
      >
        <cfg.Icon className={cn("h-3.5 w-3.5", cfg.iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {description}
        </p>
        {recommendation ? (
          <div
            className={cn(
              "mt-2.5 rounded-lg border bg-white/70 px-3 py-2.5",
              cfg.recBorder
            )}
          >
            <p
              className={cn(
                "mb-0.5 text-[10px] font-bold uppercase tracking-wider",
                cfg.recLabel
              )}
            >
              Recommendation
            </p>
            <p className="text-xs leading-relaxed text-slate-700">
              {recommendation}
            </p>
          </div>
        ) : null}
        <div className="mt-2 flex items-center justify-between">
          {category ? (
            <Badge variant="outline" className="text-[10px]">
              {category}
            </Badge>
          ) : (
            <span />
          )}
          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold transition-colors",
                cfg.linkColor
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {actionLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
