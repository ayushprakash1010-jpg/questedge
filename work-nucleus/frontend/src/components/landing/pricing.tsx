"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for small teams getting started with structured hiring.",
    features: [
      "Up to 5 users",
      "3 active hiring plans",
      "50 AI credits / month",
      "Basic Kanban pipeline",
      "Email support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/mo",
    description: "For growing teams that need the full AI-powered hiring suite.",
    features: [
      "Up to 25 users",
      "Unlimited hiring plans",
      "500 AI credits / month",
      "Advanced analytics",
      "AI feedback & scoring",
      "Smart communications",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced security, compliance, and scale needs.",
    features: [
      "Unlimited users",
      "Unlimited everything",
      "Unlimited AI credits",
      "SSO & SAML",
      "Custom integrations",
      "Dedicated success manager",
      "SLA guarantee",
      "On-premise option",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Plans that scale with you
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Start free, upgrade when you need more power. No hidden fees.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
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
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-semibold text-slate-900">
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-slate-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="ml-1 text-sm text-slate-500">
                    {plan.period}
                  </span>
                )}
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
                href={plan.name === "Enterprise" ? "/contact" : "/auth/login"}
                className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                    : "border border-slate-300 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
