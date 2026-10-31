"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Target, UserCircle,
  Sparkles, FileText, Inbox, BarChart3,
  Clock, Lock, DollarSign, Bell,
  ShieldCheck, Eye, CheckCircle2, ArrowRight
} from "lucide-react";

export function Features() {
  const [activeTab, setActiveTab] = useState<"companies" | "recruiters" | "candidates">("companies");

  return (
    <section id="features" className="bg-slate-50/60 border-t border-slate-200/80 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Platform Capabilities
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Built for every side of the{" "}
            <span className="text-gradient">talent ecosystem</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            QuestEdge delivers purpose-built workflows with automated compliance, cryptographic collision protection, and milestone-backed rewards.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab("companies")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "companies"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Building2 className="h-4 w-4" />
              For Companies
            </button>
            <button
              onClick={() => setActiveTab("recruiters")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "recruiters"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Target className="h-4 w-4" />
              For Recruiters
            </button>
            <button
              onClick={() => setActiveTab("candidates")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "candidates"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <UserCircle className="h-4 w-4" />
              For Candidates
            </button>
          </div>
        </div>

        {/* Bento Grid Content */}
        <div className="mt-12">
          <AnimatePresence mode="wait">
            {activeTab === "companies" && (
              <motion.div
                key="companies"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="grid gap-6 md:grid-cols-12"
              >
                {/* Bento Card 1: Flagship AI Screening (Span 7) */}
                <div className="rounded-3xl border border-indigo-100 bg-white p-7 shadow-sm hover:shadow-md transition-all md:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">Flagship Engine</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      Gemini AI Candidate Screening & Fit Engine
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Auto-evaluates every referred candidate&apos;s resume against your mandate criteria. Produces clear fit percentages, highlights technical strengths, and flags capability gaps before hiring manager review.
                    </p>
                  </div>

                  {/* Interactive Mock Scorecard */}
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-800">Candidate Match Evaluation</span>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        94% Strong Match
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                        ✓ Go / Microservices
                      </span>
                      <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                        ✓ High Concurrency
                      </span>
                      <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                        ✓ Apache Kafka
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 border border-amber-200">
                        ⚠ Redis Caching (Gap)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bento Card 2: Structured Mandate Publishing (Span 5) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm hover:shadow-md transition-all md:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Structured Mandate Publishing
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Define job expectations, required tech stacks, salary bands, and performance referral bounties in under 5 minutes.
                    </p>
                  </div>
                  <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900 flex items-center justify-between">
                    <span className="font-semibold">Bounty Configurator:</span>
                    <span className="font-bold text-indigo-600">Fixed or % of CTC</span>
                  </div>
                </div>

                {/* Bento Card 3: Referral Inbox & SLA Nudges (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Referral Inbox & SLA Nudges
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Manage candidate referrals with time-stamped status updates, recruiter notes, and 48-hour review reminders to prevent hiring delays.
                  </p>
                </div>

                {/* Bento Card 4: 5-Stage Pipeline Funnel (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    5-Stage Pipeline Funnel
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Track conversion velocity across Referred → Consented → Screened → Interviewed → Hired with time-to-hire analytics.
                  </p>
                </div>

                {/* Bento Card 5: Milestone Reward Security (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Milestone Reward Distribution
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Rewards transition from Potential to Eligible upon offer, and Approved upon tenure completion. Pay only when hires stay.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "recruiters" && (
              <motion.div
                key="recruiters"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="grid gap-6 md:grid-cols-12"
              >
                {/* Bento Card 1: 48-Hour Claim Scope & Hash Guard (Span 7) */}
                <div className="rounded-3xl border border-violet-100 bg-white p-7 shadow-sm hover:shadow-md transition-all md:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-4">
                      <Clock className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600 block">Placement Security</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      48-Hour Claim Scope & SHA-256 Collision Guard
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Lock candidate referral scopes for 48 hours to protect your placement rights. Our cryptographic hashing prevents duplicate submissions without exposing raw candidate contact info.
                    </p>
                  </div>

                  {/* Hash Shield Simulation */}
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-violet-600" />
                        Claim Lock: Active (47h 58m remaining)
                      </span>
                      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 font-bold text-violet-700 text-[11px]">
                        Protected Scope
                      </span>
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 truncate">
                      SHA256: 9b2d8471f2e1a384c59381e... Collision Check: PASSED
                    </div>
                  </div>
                </div>

                {/* Bento Card 2: Real-Time Bounty Wallet (Span 5) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm hover:shadow-md transition-all md:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-4">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Real-Time Bounty Wallet
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Track your earnings across Potential, Eligible, and Approved stages. Direct disbursement to your verified bank account upon tenure completion.
                    </p>
                  </div>
                  <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-xs text-violet-900 flex items-center justify-between">
                    <span className="font-semibold">Payout Lifecycle:</span>
                    <span className="font-bold text-violet-600">Zero Payment Delays</span>
                  </div>
                </div>

                {/* Bento Card 3: Marketplace Discovery (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-3">
                    <Target className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Mandate Discovery
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Search active mandates filtered by tech domain, compensation bands, work model, and referral bounty rewards.
                  </p>
                </div>

                {/* Bento Card 4: Live Notifications (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-3">
                    <Bell className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Live Lifecycle Updates
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Instant alerts when candidates consent, progress through interviews, receive offers, or join the hiring company.
                  </p>
                </div>

                {/* Bento Card 5: Vetted Recruiter Reputation (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Recruiter Trust Tiers
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Elevate from Bronze to Platinum based on successful placements and candidate consent rates, unlocking higher-tier bounties.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "candidates" && (
              <motion.div
                key="candidates"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="grid gap-6 md:grid-cols-12"
              >
                {/* Bento Card 1: Two-Way Consent Verification (Span 7) */}
                <div className="rounded-3xl border border-emerald-100 bg-white p-7 shadow-sm hover:shadow-md transition-all md:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">Candidate Protection</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      Two-Way Consent Verification
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Never have your resume circulated without your consent. Inspect full role details — company name, salary range, and expectations — before consenting to share your profile.
                    </p>
                  </div>

                  {/* Consent Flow Simulation */}
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                      <span className="text-xs font-bold text-slate-800">Private Referral Invitation</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        Awaiting Your Review
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>✓ Compensation visible: ₹45L - ₹65L</span>
                      <span className="font-semibold text-emerald-700">Consent Required</span>
                    </div>
                  </div>
                </div>

                {/* Bento Card 2: DPDP & GDPR Compliance (Span 5) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm hover:shadow-md transition-all md:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      DPDP & GDPR Data Privacy
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Built for strict compliance with DPDP Act 2023 and GDPR Article 20, including one-click full data export and right-to-be-forgotten data erasure.
                    </p>
                  </div>
                  <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="font-semibold">Candidate Data Rights:</span>
                    <span className="font-bold text-emerald-600">Instant Self-Service Erasure</span>
                  </div>
                </div>

                {/* Bento Card 3: AI Resume Parsing (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Resume Extraction
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Upload your resume PDF to automatically extract experience, top technical skills, and credentials with zero manual data entry.
                  </p>
                </div>

                {/* Bento Card 4: Application Tracking (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                    <Eye className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Live Progress Tracking
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Follow your application status transparently through screening, interviews, background verification, and formal offer letters.
                  </p>
                </div>

                {/* Bento Card 5: Portable Profile (Span 4) */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Portable Profile
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Maintain a verified talent profile that approved recruiters can match to multiple confidential opportunities with your consent.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-16 text-center">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>Explore all open mandates and candidate opportunities</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
