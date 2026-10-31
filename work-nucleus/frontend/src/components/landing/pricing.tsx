"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const companyPlans = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    description: "Get started with referral hiring at zero upfront retainer.",
    features: [
      "Up to 2 active mandates",
      "Unlimited recruiters can apply",
      "Referral inbox with 48h SLA nudges",
      "Two-way candidate consent flow",
      "Standard email support",
    ],
    cta: "Post Your First Mandate",
    popular: false,
    href: "/auth/login?returnTo=/dashboard",
  },
  {
    name: "Growth",
    price: "₹999",
    period: "/mo",
    description: "For scaling teams that need AI candidate screening and full funnel metrics.",
    features: [
      "Unlimited active mandates",
      "Gemini AI candidate fit screening",
      "5-Stage hiring funnel analytics",
      "Reward distribution breakdown",
      "Candidate BGV verification pre-check",
      "Priority customer support",
    ],
    cta: "Start Free Trial",
    popular: true,
    href: "/auth/login?returnTo=/dashboard",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations needing custom bounty terms, DPDP compliance, and dedicated support.",
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

const recruiterPlans = [
  {
    name: "Independent Recruiter",
    price: "₹0",
    period: "",
    description: "Free to join. Start monetizing your network immediately.",
    features: [
      "Browse all verified company mandates",
      "48-hour exclusive claim scope locks",
      "Real-time bounty wallet tracker",
      "Candidate consent email verification",
      "Direct payout to registered bank account",
    ],
    cta: "Join as Recruiter",
    popular: false,
    href: "/auth/login?returnTo=/recruiter/dashboard",
  },
  {
    name: "Talent Partner Pro",
    price: "₹299",
    period: "/mo",
    description: "For agency recruiters and high-volume talent partners.",
    features: [
      "Unlimited simultaneous claim scopes",
      "Gemini AI network candidate matching",
      "Early marketplace mandate access",
      "Advanced placement velocity analytics",
      "Verified Recruiter badge on profile",
      "Fast-track payout processing",
    ],
    cta: "Activate Partner Pro",
    popular: true,
    href: "/auth/login?returnTo=/recruiter/dashboard",
  },
];

function PlanCard({ plan, i }: { plan: typeof companyPlans[0]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: i * 0.1 }}
      className={`relative rounded-2xl border p-8 ${
        plan.popular
          ? "border-indigo-600 bg-white shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-600"
          : "border-slate-200 bg-white"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-1 text-xs font-semibold text-white shadow-sm">
          Most Popular
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
      <div className="mt-4 flex items-baseline">
        <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
        {plan.period && <span className="ml-1 text-sm text-slate-500">{plan.period}</span>}
      </div>
      <p className="mt-3 text-sm text-slate-600">{plan.description}</p>
      <ul className="mt-8 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span className="text-sm text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>
      {plan.href.startsWith("/auth") ? (
        <a
          href={plan.href}
          className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all ${
            plan.popular
              ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
              : "border border-slate-300 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
          }`}
        >
          {plan.cta}
        </a>
      ) : (
        <Link
          href={plan.href}
          className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all ${
            plan.popular
              ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
              : "border border-slate-300 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
          }`}
        >
          {plan.cta}
        </Link>
      )}
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Transparent Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Pay only for verified hiring outcomes
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No agency retainers. Companies set their own bounty pools and pay only upon tenure completion.
          </p>
        </div>

        {/* No hire no fee banner */}
        <div className="mt-10 mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-5 text-center text-white shadow-lg">
          <span className="text-lg font-bold">💡 Milestone-Backed Bounty Lifecycle</span>
          <p className="mt-1 text-sm text-indigo-100">
            Rewards are tracked across Potential → Eligible → Pending Approval → Approved stages and paid out securely upon successful tenure completion.
          </p>
        </div>

        {/* Company Plans */}
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700">For Companies</span>
            <p className="text-sm text-slate-500">Workspace plans for posting mandates and tracking candidate pipelines</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {companyPlans.map((plan, i) => <PlanCard key={plan.name} plan={plan} i={i} />)}
          </div>
        </div>

        {/* Recruiter Plans */}
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-full bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-700">For Recruiters</span>
            <p className="text-sm text-slate-500">Free to join with performance rewards on every successful candidate placement</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 max-w-2xl">
            {recruiterPlans.map((plan, i) => <PlanCard key={plan.name} plan={plan} i={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
