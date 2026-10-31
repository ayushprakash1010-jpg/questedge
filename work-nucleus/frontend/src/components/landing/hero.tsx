"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Target, UserCircle, CheckCircle, Shield, DollarSign, Lock } from "lucide-react";
import { HeroProductPreview } from "./hero-product-preview";

const stats = [
  { value: "₹0", label: "Upfront Retainer", sub: "Pay bounties only on verified hires" },
  { value: "48h", label: "Claim Exclusivity", sub: "Protected recruiter referral lock" },
  { value: "100%", label: "Consent Verification", sub: "Two-way opt-in before profile release" },
];

const roleCards = [
  {
    icon: Building2,
    role: "I'm a Company",
    description: "Publish hiring mandates, set performance referral bounties, and review Gemini AI-screened candidate profiles with zero retainers.",
    cta: "Post a Mandate",
    href: "/auth/login?returnTo=/dashboard",
    color: "from-indigo-500 to-indigo-600",
    border: "border-indigo-200 hover:border-indigo-400",
    bg: "hover:bg-indigo-50/50",
    ctaColor: "text-indigo-600 hover:text-indigo-700",
  },
  {
    icon: Target,
    role: "I'm a Recruiter",
    description: "Browse open marketplace mandates, lock 48-hour exclusive claim scopes, and earn guaranteed bounty payouts directly to your wallet.",
    cta: "Join as Recruiter",
    href: "/auth/login?returnTo=/recruiter/dashboard",
    color: "from-violet-500 to-violet-600",
    border: "border-violet-200 hover:border-violet-400",
    bg: "hover:bg-violet-50/50",
    ctaColor: "text-violet-600 hover:text-violet-700",
  },
  {
    icon: UserCircle,
    role: "I'm a Candidate",
    description: "Receive private referral invites, review full role details and compensation before giving consent, and follow your application live.",
    cta: "Explore Opportunities",
    href: "/jobs",
    color: "from-emerald-500 to-emerald-600",
    border: "border-emerald-200 hover:border-emerald-400",
    bg: "hover:bg-emerald-50/50",
    ctaColor: "text-emerald-600 hover:text-emerald-700",
  },
];

const trustItems = [
  { icon: CheckCircle, label: "Vetted Recruiter Network", color: "text-indigo-500" },
  { icon: Shield, label: "Candidate Consent First", color: "text-violet-500" },
  { icon: DollarSign, label: "Milestone-Protected Rewards", color: "text-emerald-500" },
  { icon: Lock, label: "DPDP & GDPR Compliant", color: "text-cyan-600" },
];

export function Hero() {
  return (
    <section className="dot-grid relative overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white">
      {/* Ambient gradient glow orbs */}
      <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-0 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8 lg:pt-24 lg:pb-32">
        {/* Two-Column Asymmetric Hero Split */}
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Core Value Proposition */}
          <div className="lg:col-span-7 text-left">
            {/* Category Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                AI-Powered Referral Hiring Marketplace
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-5.5xl leading-[1.12]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Zero Retainers. Trusted Referrals.{" "}
              <span className="text-gradient">Pay Only When They Stay.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="mt-5 text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              QuestEdge connects high-growth companies with independent recruiters. Publish hiring mandates with performance bounties, screen talent with Gemini AI, and secure explicit candidate consent. Pay only on verified tenure completion.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="mt-8 flex flex-col items-stretch sm:flex-row sm:items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <a
                href="/auth/login?returnTo=/dashboard"
                className="group spring-lift flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 relative"
              >
                <div className="absolute inset-0 rounded-xl bg-indigo-400 opacity-0 blur-lg animate-glow group-hover:opacity-40" />
                <span className="relative z-10 flex items-center gap-2">
                  Post a Mandate
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
              <Link
                href="#how-it-works"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 shadow-sm"
              >
                See How It Works
              </Link>
            </motion.div>

            {/* Trust items row */}
            <motion.div
              className="mt-8 flex items-center gap-x-6 gap-y-2.5 flex-wrap pt-4 border-t border-slate-200/80"
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

          {/* Right Column: Interactive Product Demo Preview */}
          <div className="lg:col-span-5">
            <HeroProductPreview />
          </div>
        </div>

        {/* Role Cards Showcase */}
        <motion.div
          className="mt-20 grid gap-5 sm:grid-cols-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {roleCards.map((card) => (
            <div
              key={card.role}
              className={`group relative rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 ${card.border} hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-sm`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{card.role}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
              {card.href.startsWith("/auth") ? (
                <a
                  href={card.href}
                  className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5 ${card.ctaColor}`}
                >
                  {card.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link
                  href={card.href}
                  className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5 ${card.ctaColor}`}
                >
                  {card.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          ))}
        </motion.div>

        {/* Architectural Truth Pillars */}
        <motion.div
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 border-t border-slate-200/80 pt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center rounded-xl bg-slate-50/60 p-4 border border-slate-100">
              <div className="text-3xl font-extrabold text-indigo-600 sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{stat.label}</div>
              <div className="mt-0.5 text-xs text-slate-600">{stat.sub}</div>
            </div>
          ))}
          <p className="col-span-1 sm:col-span-3 mt-1 text-[11px] text-slate-500 text-center">
            *Performance-backed referral hiring architecture across verified company mandates.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
