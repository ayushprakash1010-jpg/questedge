"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { discoverMandates, joinMandate, leaveMandate, Mandate, MandateFilters } from "@/lib/marketplace-api";
import { MandateCard } from "@/components/marketplace/MandateCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Search,
  SlidersHorizontal,
  Loader2,
  Compass,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

const WORK_MODELS = ["Remote", "Hybrid", "On-site"];
const SKILLS_SUGGESTIONS = [
  "React", "Node.js", "TypeScript", "Python", "Java",
  "AWS", "PostgreSQL", "Machine Learning", "Go", "Kubernetes",
];

export default function RecruiterDiscoverPage() {
  const router = useRouter();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [department, setDepartment] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minReward, setMinReward] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  const debouncedSearch = useRef<NodeJS.Timeout | null>(null);

  const fetchMandates = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const filters: MandateFilters = {
        q: search || undefined,
        location: location || undefined,
        workModel: workModel || undefined,
        department: department || undefined,
        industry: industry || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills.join(",") : undefined,
        minReward: minReward ? Number(minReward) : undefined,
        page: reset ? 1 : page,
        limit: 12,
      };

      const result = await discoverMandates(accessToken, filters);

      if (reset) {
        setMandates(result.data);
        setPage(1);
      } else {
        setMandates((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
      }
      setTotal(result.meta.total);
    } finally {
      setLoading(false);
    }
  }, [search, location, workModel, department, industry, selectedSkills, minReward, page]);

  useEffect(() => {
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
    debouncedSearch.current = setTimeout(() => fetchMandates(true), 300);
    return () => { if (debouncedSearch.current) clearTimeout(debouncedSearch.current); };
  }, [search, location, workModel, department, industry, selectedSkills, minReward]);

  useEffect(() => {
    if (page > 1) fetchMandates(false);
  }, [page]);

  const handleJoin = async (mandateId: string) => {
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const mandate = mandates.find((m) => m.id === mandateId);
      if (mandate?.isJoined) {
        await leaveMandate(accessToken, mandateId);
      } else {
        await joinMandate(accessToken, mandateId);
      }
      setMandates((prev) =>
        prev.map((m) => (m.id === mandateId ? { ...m, isJoined: !m.isJoined } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden bg-slate-900 px-6 py-12 md:py-16">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-500/20 via-slate-900 to-slate-900" />
        <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[80px]" />
        
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30">
                  <Compass className="h-4 w-4" />
                </div>
                <span className="text-sky-400 text-xs font-bold uppercase tracking-wider">Talent Marketplace</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
                Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">High-Reward</span> Mandates
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl">
                {total > 0 
                  ? `Browse ${total} active jobs waiting for top talent. Refer your network and earn massive placement rewards.` 
                  : "Browse top companies actively looking to hire and earn rewards for successful referrals."}
              </p>
            </div>

            {/* Glassmorphic Search Bar */}
            <div className="w-full md:w-[400px] lg:w-[450px]">
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-sky-500/30 to-cyan-500/30 blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
                <div className="relative flex items-center w-full bg-slate-900/80 backdrop-blur-md rounded-xl ring-1 ring-white/10 overflow-hidden shadow-2xl transition-all focus-within:ring-sky-500/50">
                  <div className="pl-4 pr-2 text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by job title, company, or skill..."
                    className="w-full py-3.5 bg-transparent border-0 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar filters */}
        <aside className="w-60 shrink-0 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-5">
            <h3 className="font-semibold text-slate-800 text-sm">Filters</h3>

            {/* Work model */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Work Model</p>
              <div className="space-y-1.5">
                {WORK_MODELS.map((wm) => (
                  <button
                    key={wm}
                    onClick={() => setWorkModel(wm === workModel ? "" : wm)}
                    className={cn(
                      "w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors",
                      workModel === wm
                        ? "bg-sky-50 text-sky-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {wm}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Location</p>
              <Input
                placeholder="e.g. Bangalore"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Department */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Department</p>
              <Input
                placeholder="e.g. Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Industry */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Industry</p>
              <Input
                placeholder="e.g. FinTech"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Skills */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS_SUGGESTIONS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-all",
                      selectedSkills.includes(skill)
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                    )}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Min reward */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Min. Reward (₹)</p>
              <Input
                type="number"
                placeholder="e.g. 25000"
                value={minReward}
                onChange={(e) => setMinReward(e.target.value)}
                className="text-sm"
              />
            </div>

            {(workModel || location || department || industry || selectedSkills.length > 0 || minReward) && (
              <button
                onClick={() => { setWorkModel(""); setLocation(""); setDepartment(""); setIndustry(""); setSelectedSkills([]); setMinReward(""); }}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Result count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {loading ? "Loading..." : `${total} mandate${total !== 1 ? "s" : ""} found`}
            </p>
          </div>

          {loading && mandates.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
            </div>
          ) : mandates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-sky-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No mandates match your filters</h3>
              <p className="text-sm text-slate-400">Try adjusting your search or clearing filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {mandates.map((mandate) => (
                  <MandateCard
                    key={mandate.id}
                    {...mandate}
                    recruiterCount={mandate._count?.participations}
                    viewAs="recruiter"
                    isJoined={mandate.isJoined}
                    onJoin={handleJoin}
                    onClick={(id) => router.push(`/recruiter/mandates/${id}`)}
                  />
                ))}
              </div>

              {/* Load more */}
              {mandates.length < total && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                    Load more mandates
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
