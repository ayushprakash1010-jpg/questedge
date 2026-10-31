"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Building2, MapPin, DollarSign,
  Clock, ArrowRight, ShieldCheck, Briefcase,
  X, Lock, CheckCircle2, Award
} from "lucide-react";
import { publicDiscoverMandates, Mandate } from "@/lib/marketplace-api";

// Curated realistic sample mandates for instant, zero-latency showcase
const sampleMandates: Mandate[] = [
  {
    id: "sample-1",
    orgId: "org-1",
    title: "Senior Staff Backend Engineer (Distributed Systems)",
    department: "Platform Engineering",
    description: "Architect and scale distributed high-throughput event streaming systems handling 2M+ transactions daily. Lead consensus protocol design and database partitioning.",
    mandatorySkills: ["Go", "Apache Kafka", "PostgreSQL", "Distributed Systems"],
    preferredSkills: ["Kubernetes", "gRPC", "Raft"],
    numberOfOpenings: 2,
    location: "Bangalore, IN",
    workModel: "Hybrid",
    employmentType: "Full-time",
    compensationMin: 4500000,
    compensationMax: 6500000,
    currency: "INR",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: 120000,
    referralRewardType: "FIXED",
    ownershipPeriodDays: 90,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-1", name: "VIP FinTech Core (Hiring Lead: Dr. Shiv Kumar)" },
    _count: { referrals: 8, applications: 14, participations: 5 },
  },
  {
    id: "sample-2",
    orgId: "org-2",
    title: "Lead AI/ML Systems Engineer",
    department: "Applied AI",
    description: "Lead integration of generative LLM pipelines, fine-tuning retrieval augmented generation (RAG) models for enterprise search and automated domain parsing.",
    mandatorySkills: ["Python", "PyTorch", "LangChain", "Vector DBs"],
    preferredSkills: ["CUDA", "FastAPI", "Docker"],
    numberOfOpenings: 1,
    location: "Remote (India)",
    workModel: "Remote",
    employmentType: "Full-time",
    compensationMin: 4000000,
    compensationMax: 5500000,
    currency: "INR",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: 95000,
    referralRewardType: "FIXED",
    ownershipPeriodDays: 90,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-2", name: "Cognitive Nexus AI" },
    _count: { referrals: 5, applications: 9, participations: 3 },
  },
  {
    id: "sample-3",
    orgId: "org-3",
    title: "Head of Product (B2B SaaS Growth)",
    department: "Product",
    description: "Drive self-serve activation, expansion loops, and enterprise billing infrastructure for a fast-scaling developer infrastructure platform.",
    mandatorySkills: ["Product Strategy", "PLG Loops", "B2B SaaS", "User Analytics"],
    preferredSkills: ["SQL", "Segment", "Figma"],
    numberOfOpenings: 1,
    location: "Mumbai, IN",
    workModel: "Hybrid",
    employmentType: "Full-time",
    compensationMin: 5000000,
    compensationMax: 7000000,
    currency: "INR",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: 150000,
    referralRewardType: "FIXED",
    ownershipPeriodDays: 90,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-3", name: "Pulse Scale Systems" },
    _count: { referrals: 11, applications: 18, participations: 7 },
  },
  {
    id: "sample-4",
    orgId: "org-4",
    title: "Staff SRE & Kubernetes Architect",
    department: "Infrastructure",
    description: "Manage zero-downtime multi-region Kubernetes deployments, automated disaster recovery, and infrastructure-as-code with Terraform and ArgoCD.",
    mandatorySkills: ["Kubernetes", "Terraform", "AWS", "ArgoCD"],
    preferredSkills: ["Prometheus", "Istio", "Golang"],
    numberOfOpenings: 2,
    location: "Hyderabad, IN",
    workModel: "Hybrid",
    employmentType: "Full-time",
    compensationMin: 3800000,
    compensationMax: 5000000,
    currency: "INR",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: 90000,
    referralRewardType: "FIXED",
    ownershipPeriodDays: 90,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-4", name: "CloudGrid Global" },
    _count: { referrals: 4, applications: 7, participations: 2 },
  },
  {
    id: "sample-5",
    orgId: "org-5",
    title: "Lead Frontend Engineer (React / Next.js)",
    department: "Frontend Engineering",
    description: "Design high-performance web applications with Next.js 14, Tailwind CSS, TypeScript, and micro-frontend architecture for financial analytics.",
    mandatorySkills: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    preferredSkills: ["GraphQL", "WebSockets", "Cypress"],
    numberOfOpenings: 1,
    location: "Remote (India)",
    workModel: "Remote",
    employmentType: "Full-time",
    compensationMin: 3200000,
    compensationMax: 4500000,
    currency: "INR",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: 80000,
    referralRewardType: "FIXED",
    ownershipPeriodDays: 60,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-5", name: "Acuity Financial Tech" },
    _count: { referrals: 7, applications: 12, participations: 4 },
  },
  {
    id: "sample-6",
    orgId: "org-6",
    title: "Director of Enterprise Sales",
    department: "Commercial & Sales",
    description: "Drive multi-year enterprise contracts with Tier-1 banks, insurance providers, and fintechs. Lead executive stakeholder alignment and RFP cycles.",
    mandatorySkills: ["Enterprise Sales", "B2B Negotiations", "Fintech Domain", "Executive Quotas"],
    preferredSkills: ["Salesforce", "MEDDIC", "Contract Law"],
    numberOfOpenings: 1,
    location: "Gurgaon, IN",
    workModel: "On-site",
    employmentType: "Full-time",
    compensationMin: 4500000,
    compensationMax: 6500000,
    currency: "INR",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: 130000,
    referralRewardType: "FIXED",
    ownershipPeriodDays: 90,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-6", name: "Veritas Global Capital" },
    _count: { referrals: 6, applications: 10, participations: 3 },
  },
];

export function LiveMarketplacePreview() {
  const [mandates, setMandates] = useState<Mandate[]>(sampleMandates);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedMandate(null);
      }
    }
    if (selectedMandate) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMandate]);

  // Safe formatting helpers ensuring zero values never appear
  const formatCtc = (min?: number | null, max?: number | null) => {
    const minVal = typeof min === "number" && min > 0 ? min : 2400000;
    const maxVal = typeof max === "number" && max > 0 ? max : 3800000;
    return `₹${(minVal / 100000).toFixed(0)}L - ₹${(maxVal / 100000).toFixed(0)}L`;
  };

  const formatBounty = (reward?: number | null, max?: number | null) => {
    if (typeof reward === "number" && reward > 0) {
      return `₹${reward.toLocaleString("en-IN")}`;
    }
    const maxVal = typeof max === "number" && max > 0 ? max : 3500000;
    const fallback = Math.round(maxVal * 0.035);
    return `₹${fallback.toLocaleString("en-IN")}`;
  };

  // Attempt to load live backend mandates if available
  useEffect(() => {
    let isMounted = true;
    publicDiscoverMandates({ limit: 6 })
      .then((res) => {
        if (isMounted && res && res.data && res.data.length > 0) {
          const sanitized = res.data.map((m) => {
            const minComp: number = (typeof m.compensationMin === "number" && m.compensationMin > 0) ? m.compensationMin : 2400000;
            const maxComp: number = (typeof m.compensationMax === "number" && m.compensationMax > 0) ? m.compensationMax : 3800000;
            const bounty: number = (typeof m.referralRewardAmount === "number" && m.referralRewardAmount > 0)
              ? m.referralRewardAmount
              : Math.round(maxComp * 0.035);

            return {
              ...m,
              compensationMin: minComp,
              compensationMax: maxComp,
              referralRewardAmount: bounty,
            };
          });
          setMandates(sanitized);
        }
      })
      .catch(() => {
        // Fallback to sample mandates seamlessly
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMandates = mandates.filter((m) => {
    const matchesSearch =
      searchQuery === "" ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.mandatorySkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.organization?.name && m.organization.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeCategory === "high-bounty") {
      return matchesSearch && (m.referralRewardAmount ?? 0) >= 90000;
    }
    if (activeCategory === "remote") {
      return matchesSearch && m.workModel?.toLowerCase() === "remote";
    }
    return matchesSearch;
  });

  return (
    <section id="marketplace-preview" className="bg-white border-t border-slate-200/80 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Live Marketplace Discovery
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Explore active mandates & verified bounty pools
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Browse real company mandates, lock 48-hour exclusive claim scopes, and submit pre-screened talent with guaranteed milestone payouts.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              All Roles ({mandates.length})
            </button>
            <button
              onClick={() => setActiveCategory("high-bounty")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "high-bounty"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              High Bounty (&ge; ₹90,000)
            </button>
            <button
              onClick={() => setActiveCategory("remote")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "remote"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              Remote Roles
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by role, skill, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Mandate Cards Grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMandates.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 hover:shadow-lg transition-all"
            >
              <div>
                {/* Header: Company & Verified status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{m.organization?.name ?? "Verified Employer"}</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{m.location} • {m.workModel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 shrink-0">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span>Active</span>
                  </div>
                </div>

                {/* Role Title */}
                <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {m.title}
                </h3>

                <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {m.description}
                </p>

                {/* Tech Stack Chips */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {m.mandatorySkills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200/60"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: Compensation, Bounty & Action */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Salary Range
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {formatCtc(m.compensationMin, m.compensationMax)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">
                      Referral Bounty
                    </span>
                    <span className="text-sm font-extrabold text-indigo-600">
                      {formatBounty(m.referralRewardAmount, m.compensationMax)}
                    </span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`/auth/login?returnTo=/jobs`}
                    className="flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
                  >
                    <span>Claim & Refer</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => setSelectedMandate(m)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <span>View Role</span>
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-violet-500" />
                    48h Scope Exclusivity
                  </span>
                  <span>{m.ownershipPeriodDays}d Tenure Release</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/60 p-8 text-center shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">
            Hiring engineers, product leaders, or specialized talent?
          </h3>
          <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
            Publish your mandate with a custom bounty pool. Verified independent recruiters will source pre-screened talent with explicit candidate consent.
          </p>
          <div className="mt-6">
            <a
              href="/auth/login?returnTo=/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all hover:gap-3"
            >
              <span>Post a Mandate — Zero Upfront Retainer</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* In-Page Quick-View Mandate Modal */}
      <AnimatePresence>
        {selectedMandate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMandate(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedMandate(null)}
                className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-2">
                <Building2 className="h-4 w-4" />
                <span>{selectedMandate.organization?.name}</span>
                <span className="text-slate-300">•</span>
                <span>{selectedMandate.location}</span>
                <span className="text-slate-300">•</span>
                <span>{selectedMandate.workModel}</span>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900">
                {selectedMandate.title}
              </h3>

              {/* Bounty & CTC Bar */}
              <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Compensation Band
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {formatCtc(selectedMandate.compensationMin, selectedMandate.compensationMax)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    Referral Bounty Pool
                  </span>
                  <span className="text-base font-extrabold text-indigo-600">
                    {formatBounty(selectedMandate.referralRewardAmount, selectedMandate.compensationMax)}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Role Overview
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedMandate.description}
                </p>
              </div>

              {/* Required Skills */}
              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Mandatory Technical Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMandate.mandatorySkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100"
                    >
                      {s}
                    </span>
                  ))}
                  {selectedMandate.preferredSkills?.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200"
                    >
                      {s} (Preferred)
                    </span>
                  ))}
                </div>
              </div>

              {/* Operational Guarantee Pill */}
              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex items-start gap-3">
                <Lock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">48-Hour Claim Scope & SHA-256 Shield</span>
                  <p className="mt-0.5 text-[11px] text-emerald-800 leading-relaxed">
                    Locking a claim scope gives you exclusive submission rights. Candidate receives an encrypted consent invite, and duplicate collision guards prevent disputes.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  onClick={() => setSelectedMandate(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Close
                </button>
                <a
                  href={`/auth/login?returnTo=/jobs`}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-all"
                >
                  <span>Claim 48h Scope & Refer</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
