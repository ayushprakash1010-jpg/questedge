"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Building2, X, Lock, ArrowRight } from "lucide-react";
import { Mandate } from "@/lib/marketplace-api";

interface MarketplaceModalProps {
  mandate: Mandate;
  onClose: () => void;
  formatCtc: (min?: number | null, max?: number | null, fallbackIndex?: number) => string;
  formatBounty: (reward?: number | null, max?: number | null, fallbackIndex?: number) => string;
}

export function MarketplaceModal({
  mandate,
  onClose,
  formatCtc,
  formatBounty,
}: MarketplaceModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus trap and keyboard management for accessible modal
  useEffect(() => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;

    const timer = setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      lastActiveElementRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-mandate-title"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-2">
          <Building2 className="h-4 w-4" />
          <span>{mandate.organization?.name}</span>
          <span className="text-slate-300">•</span>
          <span>{mandate.location}</span>
          <span className="text-slate-300">•</span>
          <span>{mandate.workModel}</span>
        </div>

        <h3 id="modal-mandate-title" className="text-2xl font-extrabold text-slate-900">
          {mandate.title}
        </h3>

        {/* Bounty & CTC Bar */}
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Compensation Band
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {formatCtc(mandate.compensationMin, mandate.compensationMax)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
              Referral Bounty Pool
            </span>
            <span className="text-base font-extrabold text-indigo-600">
              {formatBounty(mandate.referralRewardAmount, mandate.compensationMax)}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Role Overview
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed">
            {mandate.description}
          </p>
        </div>

        {/* Required Skills */}
        <div className="mt-6 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mandatory Technical Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {mandate.mandatorySkills.map((s) => (
              <span
                key={s}
                className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100"
              >
                {s}
              </span>
            ))}
            {mandate.preferredSkills?.map((s) => (
              <span
                key={s}
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200"
              >
                {s} (Preferred)
              </span>
            ))}
          </div>
        </div>

        {/* Operational Guarantee Pill */}
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex items-start gap-3">
          <Lock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">48-Hour Claim Scope & SHA-256 Shield</span>
            <p className="mt-0.5 text-[11px] text-emerald-800 leading-relaxed">
              Locking a claim scope gives you exclusive submission rights. Candidate receives an encrypted consent invite, and duplicate collision guards prevent disputes.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Close
          </button>
          <a
            href="/auth/login?returnTo=/jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all"
          >
            <span>Claim 48h Scope & Refer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}

