import React from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Award,
  Bell,
  Search,
  Bookmark,
  FileText,
  FilterX,
  TrendingUp,
  UserPlus,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStatePreset =
  | "mandates"
  | "referrals"
  | "candidates"
  | "earnings"
  | "notifications"
  | "search"
  | "applications"
  | "saved";

interface PresetConfig {
  icon: LucideIcon;
  defaultTitle: string;
  defaultDescription: string;
  bgGlow: string;
  iconBg: string;
  iconColor: string;
}

const PRESET_CONFIGS: Record<EmptyStatePreset, PresetConfig> = {
  mandates: {
    icon: FileText,
    defaultTitle: "No Job Mandates Yet",
    defaultDescription:
      "Create and publish your first job mandate to start receiving candidate referrals from verified recruiters.",
    bgGlow: "bg-indigo-100",
    iconBg: "bg-indigo-50 border-indigo-100",
    iconColor: "text-indigo-600",
  },
  referrals: {
    icon: UserPlus,
    defaultTitle: "No Referrals Submitted",
    defaultDescription:
      "Browse active job mandates and refer your top candidates to activate 48-hour ownership locks and earn placement rewards.",
    bgGlow: "bg-sky-100",
    iconBg: "bg-sky-50 border-sky-100",
    iconColor: "text-sky-600",
  },
  candidates: {
    icon: Users,
    defaultTitle: "Talent Pool Empty",
    defaultDescription:
      "Your candidate network is ready to grow. Explore open mandates and begin adding talent to match against requirements.",
    bgGlow: "bg-emerald-100",
    iconBg: "bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
  },
  earnings: {
    icon: Award,
    defaultTitle: "No Earnings Recorded Yet",
    defaultDescription:
      "Your earned placement rewards and escrow payouts will appear here as your referred candidates progress through hiring milestones.",
    bgGlow: "bg-amber-100",
    iconBg: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-600",
  },
  notifications: {
    icon: Bell,
    defaultTitle: "You're All Caught Up",
    defaultDescription:
      "No unread notifications at this time. We'll alert you right here whenever candidate consent, mandate updates, or rewards occur.",
    bgGlow: "bg-violet-100",
    iconBg: "bg-violet-50 border-violet-100",
    iconColor: "text-violet-600",
  },
  search: {
    icon: FilterX,
    defaultTitle: "No Matching Records Found",
    defaultDescription:
      "We couldn't find any items matching your active search keywords or filter criteria. Try adjusting your parameters.",
    bgGlow: "bg-slate-200",
    iconBg: "bg-slate-100 border-slate-200",
    iconColor: "text-slate-600",
  },
  applications: {
    icon: Briefcase,
    defaultTitle: "No Active Applications",
    defaultDescription:
      "You haven't applied to any jobs or accepted any referrals yet. Browse available opportunities to get started.",
    bgGlow: "bg-teal-100",
    iconBg: "bg-teal-50 border-teal-100",
    iconColor: "text-teal-600",
  },
  saved: {
    icon: Bookmark,
    defaultTitle: "No Bookmarked Jobs Yet",
    defaultDescription:
      "When you spot opportunities you'd like to revisit, bookmark them with one click to store them in your saved list.",
    bgGlow: "bg-emerald-100",
    iconBg: "bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
  },
};

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

interface MarketplaceEmptyStateProps {
  preset?: EmptyStatePreset;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  action?: EmptyStateAction;
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function MarketplaceEmptyState({
  preset = "search",
  icon: CustomIcon,
  title,
  description,
  primaryAction,
  action,
  secondaryAction,
  className,
}: MarketplaceEmptyStateProps) {
  const cfg = PRESET_CONFIGS[preset] || PRESET_CONFIGS.search;
  const DisplayIcon = CustomIcon || cfg.icon;
  const finalTitle = title || cfg.defaultTitle;
  const finalDescription = description || cfg.defaultDescription;
  const resolvedPrimaryAction = primaryAction || action;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center select-none",
        className,
      )}
    >
      {/* Layered decorative card effect */}
      <div className="relative mb-6">
        <div
          className={cn(
            "absolute inset-0 rounded-3xl rotate-6 scale-105 opacity-40",
            cfg.bgGlow,
          )}
        />
        <div
          className={cn(
            "absolute inset-0 rounded-3xl -rotate-3 scale-102 opacity-60",
            cfg.bgGlow,
          )}
        />
        <div
          className={cn(
            "relative w-20 h-20 rounded-3xl flex items-center justify-center border shadow-inner",
            cfg.iconBg,
          )}
        >
          <DisplayIcon className={cn("h-9 w-9", cfg.iconColor)} />
        </div>
      </div>

      {/* Text block */}
      <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
        {finalTitle}
      </h3>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        {finalDescription}
      </p>

      {/* Action CTA buttons */}
      {(resolvedPrimaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {resolvedPrimaryAction &&
            (resolvedPrimaryAction.href ? (
              <Link
                href={resolvedPrimaryAction.href}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 hover:-translate-y-0.5 transition-all"
              >
                {resolvedPrimaryAction.icon && <resolvedPrimaryAction.icon className="h-4 w-4" />}
                {resolvedPrimaryAction.label}
              </Link>
            ) : (
              <Button
                type="button"
                onClick={resolvedPrimaryAction.onClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                {resolvedPrimaryAction.icon && <resolvedPrimaryAction.icon className="h-4 w-4" />}
                {resolvedPrimaryAction.label}
              </Button>
            ))}

          {secondaryAction &&
            (secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium px-4 py-2.5 rounded-xl shadow-xs transition-all"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={secondaryAction.onClick}
                className="text-slate-700 border-slate-200 hover:bg-slate-50 text-sm font-medium rounded-xl"
              >
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
