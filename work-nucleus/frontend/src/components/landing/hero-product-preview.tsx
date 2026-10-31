"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Clock, ShieldCheck, CheckCircle2,
  Building2, Lock, ArrowUpRight, User, Target,
  DollarSign, Check, Award, EyeOff
} from "lucide-react";

export function HeroProductPreview() {
  const [activePersona, setActivePersona] = useState<"company" | "recruiter" | "candidate">("company");

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Ambient background glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-cyan-500/20 blur-xl opacity-75 animate-pulse" />

      {/* Segmented Persona Switcher Toggle */}
      <div className="relative mb-3.5 flex justify-center">
        <div className="inline-flex rounded-2xl border border-slate-200/90 bg-white/90 p-1 shadow-sm backdrop-blur-md">
          <button
            onClick={() => setActivePersona("company")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activePersona === "company"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Company (Dr. Shiv)</span>
          </button>
          <button
            onClick={() => setActivePersona("recruiter")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activePersona === "recruiter"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Recruiter (Pooja)</span>
          </button>
          <button
            onClick={() => setActivePersona("candidate")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activePersona === "candidate"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Candidate (Ayush)</span>
          </button>
        </div>
      </div>

      {/* Main product card preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
      >
        <AnimatePresence mode="wait">
          {/* ==================== 1. COMPANY VIEW (Dr. Shiv Kumar) ==================== */}
          {activePersona === "company" && (
            <motion.div
              key="company-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">VIP FinTech Scaleup</span>
                      {/* Active Mandate with Radar Pulse Ring */}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Active Mandate
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Hiring Lead: Dr. Shiv Kumar • Hybrid (Bangalore)</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                  #MND-842
                </span>
              </div>

              {/* Role & Bounty Spec */}
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

              {/* Gemini AI Fit Card */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
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
                  <span className="text-[11px] text-emerald-600 font-semibold">Consent Verified</span>
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

              {/* 5-Stage Funnel Status Bar */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium mb-1.5">
                  <span>Candidate Funnel</span>
                  <span className="font-bold text-indigo-600">Round 2: System Design</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center font-semibold">
                  <div className="rounded bg-emerald-100 text-emerald-800 py-1">Referred ✓</div>
                  <div className="rounded bg-emerald-100 text-emerald-800 py-1">Consented ✓</div>
                  <div className="rounded bg-indigo-600 text-white py-1">Interviewing</div>
                  <div className="rounded bg-slate-200 text-slate-500 py-1">Tenure (Day 90)</div>
                </div>
              </div>

              {/* Financial Protection Guard */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-2 text-[11px] text-emerald-900">
                <span className="font-semibold flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-emerald-600" />
                  ₹0 Upfront Retainer Paid
                </span>
                <span className="font-bold text-emerald-700">Saved ₹4.8L vs 20% Agency</span>
              </div>
            </motion.div>
          )}

          {/* ==================== 2. RECRUITER VIEW (Pooja Singh) ==================== */}
          {activePersona === "recruiter" && (
            <motion.div
              key="recruiter-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 border border-violet-100 text-violet-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Talent Partner Workspace</span>
                      {/* Claim Scope Pulse */}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                        </span>
                        48h Scope Active
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Recruiter: Pooja Singh (Top 2% Partner)</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-violet-700 bg-violet-50 px-2 py-1 rounded-md border border-violet-200">
                  #MND-842
                </span>
              </div>

              {/* 48h Countdown Lock & Duplicate Shield */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-violet-900">
                      <Clock className="h-3.5 w-3.5 text-violet-600" />
                      Claim Scope Lock
                    </span>
                    <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="font-mono text-base font-extrabold text-violet-900">34h 18m</span>
                    <span className="text-[10px] text-violet-700">remaining</span>
                  </div>
                  <div className="text-[10px] text-violet-700 font-medium mt-0.5">
                    Exclusive referral rights protected
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                    Duplicate Shield
                  </span>
                  <div className="mt-1.5 font-mono text-xs font-bold text-slate-900 truncate">
                    #7f3a...b89e
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    SHA-256 hash collision proof
                  </div>
                </div>
              </div>

              {/* Candidate Referral Card */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Referred: Ayush Prakash (Staff SRE)
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Consent Approved
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Target: VIP FinTech Scaleup • Hiring Lead: Dr. Shiv Kumar
                </div>
              </div>

              {/* Recruiter Wallet Payout Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-950">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    Bounty Wallet Allocation
                  </span>
                  <span className="font-mono text-xs font-extrabold text-emerald-800">
                    ₹1,20,000 Bounty
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-800">
                  <span>Status: Milestone Locked in Escrow</span>
                  <span className="font-semibold">Releases on Day 90</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== 3. CANDIDATE VIEW (Ayush Prakash) ==================== */}
          {activePersona === "candidate" && (
            <motion.div
              key="candidate-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Private Referral Invitation</span>
                      {/* Consent Verified Pulse */}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Consent Active
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Candidate: Ayush Prakash • Referred by Pooja Singh</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                  #INV-392
                </span>
              </div>

              {/* Role & Total Transparency */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Staff Distributed Systems Engineer</div>
                    <div className="text-[11px] text-slate-500">VIP FinTech Scaleup (Dr. Shiv Kumar's Org)</div>
                  </div>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    Full Transparency
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                  <span className="text-slate-600">Disclosed CTC:</span>
                  <span className="font-bold text-slate-900">₹45L - ₹65L Fixed + 0.15% ESOP</span>
                </div>
              </div>

              {/* Two-Way Consent Status Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-950">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Two-Way Consent Guarantee
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> Approved by Ayush
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Your resume and contact information are disclosed strictly to Dr. Shiv's hiring committee. Never shopped around or made public.
                </p>
              </div>

              {/* DPDP Compliance & Privacy Control */}
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-[11px] text-slate-600">
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <EyeOff className="h-3 w-3 text-cyan-600" />
                  DPDP Section 11 Compliant
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-0.5">
                  1-Click Right to Erasure
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
