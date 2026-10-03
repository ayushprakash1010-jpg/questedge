"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Target, UserCircle, CheckCircle, Shield, DollarSign } from "lucide-react";

const stats = [
  { value: "₹0", label: "Upfront Cost", sub: "Pay only on successful hires" },
  { value: "3×", label: "Higher Acceptance", sub: "vs cold outreach*" },
  { value: "48h", label: "First Referrals", sub: "Average time to first candidate" },
];

const roleCards = [
  {
    icon: Building2,
    role: "I'm a Company",
    description: "Post mandates, set referral rewards, and review pre-vetted candidates.",
    cta: "Post a Mandate",
    href: "/auth/login",
    color: "from-indigo-500 to-indigo-600",
    border: "border-indigo-200 hover:border-indigo-400",
    bg: "hover:bg-indigo-50/50",
    ctaColor: "text-indigo-600 hover:text-indigo-700",
  },
  {
    icon: Target,
    role: "I'm a Recruiter",
    description: "Browse open mandates, refer your network, and earn performance-based rewards.",
    cta: "Join as Recruiter",
    href: "/auth/login",
    color: "from-violet-500 to-violet-600",
    border: "border-violet-200 hover:border-violet-400",
    bg: "hover:bg-violet-50/50",
    ctaColor: "text-violet-600 hover:text-violet-700",
  },
  {
    icon: UserCircle,
    role: "I'm a Candidate",
    description: "Get referred by trusted recruiters, review role details, and track your journey.",
    cta: "Explore Opportunities",
    href: "/jobs",
    color: "from-emerald-500 to-emerald-600",
    border: "border-emerald-200 hover:border-emerald-400",
    bg: "hover:bg-emerald-50/50",
    ctaColor: "text-emerald-600 hover:text-emerald-700",
  },
];

const trustItems = [
  { icon: CheckCircle, label: "Verified Recruiters", color: "text-indigo-500" },
  { icon: Shield, label: "Candidate Consent First", color: "text-violet-500" },
  { icon: DollarSign, label: "Pay Only on Success", color: "text-emerald-500" },
];

export function Hero() {
  return (
    <section className="dot-grid relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Gradient orbs */}
      <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              ✦ Referral-Based Hiring Marketplace
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            The smarter way to hire —{" "}
            <span className="text-gradient">powered by trusted referrals</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            QuestEdge connects companies with independent recruiters who refer
            pre-vetted candidates. Faster placements. Performance-based rewards.
            Zero agency bloat.
          </motion.p>

          {/* Primary CTAs */}
          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              href="/auth/login"
              className="group spring-lift flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 relative"
            >
              <div className="absolute inset-0 rounded-xl bg-indigo-400 opacity-0 blur-lg animate-glow group-hover:opacity-40" />
              <span className="relative z-10 flex items-center gap-2">
                Post a Mandate
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              See How It Works
            </Link>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            className="mt-8 flex items-center justify-center gap-6 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {trustItems.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                {item.label}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Role Cards */}
        <motion.div
          className="mt-16 grid gap-5 sm:grid-cols-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {roleCards.map((card) => (
            <div
              key={card.role}
              className={`group relative rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 border-slate-200 hover:border-indigo-200 hover:shadow-lg`}
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-sm`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{card.role}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
              <Link
                href={card.href}
                className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5 text-indigo-600 hover:text-indigo-700`}
              >
                {card.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mt-16 grid grid-cols-3 gap-8 border-t border-slate-200 pt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold text-indigo-600 sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{stat.label}</div>
              <div className="mt-0.5 text-xs text-slate-600">{stat.sub}</div>
            </div>
          ))}
          <p className="col-span-3 mt-2 text-[11px] text-slate-500 text-center">
            *Based on early adopter data. Results may vary.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
