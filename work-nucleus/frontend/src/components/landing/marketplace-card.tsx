"use client";

import { motion } from "framer-motion";
import { Building2, MapPin, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { Mandate } from "@/lib/marketplace-api";

interface MarketplaceCardProps {
  mandate: Mandate;
  index: number;
  onViewRole: (mandate: Mandate) => void;
  formatCtc: (min?: number | null, max?: number | null, fallbackIndex?: number) => string;
  formatBounty: (reward?: number | null, max?: number | null, fallbackIndex?: number) => string;
}

export function MarketplaceCard({
  mandate,
  index,
  onViewRole,
  formatCtc,
  formatBounty,
}: MarketplaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-lg transition-all"
    >
      <div>
        {/* Header: Company & Verified status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <span>{mandate.organization?.name ?? "Verified Employer"}</span>
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                <span>{mandate.location} • {mandate.workModel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span>Active</span>
          </div>
        </div>

        {/* Role Title */}
        <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {mandate.title}
        </h3>

        <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {mandate.description}
        </p>

        {/* Tech Stack Chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {mandate.mandatorySkills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200/60"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Compensation, Bounty & Action */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Salary Range
            </span>
            <span className="text-xs font-bold text-slate-900">
              {formatCtc(mandate.compensationMin, mandate.compensationMax, index)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-indigo-600 block">
              Referral Bounty
            </span>
            <span className="text-sm font-extrabold text-indigo-600">
              {formatBounty(mandate.referralRewardAmount, mandate.compensationMax, index)}
            </span>
          </div>
        </div>

        {/* Action CTA */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href="/auth/login?returnTo=/jobs"
            className="flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <span>Claim & Refer</span>
            <ArrowRight className="h-3 w-3" />
          </a>
          <button
            onClick={() => onViewRole(mandate)}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <span>View Role</span>
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-violet-500" />
            48h Scope Exclusivity
          </span>
          <span>{mandate.ownershipPeriodDays}d Tenure Release</span>
        </div>
      </div>
    </motion.div>
  );
}

