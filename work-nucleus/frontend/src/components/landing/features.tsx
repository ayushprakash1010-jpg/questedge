"use client";

import { motion } from "framer-motion";
import {
  Building2, Target, UserCircle,
  FileText, Gift, Search, BarChart3, ShieldCheck, Inbox,
  Network, DollarSign, Sparkles, Bell, Eye, CheckCircle,
  Lock, Clock, FileCheck2, Zap
} from "lucide-react";

const companyFeatures = [
  {
    icon: FileText,
    title: "Structured Mandate Publishing",
    description: "Define job roles, required skills, salary bands, and performance referral bounties in minutes."
  },
  {
    icon: Sparkles,
    title: "Gemini AI Candidate Screening",
    description: "Auto-evaluates every referred candidate's resume against mandate criteria with fit percentages and skill gap analysis."
  },
  {
    icon: Inbox,
    title: "Referral Inbox & SLA Nudges",
    description: "Manage candidate referrals with time-stamped status updates, recruiter notes, and 48-hour review nudges."
  },
  {
    icon: BarChart3,
    title: "5-Stage Pipeline Funnel",
    description: "Track conversion rates across Referred → Consented → Screened → Interviewed → Hired with time-to-hire velocity."
  },
  {
    icon: Gift,
    title: "Escrow Reward Distribution",
    description: "Monitor reward commitments across Potential, Pending Approval, and Approved statuses. Pay only on tenure completion."
  },
];

const recruiterFeatures = [
  {
    icon: Search,
    title: "Marketplace Mandate Discovery",
    description: "Search open company mandates filtered by domain, location, compensation, and bounty payout rewards."
  },
  {
    icon: Clock,
    title: "48-Hour Claim Scope Exclusivity",
    description: "Lock candidate referral scopes for 48 hours to protect your placement rights and prevent duplicate submissions."
  },
  {
    icon: Network,
    title: "Hash-Shielded Candidate Referrals",
    description: "Submit candidate referrals securely. SHA-256 hashing prevents collisions while safeguarding candidate privacy."
  },
  {
    icon: DollarSign,
    title: "Real-Time Bounty Wallet",
    description: "Track potential, eligible, pending approval, and paid earnings with transparent payout timelines."
  },
  {
    icon: Bell,
    title: "Live Lifecycle Notifications",
    description: "Receive instant updates when your candidate consents, advances to interview, receives an offer, or is hired."
  },
];

const candidateFeatures = [
  {
    icon: Eye,
    title: "Two-Way Consent Verification",
    description: "Inspect full role details — company name, salary range, and job expectations — before consenting to share your profile."
  },
  {
    icon: Sparkles,
    title: "AI Resume Extraction",
    description: "Upload your resume PDF to instantly extract your professional experience, top skills, and links with zero manual typing."
  },
  {
    icon: ShieldCheck,
    title: "DPDP & GDPR Data Privacy",
    description: "Full compliance with DPDP Section 11 and GDPR Article 20, including one-click data export and right-to-be-forgotten erasure."
  },
  {
    icon: BarChart3,
    title: "Live Application Tracking",
    description: "Follow your referral progress transparently through screening, interviews, background verification, and offers."
  },
  {
    icon: UserCircle,
    title: "Portable Candidate Profile",
    description: "Maintain a verified talent profile that trusted recruiters can match to multiple exclusive opportunities with your consent."
  },
];

const roles = [
  {
    id: "for-companies",
    icon: Building2,
    role: "For Companies",
    tagline: "Hire verified talent faster with trusted recruiter networks",
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
    tagline: "Monetize your network with 48h protected claim scopes",
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
    tagline: "Get referred with consent-first privacy and AI match insights",
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
            Comprehensive Platform Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for every side of the{" "}
            <span className="text-indigo-600">talent ecosystem</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            QuestEdge delivers purpose-built workflows for companies, independent recruiters, and candidates with automated compliance and escrow protection.
          </p>
        </div>

        {/* Role panels */}
        <div className="mt-20 space-y-20">
          {roles.map((role) => (
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
                    className={`rounded-2xl border ${role.border} ${role.bg} p-5 transition-all hover:shadow-md hover:border-slate-300`}
                  >
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${role.color} shadow-sm`}>
                      <feat.icon className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-slate-900">{feat.title}</h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{feat.description}</p>
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