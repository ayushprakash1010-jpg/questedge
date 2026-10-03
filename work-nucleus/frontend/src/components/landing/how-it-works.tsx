"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Target, UserCircle, FileText, Users, CheckCircle, DollarSign, Search, Bell, ShieldCheck, BarChart3 } from "lucide-react";

const flows = [
  {
    role: "Companies",
    icon: Building2,
    color: "text-indigo-600",
    activeBg: "bg-indigo-600",
    steps: [
      { step: "01", icon: FileText, title: "Post a Mandate", description: "Define the role, required skills, salary band, and referral reward amount. Your mandate goes live on the marketplace instantly." },
      { step: "02", icon: Users, title: "Recruiters Apply & Refer", description: "Verified independent recruiters browse your mandate and submit pre-vetted candidates from their trusted networks with consent already collected." },
      { step: "03", icon: CheckCircle, title: "Review & Hire — Pay on Results", description: "Screen referrals in your inbox, move candidates through your pipeline, and pay the reward only after a successful hire." },
    ],
  },
  {
    role: "Recruiters",
    icon: Target,
    color: "text-violet-600",
    activeBg: "bg-violet-600",
    steps: [
      { step: "01", icon: Search, title: "Browse the Marketplace", description: "Filter open mandates by industry, skills, location, and reward amount. Join the ones where your network gives you an edge." },
      { step: "02", icon: Users, title: "Refer Your Network", description: "Submit a candidate in seconds. The platform sends them a secure consent link so their profile is only shared with the company once they approve." },
      { step: "03", icon: DollarSign, title: "Earn on Every Placement", description: "Track your referral's journey through the pipeline. When they're hired and complete their tenure, your reward is released to your wallet." },
    ],
  },
  {
    role: "Candidates",
    icon: UserCircle,
    color: "text-emerald-600",
    activeBg: "bg-emerald-600",
    steps: [
      { step: "01", icon: Bell, title: "Receive a Referral Invite", description: "A recruiter who knows your work submits you for a role. You get a secure link to review the full details — company, role, compensation." },
      { step: "02", icon: ShieldCheck, title: "Review & Give Consent", description: "Read everything before deciding. Accept the referral and your profile is shared. Decline it — no questions asked, no spam." },
      { step: "03", icon: BarChart3, title: "Track Your Journey", description: "Follow your application status in real time through every stage — screening, interviews, offer, and onboarding." },
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
    <section id="how-it-works" className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Simple Process
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How QuestEdge works
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Three simple steps — for every role in the marketplace.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="mt-12 flex justify-center gap-3 flex-wrap">
          {flows.map((f, i) => (
            <button
              key={f.role}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                active === i
                  ? `${f.activeBg} text-white shadow-lg`
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <f.icon className="h-4 w-4" />
              For {f.role}
            </button>
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="mt-16 grid gap-8 lg:grid-cols-3"
          >
            {flow.steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < flow.steps.length - 1 && (
                  <div className="absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-slate-300 to-transparent lg:block" />
                )}
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[flow.role]} shadow-lg`}>
                  <s.icon className="h-7 w-7 text-white" />
                </div>
                <div className={`mt-2 text-xs font-bold uppercase tracking-widest ${flow.color}`}>
                  Step {s.step}
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.description}</p>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}