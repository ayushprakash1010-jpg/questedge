"use client";

import { motion } from "framer-motion";
import { Star, Building2, Target, UserCircle, CheckCircle2, Shield, Lock, Award } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  avatarBg: string;
  tag: string;
  tagColor: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Replacing legacy agency retainers with QuestEdge's performance bounties saved our engineering organization over ₹18 Lakhs in Q3 alone. The Gemini AI candidate fit engine filters out 90% of resume noise before our hiring managers ever see a profile, and paying strictly after a hire completes their 90-day tenure gives our executive team total financial predictability.",
    name: "Dr. Shiv Kumar",
    role: "Managing Director · VIP & Enterprise Hiring Partner",
    initials: "SK",
    avatarBg: "bg-emerald-600",
    tag: "For Companies",
    tagColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800/60",
  },
  {
    quote:
      "The 48-hour claim scope exclusivity is revolutionary for independent recruiters. In traditional staffing, you constantly battle client circumvention and duplicate submissions. On QuestEdge, the SHA-256 collision lock guarantees my placement credit, and having bounties released directly to my wallet upon confirmed tenure makes it my primary referral channel.",
    name: "Pooja Singh",
    role: "Founder & AI Talent Strategist · GrowYT",
    initials: "PS",
    avatarBg: "bg-violet-600",
    tag: "For Recruiters",
    tagColor: "text-violet-400 bg-violet-950/60 border-violet-800/60",
  },
  {
    quote:
      "I usually ignore recruiter outreach because candidacies are often shopped around without permission. QuestEdge was the first platform where I had complete ownership: I saw the company identity, role expectations, and full compensation range before ever granting consent to share my profile. The entire interview loop was transparent, respectful, and fast.",
    name: "Ayush Prakash",
    role: "Staff Software Engineer · Systems & Infrastructure",
    initials: "AP",
    avatarBg: "bg-amber-600",
    tag: "For Candidates",
    tagColor: "text-amber-400 bg-amber-950/60 border-amber-800/60",
  },
];

const platformGuarantees = [
  {
    icon: Award,
    title: "Tenure-Backed Payouts",
    desc: "Bounties are held safely and distributed only after 60-90 days of confirmed candidate retention.",
  },
  {
    icon: Lock,
    title: "SHA-256 Duplicate Guard",
    desc: "Cryptographic hash protection eliminates candidate collision disputes between recruiters.",
  },
  {
    icon: Shield,
    title: "Two-Way Consent Guarantee",
    desc: "100% DPDP & GDPR compliant. Resumes and candidate contacts are never shared without explicit approval.",
  },
];

export function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-[#0B132B] py-24 sm:py-32 text-white">
      {/* Subtle background ambient glows */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-3.5 py-1 rounded-full border border-cyan-800/60">
            Real Voices Across the Marketplace
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Trusted by hiring leaders, top recruiters, and premier engineers
          </h2>
          <p className="mt-4 text-base text-slate-300">
            See how QuestEdge transforms the hiring transaction for every stakeholder with zero upfront retainers, exclusive claim scopes, and consent-first privacy.
          </p>
        </div>

        {/* 3 Dark Testimonial Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-[#141C2E]/90 p-8 shadow-xl backdrop-blur-sm hover:border-slate-700 transition-all group"
            >
              {/* Header: Giant Quote Mark & Stars */}
              <div>
                <div className="flex items-center justify-between">
                  {/* Decorative Quote Mark */}
                  <span className="font-serif text-5xl font-black leading-none text-cyan-400/30 group-hover:text-cyan-400/50 transition-colors">
                    “
                  </span>

                  {/* 5 Amber Stars */}
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Persona Tag */}
                <div className="mt-4">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${t.tagColor}`}>
                    {t.tag}
                  </span>
                </div>

                {/* Quote Text */}
                <p className="mt-4 text-sm leading-relaxed text-slate-200 font-normal">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author Footer */}
              <div className="mt-8 flex items-center gap-3.5 border-t border-slate-800/80 pt-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.avatarBg} text-sm font-bold text-white shadow-md`}>
                  {t.initials}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-white truncate">{t.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Companion Platform Guarantees Strip */}
        <div className="mt-16 rounded-2xl border border-slate-800 bg-[#0E1726]/80 p-6 sm:p-8 backdrop-blur-sm">
          <div className="grid gap-6 md:grid-cols-3">
            {platformGuarantees.map((g) => (
              <div key={g.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <g.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{g.title}</h4>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
