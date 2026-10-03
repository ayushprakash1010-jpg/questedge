"use client";

import { motion } from "framer-motion";
import {
  Building2, Target, UserCircle,
  FileText, Gift, Search, BarChart3, ShieldCheck, Inbox,
  Network, DollarSign, Sparkles, Bell, Eye, CheckCircle,
} from "lucide-react";

const companyFeatures = [
  { icon: FileText, title: "Post Mandates in Minutes", description: "Define roles, required skills, salary range, and referral rewards in a structured form. Go live instantly." },
  { icon: Gift, title: "Set Referral Rewards", description: "Offer performance-based rewards. Pay only when a referred candidate joins and completes their tenure." },
  { icon: Inbox, title: "Referral Inbox", description: "Review referred candidates in one place. Accept, reject, or move them through your hiring pipeline." },
  { icon: Sparkles, title: "AI Candidate Screening", description: "Auto-score every referred candidate against your mandate criteria before your team reviews them." },
  { icon: BarChart3, title: "Hiring Analytics", description: "Track mandates, active referrals, reward commitments, and pipeline velocity in your real-time dashboard." },
];

const recruiterFeatures = [
  { icon: Search, title: "Browse the Marketplace", description: "Filter open mandates by domain, skills, location, reward amount, and experience level." },
  { icon: Network, title: "One-Click Candidate Referral", description: "Submit candidates from your network in seconds. The platform handles consent collection automatically." },
  { icon: Sparkles, title: "AI Match Engine", description: "Get instant AI suggestions of past candidates from your network who fit a new mandate's requirements." },
  { icon: DollarSign, title: "Earnings Tracker & Wallet", description: "See potential, pending, and confirmed earnings. Track the status of every referral reward in real time." },
  { icon: Bell, title: "Status Notifications", description: "Get notified the moment a candidate you referred is accepted, moves to interview, or is hired." },
];

const candidateFeatures = [
  { icon: CheckCircle, title: "Receive Referral Invites", description: "A recruiter refers you to a role that matches your profile. You get a secure consent link via email." },
  { icon: Eye, title: "Review Before You Consent", description: "See full role details — company, JD, salary band — before deciding whether to accept the referral." },
  { icon: ShieldCheck, title: "Privacy-First Consent", description: "Your profile is only shared with the company after you explicitly accept. Decline anytime, no strings attached." },
  { icon: BarChart3, title: "Track Your Journey", description: "Follow your application status across every stage in real time — interview, offer, onboarding." },
  { icon: UserCircle, title: "Portable Profile", description: "Build a rich profile once. Recruiters can refer you to multiple mandates with your permission." },
];

const roles = [
  {
    id: "for-companies",
    icon: Building2,
    role: "For Companies",
    tagline: "Hire faster with the power of trusted networks",
    color: "from-indigo-500 to-indigo-600",
    accent: "text-indigo-600",
    border: "border-indigo-100",
    bg: "bg-indigo-50/40",
    features: companyFeatures,
  },
  {
    id: "for-recruiters",
    icon: Target,
    role: "For Recruiters",
    tagline: "Monetise your network. Earn on every successful placement",
    color: "from-violet-500 to-violet-600",
    accent: "text-violet-600",
    border: "border-violet-100",
    bg: "bg-violet-50/40",
    features: recruiterFeatures,
  },
  {
    id: "for-candidates",
    icon: UserCircle,
    role: "For Candidates",
    tagline: "Get referred into roles that actually match your career",
    color: "from-emerald-500 to-emerald-600",
    accent: "text-emerald-600",
    border: "border-emerald-100",
    bg: "bg-emerald-50/40",
    features: candidateFeatures,
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export function Features() {
  return (
    <section id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Everything You Need
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for every role in the{" "}
            <span className="text-indigo-600">referral loop</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            QuestEdge is the only platform designed from the ground up for all three sides of referral-based hiring.
          </p>
        </div>

        {/* Role panels */}
        <div className="mt-20 space-y-20">
          {roles.map((role, ri) => (
            <div key={role.id} id={role.id}>
              {/* Role header */}
              <div className="mb-8 flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${role.color} shadow-sm`}>
                  <role.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${role.accent}`}>
                    {role.role}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">{role.tagline}</h3>
                </div>
              </div>

              <motion.div
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5"
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
              >
                {role.features.map((feat) => (
                  <motion.div
                    key={feat.title}
                    variants={item}
                    className={`rounded-2xl border ${role.border} ${role.bg} p-5 transition-all hover:shadow-md`}
                  >
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${role.color} shadow-sm`}>
                      <feat.icon className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-slate-900">{feat.title}</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{feat.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
