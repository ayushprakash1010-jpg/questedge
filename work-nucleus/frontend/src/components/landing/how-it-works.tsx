"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Target, UserCircle,
  FileText, Users, CheckCircle,
  DollarSign, Search, Bell, ShieldCheck,
  BarChart3, ArrowRight
} from "lucide-react";

interface Step {
  step: string;
  icon: typeof FileText;
  title: string;
  description: string;
  badge: string;
  illustration: {
    title: string;
    tag: string;
    tagColor: string;
    line1Label: string;
    line1Value: string;
    line2Label: string;
    line2Value: string;
    footerText: string;
    footerHighlight: string;
    footerHighlightColor?: string;
  };
}

interface Flow {
  role: string;
  icon: typeof Building2;
  color: string;
  activeBg: string;
  ctaText: string;
  ctaHref: string;
  steps: Step[];
}

const flows: Flow[] = [
  {
    role: "Companies",
    icon: Building2,
    color: "text-indigo-600",
    activeBg: "bg-indigo-600",
    ctaText: "Post Your First Mandate — Pay Only on Hire",
    ctaHref: "/auth/login?returnTo=/dashboard",
    steps: [
      {
        step: "01",
        icon: FileText,
        badge: "5 Min Setup",
        title: "Publish Structured Mandate",
        description: "Define job roles, required tech stacks, salary bands, and performance referral bounties. Your mandate goes live on the private marketplace instantly.",
        illustration: {
          title: "Mandate: Lead ML Engineer",
          tag: "Published",
          tagColor: "bg-emerald-100 text-emerald-800",
          line1Label: "Bounty Pool",
          line1Value: "₹1,50,000",
          line2Label: "Tenure Clause",
          line2Value: "90 Days Retention",
          footerText: "Marketplace Access",
          footerHighlight: "2,400+ Vetted Recruiters",
          footerHighlightColor: "text-indigo-600",
        },
      },
      {
        step: "02",
        icon: Users,
        badge: "Verified Referrals",
        title: "Recruiters Screen & Refer",
        description: "Independent recruiters review open roles, lock 48-hour exclusive claim scopes, and submit pre-screened talent with candidate consent already verified.",
        illustration: {
          title: "Scope Lock: #MND-842",
          tag: "⏱ 41h 22m Lock",
          tagColor: "bg-amber-100 text-amber-800",
          line1Label: "Candidate Consent",
          line1Value: "Verified via Magic Link",
          line2Label: "Collision Shield",
          line2Value: "SHA-256 Unique",
          footerText: "Recruiter Trust Score",
          footerHighlight: "Top 2% Verified Partner",
          footerHighlightColor: "text-violet-600",
        },
      },
      {
        step: "03",
        icon: CheckCircle,
        badge: "Tenure Security",
        title: "Review & Pay on Results",
        description: "Evaluate candidates with Gemini AI fit scores, conduct interviews, and disburse bounty payouts only when your hire completes their tenure period.",
        illustration: {
          title: "Tenure Confirmed (Day 90)",
          tag: "Hire Completed",
          tagColor: "bg-indigo-100 text-indigo-800",
          line1Label: "Milestone Payout",
          line1Value: "₹1,50,000 Disbursed",
          line2Label: "Upfront Retainer",
          line2Value: "₹0 Retainer Paid",
          footerText: "Net Savings vs Agency",
          footerHighlight: "Saved ₹4,50,000 (80%)",
          footerHighlightColor: "text-emerald-600",
        },
      },
    ],
  },
  {
    role: "Recruiters",
    icon: Target,
    color: "text-violet-600",
    activeBg: "bg-violet-600",
    ctaText: "Join Marketplace & Claim Exclusive Scopes",
    ctaHref: "/auth/login?returnTo=/recruiter/dashboard",
    steps: [
      {
        step: "01",
        icon: Search,
        badge: "Marketplace Search",
        title: "Discover Open Mandates",
        description: "Filter verified company mandates by technical domain, compensation, and bounty rewards. Choose mandates where your network gives you an edge.",
        illustration: {
          title: "Staff SRE — Fintech Scaleup",
          tag: "Open Mandate",
          tagColor: "bg-violet-100 text-violet-800",
          line1Label: "Referral Bounty",
          line1Value: "₹1,20,000 Pool",
          line2Label: "SLA Response",
          line2Value: "48h Review Nudge",
          footerText: "Claim Availability",
          footerHighlight: "Ready to Lock Scope",
          footerHighlightColor: "text-emerald-600",
        },
      },
      {
        step: "02",
        icon: Users,
        badge: "48h Exclusivity",
        title: "Refer with Collision Shield",
        description: "Lock 48-hour referral exclusivity with SHA-256 duplicate collision protection. Candidate receives an encrypted consent invite to review before sharing.",
        illustration: {
          title: "Referral Lock Granted",
          tag: "48h Exclusive",
          tagColor: "bg-violet-100 text-violet-800",
          line1Label: "Encrypted Invite",
          line1Value: "Dispatched to Candidate",
          line2Label: "Hash Guard",
          line2Value: "Collision-Shield Active",
          footerText: "Dispute Protection",
          footerHighlight: "Guaranteed Placement Credit",
          footerHighlightColor: "text-violet-600",
        },
      },
      {
        step: "03",
        icon: DollarSign,
        badge: "Direct Wallet Payout",
        title: "Earn Guaranteed Bounties",
        description: "Track candidate progress through the 5-stage pipeline. Upon successful hire and tenure completion, bounties are released directly to your wallet.",
        illustration: {
          title: "Recruiter Bounty Wallet",
          tag: "Active Balance",
          tagColor: "bg-emerald-100 text-emerald-800",
          line1Label: "Available Funds",
          line1Value: "₹2,40,000",
          line2Label: "Pending Tenure",
          line2Value: "₹1,20,000 (In Escrow)",
          footerText: "Latest Payout",
          footerHighlight: "+₹1,20,000 Transferred",
          footerHighlightColor: "text-emerald-600",
        },
      },
    ],
  },
  {
    role: "Candidates",
    icon: UserCircle,
    color: "text-emerald-600",
    activeBg: "bg-emerald-600",
    ctaText: "Explore Opportunities with Guaranteed Privacy",
    ctaHref: "/jobs",
    steps: [
      {
        step: "01",
        icon: Bell,
        badge: "Private Invite",
        title: "Receive Referral Invite",
        description: "A trusted recruiter submits you for an exclusive role. You receive a private, secure link to inspect company name, role expectations, and salary bands.",
        illustration: {
          title: "Confidential Referral Invite",
          tag: "Protected Link",
          tagColor: "bg-emerald-100 text-emerald-800",
          line1Label: "Role Matched",
          line1Value: "Head of Infrastructure",
          line2Label: "Company & Range",
          line2Value: "₹45L - ₹55L + ESOP",
          footerText: "Identity Status",
          footerHighlight: "Hidden until you consent",
          footerHighlightColor: "text-amber-600",
        },
      },
      {
        step: "02",
        icon: ShieldCheck,
        badge: "100% Consent-First",
        title: "Review Details & Grant Consent",
        description: "Review all information with full transparency. Accept to share your profile with the hiring team, or decline with zero questions asked and zero spam.",
        illustration: {
          title: "Two-Way Consent Verification",
          tag: "Consent Required",
          tagColor: "bg-indigo-100 text-indigo-800",
          line1Label: "Option A",
          line1Value: "Accept & Share Profile",
          line2Label: "Option B",
          line2Value: "Decline Privately",
          footerText: "Data Governance",
          footerHighlight: "DPDP & GDPR Compliant",
          footerHighlightColor: "text-emerald-600",
        },
      },
      {
        step: "03",
        icon: BarChart3,
        badge: "Live Tracking",
        title: "Follow Your Journey",
        description: "Track your referral progress in real time across screening, interviews, background verification, and formal offer letter stages.",
        illustration: {
          title: "Application Pipeline Status",
          tag: "Offer Extended",
          tagColor: "bg-emerald-100 text-emerald-800",
          line1Label: "Gemini AI Fit Score",
          line1Value: "96% Strong Match",
          line2Label: "Interviews Completed",
          line2Value: "3 of 3 Rounds Passed",
          footerText: "Formal Offer",
          footerHighlight: "₹52 LPA Verified Package",
          footerHighlightColor: "text-indigo-600",
        },
      },
    ],
  },
];

const gradients: Record<string, string> = {
  Companies: "from-indigo-600 to-indigo-500",
  Recruiters: "from-violet-600 to-violet-500",
  Candidates: "from-emerald-600 to-emerald-500",
};

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const flow = flows[active];

  return (
    <section id="how-it-works" className="bg-slate-50/70 border-t border-slate-200/80 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Simple 3-Step Process
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            How QuestEdge works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Three simple, transparent steps tailored for every stakeholder in the referral hiring marketplace.
          </p>
        </div>

        {/* Role Tabs */}
        <div
          role="tablist"
          aria-label="Process flows by audience"
          className="mt-12 flex justify-center gap-3 flex-wrap"
        >
          {flows.map((f, i) => (
            <button
              key={f.role}
              role="tab"
              id={`flow-tab-${f.role.toLowerCase()}`}
              aria-selected={active === i}
              aria-controls={`flow-panel-${f.role.toLowerCase()}`}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                active === i
                  ? `${f.activeBg} text-white shadow-lg shadow-indigo-500/20`
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <f.icon className="h-4 w-4" />
              For {f.role}
            </button>
          ))}
        </div>

        {/* Animated Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            role="tabpanel"
            id={`flow-panel-${flow.role.toLowerCase()}`}
            aria-labelledby={`flow-tab-${flow.role.toLowerCase()}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="mt-16 grid gap-8 lg:grid-cols-3"
          >
            {flow.steps.map((s) => (
              <div
                key={s.step}
                className="relative rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm hover:shadow-md transition-all spring-lift flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[flow.role]} text-white shadow-md shadow-indigo-500/10`}>
                      <s.icon className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                      Step {s.step}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      {s.badge}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.description}</p>
                </div>

                {/* Annotated Workflow UI Illustration */}
                <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 text-xs font-mono space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-semibold text-slate-800 truncate text-[11px]">{s.illustration.title}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${s.illustration.tagColor}`}>
                      {s.illustration.tag}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{s.illustration.line1Label}:</span>
                      <span className="font-bold text-slate-900">{s.illustration.line1Value}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{s.illustration.line2Label}:</span>
                      <span className="font-semibold text-slate-800">{s.illustration.line2Value}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/70 flex items-center justify-between font-sans">
                    <span className="text-slate-500">{s.illustration.footerText}:</span>
                    <span className={`font-semibold ${s.illustration.footerHighlightColor || "text-slate-800"}`}>
                      {s.illustration.footerHighlight}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Contextual Action Callout */}
        <div className="mt-14 text-center">
          {flow.ctaHref.startsWith("/auth") ? (
            <a
              href={flow.ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all hover:gap-3"
            >
              <span>{flow.ctaText}</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <Link
              href={flow.ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all hover:gap-3"
            >
              <span>{flow.ctaText}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
