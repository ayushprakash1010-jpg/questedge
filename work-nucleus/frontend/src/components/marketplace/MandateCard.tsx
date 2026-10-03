"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Briefcase,
  Users,
  IndianRupee,
  Clock,
  CheckCircle2,
  Building2,
} from "lucide-react";

export type MandateStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FILLED" | "CLOSED";

interface MandateCardProps {
  id: string;
  title: string;
  department?: string;
  organization: { id: string; name: string };
  location?: string;
  workModel?: string;
  mandatorySkills: string[];
  referralRewardAmount?: number;
  currency?: string;
  status: MandateStatus;
  numberOfOpenings?: number;
  recruiterCount?: number;
  referralCount?: number;
  publishedAt?: string;
  isJoined?: boolean;
  isSaved?: boolean;
  viewAs?: "company" | "recruiter" | "candidate";
  onJoin?: (id: string) => void;
  onSave?: (id: string) => void;
  onClick?: (id: string) => void;
}

const statusConfig: Record<MandateStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200" },
  ACTIVE: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PAUSED: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200" },
  FILLED: { label: "Filled", className: "bg-blue-50 text-blue-700 border-blue-200" },
  CLOSED: { label: "Closed", className: "bg-red-50 text-red-600 border-red-200" },
};

export function MandateStatusBadge({ status }: { status: MandateStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export function RewardBadge({
  amount,
  currency = "INR",
}: {
  amount: number;
  currency?: string;
}) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm font-bold text-amber-700 group-hover:bg-amber-100 transition-colors">
      <span className="text-amber-500">🏆</span>
      {formatted} reward
    </span>
  );
}

export function SkillChip({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {skill}
    </span>
  );
}

export function MandateCard({
  id,
  title,
  department,
  organization,
  location,
  workModel,
  mandatorySkills,
  referralRewardAmount,
  currency,
  status,
  numberOfOpenings,
  recruiterCount,
  referralCount,
  publishedAt,
  isJoined = false,
  isSaved = false,
  viewAs = "company",
  onJoin,
  onSave,
  onClick,
}: MandateCardProps) {
  const safeSkills = mandatorySkills || [];
  const visibleSkills = safeSkills.slice(0, 3);
  const overflowCount = safeSkills.length - visibleSkills.length;
  const timeAgo = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <Card
      className={cn(
        "group relative flex flex-col gap-4 p-5 cursor-pointer border border-slate-200 bg-white rounded-xl",
        "transition-all duration-200 ease-out",
        "hover:border-indigo-200 hover:shadow-[0_4px_24px_rgba(79,70,229,0.08)] hover:-translate-y-0.5",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {organization.name}
            </span>
            {department && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{department}</span>
              </>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 text-base leading-tight truncate group-hover:text-indigo-700 transition-colors">
            {title}
          </h3>
        </div>
        <div className="flex-shrink-0">
          <MandateStatusBadge status={status} />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
        )}
        {workModel && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {workModel}
          </span>
        )}
        {numberOfOpenings && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {numberOfOpenings} opening{numberOfOpenings > 1 ? "s" : ""}
          </span>
        )}
        {timeAgo && (
          <span className="flex items-center gap-1 ml-auto text-slate-400">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        )}
      </div>

      {/* Skills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleSkills.map((skill) => (
          <SkillChip key={skill} skill={skill} />
        ))}
        {overflowCount > 0 && (
          <span className="text-xs text-slate-400 font-medium">+{overflowCount} more</span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {referralRewardAmount && referralRewardAmount > 0 ? (
            <RewardBadge amount={referralRewardAmount} currency={currency} />
          ) : (
            <span className="text-xs text-slate-400">No referral reward</span>
          )}
          {recruiterCount !== undefined && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {recruiterCount} recruiters
            </span>
          )}
        </div>

        {/* Action buttons based on viewAs */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {viewAs === "recruiter" && (
            <Button
              size="sm"
              variant={isJoined ? "outline" : "default"}
              className={cn(
                "h-7 px-3 text-xs font-semibold transition-all",
                isJoined
                  ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow"
              )}
              onClick={() => onJoin?.(id)}
            >
              {isJoined ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Joined
                </span>
              ) : (
                "Join & Refer"
              )}
            </Button>
          )}

          {viewAs === "candidate" && (
            <Button
              size="sm"
              variant={isSaved ? "outline" : "default"}
              className={cn(
                "h-7 px-3 text-xs font-semibold",
                isSaved
                  ? "border-slate-200 text-slate-600"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
              onClick={() => onSave?.(id)}
            >
              {isSaved ? "Saved ✓" : "Save Job"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
