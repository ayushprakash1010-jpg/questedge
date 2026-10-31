"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Target, ArrowRight, CheckCircle2,
  Sparkles, Award, Zap, TrendingUp
} from "lucide-react";

export function RoiCalculator() {
  const [calculatorMode, setCalculatorMode] = useState<"company" | "recruiter">("company");

  // Company State
  const [candidateCtc, setCandidateCtc] = useState<number>(3000000); // 30 Lakhs
  const [annualHires, setAnnualHires] = useState<number>(4);

  // Recruiter State
  const [monthlyPlacements, setMonthlyPlacements] = useState<number>(2);
  const [avgBounty, setAvgBounty] = useState<number>(85000);

  // Calculations for Company
  const agencyRate = 0.20; // 20% typical agency commission
  const agencyCostPerHire = candidateCtc * agencyRate;
  const questedgeBounty = Math.round(candidateCtc * 0.035); // ~3.5% typical bounty or fixed ~1L
  const savingsPerHire = agencyCostPerHire - questedgeBounty;
  const totalAnnualSavings = savingsPerHire * annualHires;
  const percentageSaved = Math.round((savingsPerHire / agencyCostPerHire) * 100);

  // Calculations for Recruiter
  const monthlyEarnings = monthlyPlacements * avgBounty;
  const annualEarnings = monthlyEarnings * 12;

  // Milestone tier for Company
  const getCompanyTier = (ctc: number) => {
    if (ctc < 2500000) {
      return {
        label: "Mid-Market Tech Role",
        sub: "Direct agency replacement with zero upfront retainers",
        icon: "🌱",
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      };
    }
    if (ctc < 4500000) {
      return {
        label: "Senior Engineering Tier",
        sub: "₹5L+ typical fee eliminated per hire",
        icon: "🚀",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    }
    if (ctc < 6000000) {
      return {
        label: "Staff & Principal Specialist",
        sub: "Massive ₹8L+ saved per hire with milestone security",
        icon: "💎",
        color: "text-cyan-700 bg-cyan-50 border-cyan-200",
      };
    }
    return {
      label: "Executive Leadership Tier",
      sub: "Maximum capital efficiency with 80% cost reduction",
      icon: "👑",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    };
  };

  // Milestone tier for Recruiter
  const getRecruiterTier = (placements: number) => {
    if (placements <= 1) {
      return {
        label: "Part-Time Talent Scout",
        sub: "Monetize trusted relationships on your own schedule",
        icon: "🌱",
        color: "text-violet-700 bg-violet-50 border-violet-200",
      };
    }
    if (placements <= 3) {
      return {
        label: "Active Talent Partner",
        sub: "Top 20% marketplace earner with 48h protected scopes",
        icon: "🚀",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    }
    return {
      label: "Elite Executive Recruiter",
      sub: "Top 2% marketplace performer with six-figure monthly wallet payouts",
      icon: "👑",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    };
  };

  const companyTier = getCompanyTier(candidateCtc);
  const recruiterTier = getRecruiterTier(monthlyPlacements);
  const isHighCompanySavings = totalAnnualSavings >= 500000;
  const isHighRecruiterEarnings = annualEarnings >= 1000000;

  return (
    <section id="roi-calculator" className="bg-slate-50/70 border-t border-slate-200/80 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Interactive Economics
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Calculate your referral marketplace advantage
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Compare QuestEdge performance bounties against conventional 20% recruitment agency retainers.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              onClick={() => setCalculatorMode("company")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                calculatorMode === "company"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Building2 className="h-4 w-4" />
              For Companies (Cost Savings)
            </button>
            <button
              onClick={() => setCalculatorMode("recruiter")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                calculatorMode === "recruiter"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Target className="h-4 w-4" />
              For Recruiters (Earnings Potential)
            </button>
          </div>
        </div>

        {/* Calculator Body */}
        <div className="mt-12 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {calculatorMode === "company" ? (
              <motion.div
                key="company-calc"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="grid gap-8 md:grid-cols-12 rounded-3xl border border-slate-200 bg-white p-8 md:p-10 shadow-lg"
              >
                {/* Inputs Column */}
                <div className="md:col-span-6 space-y-6">
                  {/* Dynamic Tier Badge */}
                  <div className={`flex items-center justify-between rounded-xl border px-3.5 py-2 text-xs font-semibold ${companyTier.color}`}>
                    <span className="flex items-center gap-1.5">
                      <span>{companyTier.icon}</span>
                      <span>{companyTier.label}</span>
                    </span>
                    <span className="text-[11px] font-normal opacity-90">{companyTier.sub}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-900">
                        Average Candidate Annual CTC
                      </label>
                      <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        ₹{(candidateCtc / 100000).toFixed(0)} Lakhs
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1200000}
                      max={7000000}
                      step={100000}
                      value={candidateCtc}
                      onChange={(e) => setCandidateCtc(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>₹12L</span>
                      <span>₹40L</span>
                      <span>₹70L</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-900">
                        Planned Hires Per Year
                      </label>
                      <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {annualHires} {annualHires === 1 ? "Hire" : "Hires"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={1}
                      value={annualHires}
                      onChange={(e) => setAnnualHires(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>1 Hire</span>
                      <span>8 Hires</span>
                      <span>15 Hires</span>
                    </div>
                  </div>

                  {/* Operational Notes */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Traditional Agency Fee: <strong>20% of CTC</strong> (₹{(agencyCostPerHire / 100000).toFixed(1)}L per hire)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>QuestEdge Performance Bounty: <strong>~3.5% of CTC</strong> (₹{(questedgeBounty / 100000).toFixed(1)}L per hire)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
                      <span>Zero retainers: Disbursed only after 60-90 days tenure completion</span>
                    </div>
                  </div>
                </div>

                {/* Results Column with Glowing Milestone Pulse */}
                <div
                  className={`md:col-span-6 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-7 text-white shadow-xl relative overflow-hidden transition-all duration-300 ${
                    isHighCompanySavings ? "ring-2 ring-emerald-400/50 shadow-emerald-500/20" : ""
                  }`}
                >
                  {isHighCompanySavings && (
                    <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none animate-pulse" />
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                        Projected Annual Savings
                      </span>
                      <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-extrabold text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {percentageSaved}% Saved
                      </span>
                    </div>

                    <div className="mt-4 font-extrabold text-4xl sm:text-5xl text-white tracking-tight flex items-baseline gap-2">
                      <span>₹{(totalAnnualSavings / 100000).toFixed(1)} Lakhs</span>
                      {isHighCompanySavings && (
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                          High Impact
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-indigo-200/80">
                      Saved across {annualHires} {annualHires === 1 ? "hire" : "hires"} compared to standard agency headhunter fees.
                    </p>

                    <div className="mt-6 border-t border-indigo-800/80 pt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-slate-400">Savings Per Hire</div>
                        <div className="text-base font-bold text-white mt-0.5">
                          ₹{(savingsPerHire / 100000).toFixed(2)} Lakhs
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Upfront Retainers</div>
                        <div className="text-base font-bold text-emerald-400 mt-0.5">
                          ₹0 (Zero Risk)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <a
                      href="/auth/login?returnTo=/dashboard"
                      className="group flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 transition-all"
                    >
                      <span>Post a Mandate — Start Saving</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="recruiter-calc"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="grid gap-8 md:grid-cols-12 rounded-3xl border border-slate-200 bg-white p-8 md:p-10 shadow-lg"
              >
                {/* Recruiter Inputs Column */}
                <div className="md:col-span-6 space-y-6">
                  {/* Dynamic Tier Badge */}
                  <div className={`flex items-center justify-between rounded-xl border px-3.5 py-2 text-xs font-semibold ${recruiterTier.color}`}>
                    <span className="flex items-center gap-1.5">
                      <span>{recruiterTier.icon}</span>
                      <span>{recruiterTier.label}</span>
                    </span>
                    <span className="text-[11px] font-normal opacity-90">{recruiterTier.sub}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-900">
                        Successful Placements Per Month
                      </label>
                      <span className="font-mono text-sm font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
                        {monthlyPlacements} {monthlyPlacements === 1 ? "Placement" : "Placements"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={1}
                      value={monthlyPlacements}
                      onChange={(e) => setMonthlyPlacements(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>1 placement</span>
                      <span>3 placements</span>
                      <span>6 placements</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-900">
                        Average Bounty Per Mandate
                      </label>
                      <span className="font-mono text-sm font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
                        ₹{avgBounty.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={40000}
                      max={150000}
                      step={5000}
                      value={avgBounty}
                      onChange={(e) => setAvgBounty(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>₹40,000</span>
                      <span>₹85,000</span>
                      <span>₹1,50,000</span>
                    </div>
                  </div>

                  {/* Recruiter Safeguards Note */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                      <span><strong>48h Claim Scope:</strong> Protects your exclusive placement rights</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                      <span><strong>SHA-256 Collision Guard:</strong> Eliminates duplicate candidate disputes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span><strong>Real-Time Bounty Wallet:</strong> Direct disbursement to registered bank</span>
                    </div>
                  </div>
                </div>

                {/* Recruiter Results Column with Glowing Violet Aura */}
                <div
                  className={`md:col-span-6 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-violet-950 via-slate-900 to-violet-900 p-7 text-white shadow-xl relative overflow-hidden transition-all duration-300 ${
                    isHighRecruiterEarnings ? "ring-2 ring-violet-400/50 shadow-violet-500/20" : ""
                  }`}
                >
                  {isHighRecruiterEarnings && (
                    <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-violet-500/20 blur-2xl pointer-events-none animate-pulse" />
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                        Projected Annual Earnings
                      </span>
                      <span className="rounded-full bg-violet-400/20 px-2.5 py-1 text-xs font-extrabold text-violet-300 border border-violet-400/30 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Wallet Direct
                      </span>
                    </div>

                    <div className="mt-4 font-extrabold text-4xl sm:text-5xl text-white tracking-tight flex items-baseline gap-2">
                      <span>₹{(annualEarnings / 100000).toFixed(2)} Lakhs</span>
                      {isHighRecruiterEarnings && (
                        <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-800">
                          Top Tier
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-violet-200/80">
                      Based on {monthlyPlacements} placement{monthlyPlacements > 1 ? "s" : ""}/month at ₹{avgBounty.toLocaleString("en-IN")} average bounty.
                    </p>

                    <div className="mt-6 border-t border-violet-800/80 pt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-slate-400">Monthly Projected</div>
                        <div className="text-base font-bold text-white mt-0.5">
                          ₹{monthlyEarnings.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Joining Fee</div>
                        <div className="text-base font-bold text-emerald-400 mt-0.5">
                          ₹0 (Free to Join)
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <a
                      href="/auth/login?returnTo=/recruiter/dashboard"
                      className="group flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 transition-all"
                    >
                      <span>Join as Recruiter — Start Referring</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
