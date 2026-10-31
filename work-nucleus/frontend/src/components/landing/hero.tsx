"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Shield, DollarSign, Lock } from "lucide-react";
import { HeroProductPreview } from "./hero-product-preview";

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

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8 lg:pt-24 lg:pb-28">
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
      </div>
    </section>
  );
}
