"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Building2, Target, ShieldCheck, Zap, ArrowRight, Award } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  href: string;
  tag?: string;
}

const companyPlans: Plan[] = [
  {
    name: "Pay-on-Hire (Free)",
    price: "₹0",
    period: "",
    description: "Start referral hiring with zero upfront retainer. Pay only when a candidate stays 90 days.",
    features: [
      "Up to 2 active mandates",
      "Unlimited recruiter referrals",
      "Referral inbox with 48h SLA nudges",
      "Two-way candidate consent verification",
      "Standard email support",
    ],
    cta: "Post Your First Mandate",
    popular: false,
    href: "/auth/login?returnTo=/dashboard",
  },
  {
    name: "Growth Workspace",
    price: "₹999",
    period: "/mo",
    description: "For scaling engineering and product teams that need AI candidate screening and full funnel metrics.",
    features: [
      "Unlimited active mandates",
      "Gemini AI candidate fit screening",
      "5-Stage hiring funnel analytics",
      "Milestone-backed bounty lifecycle",
      "Candidate BGV verification pre-check",
      "Priority customer support",
    ],
    cta: "Start 14-Day Free Trial",
    popular: true,
    href: "/auth/login?returnTo=/dashboard",
    tag: "Recommended for Teams",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations needing custom bounty agreements, DPDP data governance, and custom SLAs.",
    features: [
      "Everything in Growth",
      "Dedicated talent partner manager",
      "Custom compensation & mandate approvals",
      "Audit trail logging & DPDP compliance",
      "Multi-tenant RBAC & SSO integration",
      "REST API & webhook data export",
    ],
    cta: "Talk to Sales",
    popular: false,
    href: "/contact",
  },
];

const recruiterPlans: Plan[] = [
  {
    name: "Independent Recruiter",
    price: "₹0",
    period: "",
    description: "Free to join. Start monetizing your technical network with protected claim scopes.",
    features: [
      "Browse all verified company mandates",
      "48-hour exclusive claim scope locks",
      "Real-time bounty wallet tracker",
      "Candidate consent email verification",
      "Direct payout to registered bank account",
      "SHA-256 duplicate collision guard",
    ],
    cta: "Join as Recruiter",
    popular: false,
    href: "/auth/login?returnTo=/recruiter/dashboard",
  },
  {
    name: "Talent Partner Pro",
    price: "₹299",
    period: "/mo",
    description: "For agency recruiters and high-volume talent partners aiming to scale referral earnings.",
    features: [
      "Unlimited simultaneous claim scopes",
      "Gemini AI network candidate matching",
      "Early marketplace mandate access",
      "Advanced placement velocity analytics",
      "Verified Recruiter badge on profile",
      "Fast-track payout processing",
      "Dedicated account manager",
    ],
    cta: "Activate Partner Pro",
    popular: true,
    href: "/auth/login?returnTo=/recruiter/dashboard",
    tag: "For High-Volume Partners",
  },
];

function PlanCard({ plan, role }: { plan: Plan; role: "companies" | "recruiters" }) {
  const isPrimary = plan.popular;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl border p-8 transition-all hover:shadow-xl ${
        isPrimary
          ? role === "companies"
            ? "border-indigo-600 bg-white shadow-xl shadow-indigo-100/50 ring-2 ring-indigo-600"
            : "border-violet-600 bg-white shadow-xl shadow-violet-100/50 ring-2 ring-violet-600"
          : "border-slate-200/90 bg-white hover:border-slate-300 shadow-sm"
      }`}
    >
      {plan.tag && (
        <div
          className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white shadow-sm ${
            role === "companies"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500"
              : "bg-gradient-to-r from-violet-600 to-violet-500"
          }`}
        >
          {plan.tag}
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
        <p className="mt-2 text-xs text-slate-500 min-h-[36px]">{plan.description}</p>

        <div className="mt-6 flex items-baseline border-b border-slate-100 pb-6">
          <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
          {plan.period && <span className="ml-1 text-sm font-semibold text-slate-500">{plan.period}</span>}
        </div>

        <ul className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-700">
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${role === "companies" ? "text-indigo-600" : "text-violet-600"}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100">
        {plan.href.startsWith("/auth") ? (
          <a
            href={plan.href}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all shadow-sm ${
              isPrimary
                ? role === "companies"
                  ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20"
                  : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-500/20"
                : "border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span>{plan.cta}</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
          <Link
            href={plan.href}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all shadow-sm ${
              isPrimary
                ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20"
                : "border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <span>{plan.cta}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function Pricing() {
  const [activeTab, setActiveTab] = useState<"companies" | "recruiters">("companies");

  return (
    <section id="pricing" className="bg-slate-50/70 border-t border-slate-200/80 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Transparent Pricing
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Pay only for verified hiring outcomes
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Zero upfront retainers. Companies set their own bounty pools and pay only upon confirmed tenure completion.
          </p>
        </div>

        {/* Milestone-Backed Bounty Lifecycle Banner */}
        <div className="mt-10 mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 px-8 py-5 text-center text-white shadow-lg border border-indigo-800/60">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-indigo-300">
            <Award className="h-4 w-4 text-indigo-400" />
            <span>Milestone-Protected Bounty Security</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed max-w-xl mx-auto">
            Rewards are tracked across Potential → Eligible → Pending Approval → Approved stages and paid out securely upon confirmed 60-90 days retention.
          </p>
        </div>

        {/* Interactive Segmented Role Switcher */}
        <div className="mt-12 flex justify-center">
          <div
            role="tablist"
            aria-label="Pricing audience plans"
            className="inline-flex rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-sm"
          >
            <button
              role="tab"
              id="pricing-tab-companies"
              aria-selected={activeTab === "companies"}
              aria-controls="pricing-panel-companies"
              onClick={() => setActiveTab("companies")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "companies"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>For Companies (Workspace Plans)</span>
            </button>
            <button
              role="tab"
              id="pricing-tab-recruiters"
              aria-selected={activeTab === "recruiters"}
              aria-controls="pricing-panel-recruiters"
              onClick={() => setActiveTab("recruiters")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === "recruiters"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Target className="h-4 w-4" />
              <span>For Recruiters (Talent Partner Plans)</span>
            </button>
          </div>
        </div>

        {/* Plan Cards Switcher with Framer Motion */}
        <div className="mt-12">
          <AnimatePresence mode="wait">
            {activeTab === "companies" ? (
              <motion.div
                key="company-plans"
                role="tabpanel"
                id="pricing-panel-companies"
                aria-labelledby="pricing-tab-companies"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto"
              >
                {companyPlans.map((plan) => (
                  <PlanCard key={plan.name} plan={plan} role="companies" />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="recruiter-plans"
                role="tabpanel"
                id="pricing-panel-recruiters"
                aria-labelledby="pricing-tab-recruiters"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto"
              >
                {recruiterPlans.map((plan) => (
                  <PlanCard key={plan.name} plan={plan} role="recruiters" />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
