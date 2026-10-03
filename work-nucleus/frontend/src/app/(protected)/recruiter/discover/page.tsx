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
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Compass className="h-6 w-6 text-sky-200" />
            <span className="text-sky-200 text-sm font-medium uppercase tracking-wide">Marketplace</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">Discover Mandates</h1>
          <p className="text-sky-100 text-sm">
            {total > 0 ? `${total} active mandates waiting for top talent` : "Browse companies looking to hire"}
          </p>

          {/* Search bar */}
          <div className="mt-5 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, company, or skill..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 text-sm shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-400"
            />
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
