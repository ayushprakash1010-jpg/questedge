import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, type CardProps } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// KPI summary card — see design-system-v2/CLAUDE.md §5 (KPI card grid).
// Props derive icon-tile colors from `accent`, but callers can override
// `iconBg` / `iconColor` per card if a different palette is wanted.

type Accent = NonNullable<CardProps["accent"]>;
type TrendDirection = "up" | "down" | "neutral";

const accentIconClass: Record<Accent, { bg: string; color: string }> = {
  indigo: { bg: "bg-indigo-50", color: "text-indigo-600" },
  cyan: { bg: "bg-cyan-50", color: "text-cyan-600" },
  emerald: { bg: "bg-emerald-50", color: "text-emerald-600" },
  amber: { bg: "bg-amber-50", color: "text-amber-600" },
  red: { bg: "bg-red-50", color: "text-red-600" },
  purple: { bg: "bg-purple-50", color: "text-purple-600" },
};

const trendClass: Record<TrendDirection, { color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  up: { color: "text-emerald-600", Icon: ArrowUpRight },
  down: { color: "text-red-600", Icon: ArrowDownRight },
  neutral: { color: "text-slate-500", Icon: Minus },
};

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon: React.ReactNode;
  accent?: Accent;
  iconBg?: string;
  iconColor?: string;
  trend?: { label: string; direction?: TrendDirection };
  className?: string;
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  subValue,
  icon,
  accent = "indigo",
  iconBg,
  iconColor,
  trend,
  className,
  onClick,
}: KpiCardProps) {
  const tile = accentIconClass[accent];
  const direction = trend?.direction ?? "up";
  const t = trendClass[direction];

  return (
    <Card
      accent={accent}
      onClick={onClick}
      className={cn(
        "card-hover",
        onClick && "cursor-pointer",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold leading-none text-slate-900">
              {value}
            </p>
            {subValue ? (
              <p className="mt-1 text-xs text-slate-500">{subValue}</p>
            ) : null}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconBg ?? tile.bg,
              iconColor ?? tile.color,
              "[&>svg]:h-5 [&>svg]:w-5"
            )}
          >
            {icon}
          </div>
        </div>
        {trend ? (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <t.Icon className={cn("h-3 w-3", t.color)} />
            <span className={t.color}>{trend.label}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
