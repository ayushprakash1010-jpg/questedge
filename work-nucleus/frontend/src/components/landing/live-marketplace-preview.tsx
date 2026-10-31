"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Building2, MapPin, DollarSign,
  Clock, ArrowRight, ShieldCheck, Briefcase
} from "lucide-react";
import { publicDiscoverMandates, Mandate } from "@/lib/marketplace-api";

// Curated realistic sample mandates for instant, zero-latency showcase
const sampleMandates: Mandate[] = [
  {
    id: "sample-1",
    orgId: "org-1",
    title: "Senior Staff Backend Engineer (Distributed Systems)",
    department: "Platform Engineering",
    description: "Architect and scale distributed high-throughput event streaming systems handling 2M+ transactions daily.",
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
    organization: { id: "org-1", name: "FinTech Infrastructure Core" },
    _count: { referrals: 8, applications: 14, participations: 5 },
  },
  {
    id: "sample-2",
    orgId: "org-2",
    title: "Lead AI/ML Systems Engineer",
    department: "Applied AI",
    description: "Lead integration of generative LLM pipelines, fine-tuning retrieval augmented generation (RAG) models for enterprise search.",
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
    ownershipPeriodDays: 60,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-2", name: "Cognitive Intelligence Labs" },
    _count: { referrals: 5, applications: 9, participations: 3 },
  },
  {
    id: "sample-3",
    orgId: "org-3",
    title: "Principal Frontend Architect (Next.js & Design Systems)",
    department: "User Experience",
    description: "Own the core web architecture and design token pipeline for our multi-tenant SaaS application suite.",
    mandatorySkills: ["TypeScript", "Next.js", "Tailwind CSS", "React 19"],
    preferredSkills: ["Performance Optimization", "Web Vitals", "Radix UI"],
    numberOfOpenings: 1,
    location: "Gurgaon / Hyderabad",
    workModel: "Hybrid",
    employmentType: "Full-time",
    compensationMin: 3800000,
    compensationMax: 5000000,
    currency: "INR",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: 85000,
    referralRewardType: "FIXED",
    ownershipPeriodDays: 90,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-3", name: "CloudScale SaaS Platforms" },
    _count: { referrals: 6, applications: 11, participations: 4 },
  },
];

export function LiveMarketplacePreview() {
  const [mandates, setMandates] = useState<Mandate[]>(sampleMandates);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Attempt to load live backend mandates if available
  useEffect(() => {
    let isMounted = true;
    publicDiscoverMandates({ limit: 6 })
      .then((res) => {
        if (isMounted && res && res.data && res.data.length > 0) {
          setMandates(res.data);
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
              100% Remote
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search skills, role, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
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
                      ₹{((m.compensationMin ?? 0) / 100000).toFixed(0)}L - ₹{((m.compensationMax ?? 0) / 100000).toFixed(0)}L
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">
                      Referral Bounty
                    </span>
                    <span className="text-sm font-extrabold text-indigo-600">
                      ₹{(m.referralRewardAmount ?? 0).toLocaleString("en-IN")}
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
                  <Link
                    href={`/jobs`}
                    className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    <span>View Role</span>
                  </Link>
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
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all"
            >
              <Briefcase className="h-4 w-4" />
              <span>Post a Mandate — Zero Upfront Fees</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

