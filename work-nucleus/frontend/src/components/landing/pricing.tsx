"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const companyPlans = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    description: "Get started with referral hiring at zero upfront cost.",
    features: [
      "Up to 2 active mandates",
      "Unlimited recruiters can apply",
      "Basic referral inbox",
      "Candidate consent flow",
      "Email support",
    ],
    cta: "Post Your First Mandate",
    popular: false,
    href: "/auth/login",
  },
  {
    name: "Growth",
    price: "₹999",
    period: "/mo",
    description: "For teams actively scaling their referral hiring engine.",
    features: [
      "Unlimited mandates",
      "AI candidate screening & scoring",
      "Full hiring analytics dashboard",
      "Reward tracking & management",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
    href: "/auth/login",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with compliance, scale, and integration needs.",
    features: [
      "Everything in Growth",
      "Dedicated CSM",
      "Custom mandate workflows",
      "Audit logging & compliance",
      "SSO & RBAC",
      "API access",
    ],
    cta: "Talk to Sales",
    popular: false,
    href: "/contact",
  },
];

const recruiterPlans = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    description: "Start earning from your network immediately.",
    features: [
      "Browse all open mandates",
      "Up to 5 referrals/month",
      "Earnings tracker",
      "Email notifications",
    ],
    cta: "Join as Recruiter",
    popular: false,
    href: "/auth/login",
  },
  {
    name: "Pro",
    price: "₹299",
    period: "/mo",
    description: "For power recruiters who refer at scale.",
    features: [
      "Unlimited referrals",
      "AI candidate match suggestions",
      "Priority mandate access",
      "Advanced earnings analytics",
      "Priority support",
    ],
    cta: "Go Pro",
    popular: true,
    href: "/auth/login",
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
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-1 text-xs font-semibold text-white">
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
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Pay only for results
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No upfront fees. No agency retainers. Only pay when a referred candidate joins.
          </p>
        </div>

        {/* No hire no fee banner */}
        <div className="mt-10 mx-auto max-w-2xl rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-5 text-center text-white shadow-lg">
          <span className="text-lg font-bold">💡 No Hire, No Fee</span>
          <span className="ml-3 text-sm text-indigo-100">Companies pay the referral reward only after a successful placement + tenure completion.</span>
        </div>

        {/* Company Plans */}
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-semibold text-indigo-700">For Companies</span>
            <p className="text-sm text-slate-500">Monthly subscription for mandate management</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {companyPlans.map((plan, i) => <PlanCard key={plan.name} plan={plan} i={i} />)}
          </div>
        </div>

        {/* Recruiter Plans */}
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-full bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-700">For Recruiters</span>
            <p className="text-sm text-slate-500">Plus earn referral rewards on every successful placement</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 max-w-2xl">
            {recruiterPlans.map((plan, i) => <PlanCard key={plan.name} plan={plan} i={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

