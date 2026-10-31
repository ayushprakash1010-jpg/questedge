"use client";

import { motion } from "framer-motion";
import { Sparkles, Clock, ShieldCheck, CheckCircle2, Building2, Lock, ArrowUpRight, User } from "lucide-react";

export function HeroProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Ambient background glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-cyan-500/20 blur-xl opacity-75 animate-pulse" />

      {/* Main product card preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">VIP FinTech Scaleup</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active Mandate
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Hiring Lead: Dr. Shiv Kumar • Hybrid</span>
            </div>
          </div>
          <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            #MND-842
          </span>
        </div>

        {/* Role & Bounty Spec */}
        <div className="mt-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Staff Distributed Systems Engineer
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Compensation: ₹45L - ₹65L • Full-time
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
                Bounty Pool
              </span>
              <span className="text-base font-extrabold text-slate-900 text-gradient">
                ₹1,20,000
              </span>
            </div>
          </div>
        </div>

        {/* Mini Gemini AI Fit Card with Candidate Ayush Prakash */}
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Gemini AI Candidate Fit Engine
            </span>
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              96% Fit
            </span>
          </div>

          <div className="mt-2 text-xs flex items-center justify-between text-slate-700 font-medium">
            <span className="inline-flex items-center gap-1 text-slate-800">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              Candidate: <strong>Ayush Prakash</strong>
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">Pre-Screened</span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-white/80 p-2 border border-indigo-100/60">
              <div className="text-slate-500">Core Strengths</div>
              <div className="font-semibold text-slate-800 mt-0.5">Go, Raft, Distributed DB</div>
            </div>
            <div className="rounded-lg bg-white/80 p-2 border border-indigo-100/60">
              <div className="text-slate-500">Domain Match</div>
              <div className="font-semibold text-slate-800 mt-0.5">FinTech Scale (8+ yrs)</div>
            </div>
          </div>
        </div>

        {/* 48h Claim Scope & Privacy Protection Widget with Pooja Singh */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {/* Claim Exclusivity Timer with Pooja Singh */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-violet-600" />
              48h Claim Scope
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-sm font-bold text-slate-900">34h 18m</span>
              <span className="text-[10px] text-slate-500">left</span>
            </div>
            <div className="text-[10px] text-violet-700 font-medium mt-0.5 truncate">
              Claimed by: Pooja Singh
            </div>
          </div>

          {/* Candidate Consent Status */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Two-Way Consent
            </div>
            <div className="mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">Ayush Approved</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Full role consent verified</div>
          </div>
        </div>

        {/* Floating security pill */}
        <div className="mt-3.5 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <Lock className="h-3 w-3 text-cyan-600" />
            <span>SHA-256 Collision Guard: #7f3a...b89e</span>
          </div>
          <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-0.5">
            Verified Lock <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}
