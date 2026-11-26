"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { publicDiscoverMandates, Mandate } from "@/lib/marketplace-api";
import { MarketplaceCard } from "./marketplace-card";
import { MarketplaceModal } from "./marketplace-modal";

const TEST_NAME_PATTERN = /^(gg|test|demo|sample|dummy|asdf|qwerty|tmp|xxx|\d+)$/i;

function isShowcaseQualityMandate(m: Mandate): boolean {
  const orgName = m.organization?.name?.trim() || "";
  const title = m.title?.trim() || "";
  const desc = m.description?.trim() || "";

  if (orgName.length < 3 || TEST_NAME_PATTERN.test(orgName)) return false;
  if (title.length < 6 || TEST_NAME_PATTERN.test(title)) return false;
  if (desc.length < 35 || /at huge/i.test(desc)) return false;

  const minComp = Number(m.compensationMin || 0);
  const maxComp = Number(m.compensationMax || 0);
  const reward = Number(m.referralRewardAmount || 0);

  return minComp > 0 && maxComp > 0 && reward > 0;
}

// Curated realistic sample mandates used as fallback when live DB has fewer than 3 showcase-ready mandates
const sampleMandates: Mandate[] = [
  {
    id: "sample-1",
    orgId: "org-1",
    title: "Staff Backend Engineer (Go & Kafka)",
    department: "Platform Engineering",
    description:
      "Architect and scale distributed high-throughput event streaming systems handling 2M+ transactions daily. Lead consensus protocol design and database partitioning.",
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
    ownershipPeriodDays: 180,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-1", name: "FinCore Systems" },
    _count: { referrals: 8, applications: 14, participations: 5 },
  },
  {
    id: "sample-2",
    orgId: "org-2",
    title: "Lead AI/ML Systems Engineer",
    department: "Applied AI",
    description:
      "Lead integration of generative LLM pipelines, fine-tuning retrieval augmented generation (RAG) models for enterprise search and automated domain parsing.",
    mandatorySkills: ["Python", "PyTorch", "LangChain", "Vector DBs"],
    preferredSkills: ["CUDA", "FastAPI", "Docker"],
    numberOfOpenings: 1,
    location: "India",
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
    ownershipPeriodDays: 180,
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
    description:
      "Drive self-serve activation, expansion loops, and enterprise billing infrastructure for a fast-scaling developer infrastructure platform.",
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
    ownershipPeriodDays: 180,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organization: { id: "org-3", name: "Pulse Scale Systems" },
    _count: { referrals: 11, applications: 18, participations: 7 },
  },
];

export function LiveMarketplacePreview() {
  const [mandates, setMandates] = useState<Mandate[]>(sampleMandates);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);

  const formatCtc = (min?: number | null, max?: number | null) => {
    const minVal = Number(min || 0);
    const maxVal = Number(max || 0);
    if (minVal <= 0 || maxVal <= 0) return "Competitive";
    return `₹${(minVal / 100000).toFixed(0)}L - ₹${(maxVal / 100000).toFixed(0)}L`;
  };

  const formatBounty = (reward?: number | null) => {
    const val = Number(reward || 0);
    if (val <= 0) return "Bounty on Hire";
    return `₹${val.toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    let isMounted = true;
    publicDiscoverMandates({ limit: 12 })
      .then((res) => {
        if (!isMounted || !res?.data?.length) return;
        const qualityLive = res.data.filter(isShowcaseQualityMandate).slice(0, 3);
        if (qualityLive.length === 0) return;

        // Fill remaining showcase slots (up to 3) with distinct curated mandates if needed
        const combined = [...qualityLive];
        for (const fallback of sampleMandates) {
          if (combined.length >= 3) break;
          if (!combined.some((m) => m.title === fallback.title)) {
            combined.push(fallback);
          }
        }
        setMandates(combined);
      })
      .catch(() => {
        // Keep curated fallback mandates seamlessly
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMandates = mandates
    .filter((m) => {
      const matchesSearch =
        searchQuery === "" ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.mandatorySkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.organization?.name && m.organization.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (activeCategory === "high-bounty") {
        return matchesSearch && (Number(m.referralRewardAmount) || 0) >= 90000;
      }
      if (activeCategory === "remote") {
        return matchesSearch && m.workModel?.toLowerCase() === "remote";
      }
      return matchesSearch;
    })
    .slice(0, 3);

  return (
    <section id="marketplace-preview" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-100">
            Live Marketplace Discovery
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Explore active mandates &amp; verified bounty pools
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Browse company mandates, lock exclusive claim scopes, and submit pre-screened talent with milestone-backed payouts.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filter mandates by category"
            className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0"
          >
            <button
              role="tab"
              id="mandates-tab-all"
              aria-selected={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              Featured ({mandates.length})
            </button>
            <button
              role="tab"
              id="mandates-tab-high-bounty"
              aria-selected={activeCategory === "high-bounty"}
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
              role="tab"
              id="mandates-tab-remote"
              aria-selected={activeCategory === "remote"}
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
              aria-label="Search mandates by role, skill, or company"
              placeholder="Search by role, skill, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Single 3-card row */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMandates.map((m, i) => (
            <MarketplaceCard
              key={m.id}
              mandate={m}
              index={i}
              onViewRole={(selected) => setSelectedMandate(selected)}
              formatCtc={formatCtc}
              formatBounty={formatBounty}
            />
          ))}
        </div>

        {/* Compact Action Row */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            <span>Browse all open mandates</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="/auth/login?returnTo=/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all"
          >
            <span>Post a Mandate — Zero Upfront Retainer</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* In-Page Quick-View Mandate Modal */}
      <AnimatePresence>
        {selectedMandate && (
          <MarketplaceModal
            mandate={selectedMandate}
            onClose={() => setSelectedMandate(null)}
            formatCtc={formatCtc}
            formatBounty={formatBounty}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
