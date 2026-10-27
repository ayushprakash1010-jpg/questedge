"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Target,
  UserCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
  Phone,
  Layers,
  Plus,
  X,
  Compass,
} from "lucide-react";

const RECRUITER_SPECIALIZATIONS = [
  "Software Engineering",
  "Product Management",
  "AI & Data Science",
  "Cloud & DevOps",
  "FinTech & Web3",
  "Design (UX/UI)",
  "Executive Search",
  "Sales & Growth",
];

const CANDIDATE_POPULAR_SKILLS = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "AWS",
  "PostgreSQL",
  "Docker",
  "System Design",
  "Machine Learning",
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<
    "role" | "company-setup" | "recruiter-setup" | "candidate-setup" | "success"
  >("role");
  const [selectedRole, setSelectedRole] = useState<
    "company" | "recruiter" | "candidate" | null
  >(null);

  // Common user state
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Company Form State
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");

  // Recruiter Form State
  const [recruiterHeadline, setRecruiterHeadline] = useState("");
  const [recruiterPhone, setRecruiterPhone] = useState("");
  const [recruiterExp, setRecruiterExp] = useState("");
  const [recruiterSpecs, setRecruiterSpecs] = useState<string[]>([]);

  // Candidate Form State
  const [candidateDesignation, setCandidateDesignation] = useState("");
  const [candidateExp, setCandidateExp] = useState("");
  const [candidateWorkModel, setCandidateWorkModel] = useState("REMOTE");
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
  }, [user, name]);

  const handleRoleContinue = () => {
    if (!selectedRole) return;
    setError("");
    if (selectedRole === "company") {
      setStep("company-setup");
    } else if (selectedRole === "recruiter") {
      setStep("recruiter-setup");
    } else if (selectedRole === "candidate") {
      setStep("candidate-setup");
    }
  };

  const toggleRecruiterSpec = (spec: string) => {
    setRecruiterSpecs((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const toggleCandidateSkill = (skill: string) => {
    setCandidateSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = customSkill.trim();
    if (trimmed && !candidateSkills.includes(trimmed)) {
      setCandidateSkills([...candidateSkills, trimmed]);
      setCustomSkill("");
    }
  };

  async function handleProvisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let payload: any = { role: selectedRole, name };
      let targetDashboard = "/dashboard";

      if (selectedRole === "company") {
        payload = {
          ...payload,
          orgName,
          industry: industry || undefined,
        };
        targetDashboard = "/dashboard";
      } else if (selectedRole === "recruiter") {
        payload = {
          ...payload,
          headline: recruiterHeadline || undefined,
          phone: recruiterPhone || undefined,
          experienceYears: recruiterExp ? parseInt(recruiterExp, 10) : undefined,
          specializations: recruiterSpecs,
        };
        targetDashboard = "/recruiter/dashboard";
      } else if (selectedRole === "candidate") {
        payload = {
          ...payload,
          headline: candidateDesignation
            ? `${candidateDesignation}${candidateExp ? ` with ${candidateExp} yrs exp` : ""}`
            : undefined,
          currentDesignation: candidateDesignation || undefined,
          experienceYears: candidateExp ? parseFloat(candidateExp) : undefined,
          workModel: candidateWorkModel,
          skills: candidateSkills,
        };
        targetDashboard = "/candidate/dashboard";
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Provisioning failed. Please try again.");
      }

      setStep("success");
      // Seamless claim refresh: Hard reload to the target role dashboard
      setTimeout(() => {
        window.location.href = targetDashboard;
      }, 700);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900 via-indigo-900/5 to-transparent -z-10" />
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-10" />
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-violet-500/20 rounded-full blur-3xl -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 relative z-10"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg mb-4">
            <span className="text-xl font-bold text-white">Q</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome to QuestEdge
          </h2>
          <p className="mt-2 text-slate-600">
            {step === "role"
              ? "Let's get your account set up. How will you be using the platform?"
              : "Complete your initial workspace setup in 30 seconds."}
          </p>
        </motion.div>

        <div className="bg-white py-10 px-6 shadow-2xl rounded-3xl border border-slate-100 sm:px-10 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {/* ─── STEP 1: ROLE SELECTION ─── */}
            {step === "role" && (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Company */}
                  <div
                    onClick={() => setSelectedRole("company")}
                    className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                      selectedRole === "company"
                        ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-600/20"
                        : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                    }`}
                  >
                    {selectedRole === "company" && (
                      <div className="absolute top-4 right-4 text-indigo-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 mb-4">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-slate-900">Company</h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Post mandates, set bounty rewards, review screened candidates, and hire top talent.
                    </p>
                  </div>

                  {/* Recruiter */}
                  <div
                    onClick={() => setSelectedRole("recruiter")}
                    className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                      selectedRole === "recruiter"
                        ? "border-violet-600 bg-violet-50 shadow-md ring-2 ring-violet-600/20"
                        : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
                    }`}
                  >
                    {selectedRole === "recruiter" && (
                      <div className="absolute top-4 right-4 text-violet-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 mb-4">
                      <Target className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-slate-900">Recruiter</h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Refer candidates from your network to open mandates and earn guaranteed payout bounties.
                    </p>
                  </div>

                  {/* Candidate */}
                  <div
                    onClick={() => setSelectedRole("candidate")}
                    className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                      selectedRole === "candidate"
                        ? "border-emerald-600 bg-emerald-50 shadow-md ring-2 ring-emerald-600/20"
                        : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                    }`}
                  >
                    {selectedRole === "candidate" && (
                      <div className="absolute top-4 right-4 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                      <UserCircle className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-slate-900">Candidate</h3>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Build your profile, consent to curated referrals, track offers, and discover top roles.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleRoleContinue}
                    disabled={!selectedRole}
                    className="group flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    Continue Setup
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2A: COMPANY SETUP ─── */}
            {step === "company-setup" && (
              <motion.div
                key="company-setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStep("role")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Company Workspace Setup</h3>
                    <p className="text-sm text-slate-500">Configure your company identity to start posting mandates.</p>
                  </div>
                </div>

                <form onSubmit={handleProvisionSubmit} className="space-y-5 max-w-lg mx-auto">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Your Full Name</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. Priya Sharma"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Organization Name</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. Acme Technologies"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Industry <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. FinTech / Enterprise SaaS"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 p-3 border border-red-100 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/20"
                    >
                      {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "Create Company Workspace"
                      )}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-4">
                      By continuing, you agree to our Terms of Service and Multi-tenant Privacy Policy.
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── STEP 2B: RECRUITER SETUP ─── */}
            {step === "recruiter-setup" && (
              <motion.div
                key="recruiter-setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStep("role")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Recruiter Profile Setup</h3>
                    <p className="text-sm text-slate-500">Configure your recruiter handle to claim bounties and refer candidates.</p>
                  </div>
                </div>

                <form onSubmit={handleProvisionSubmit} className="space-y-5 max-w-lg mx-auto">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="e.g. Alex Morgan"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Professional Headline
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Sparkles className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        value={recruiterHeadline}
                        onChange={(e) => setRecruiterHeadline(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="e.g. Tech Talent Partner | 7+ yrs in SaaS & AI"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={recruiterExp}
                        onChange={(e) => setRecruiterExp(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Phone <span className="font-normal text-slate-400">(Optional)</span>
                      </label>
                      <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="tel"
                          value={recruiterPhone}
                          onChange={(e) => setRecruiterPhone(e.target.value)}
                          className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          placeholder="+1 555-0199"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Primary Recruiting Niches
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {RECRUITER_SPECIALIZATIONS.map((spec) => {
                        const active = recruiterSpecs.includes(spec);
                        return (
                          <button
                            type="button"
                            key={spec}
                            onClick={() => toggleRecruiterSpec(spec)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              active
                                ? "bg-violet-600 text-white shadow-sm ring-1 ring-violet-600"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {spec}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 p-3 border border-red-100 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-50 shadow-md shadow-violet-600/20"
                    >
                      {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "Activate Recruiter Workspace"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── STEP 2C: CANDIDATE SETUP ─── */}
            {step === "candidate-setup" && (
              <motion.div
                key="candidate-setup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStep("role")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Candidate Quick-Start</h3>
                    <p className="text-sm text-slate-500">Set your preferences so top recruiters can match you to mandates.</p>
                  </div>
                </div>

                <form onSubmit={handleProvisionSubmit} className="space-y-5 max-w-lg mx-auto">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="e.g. Rohan Gupta"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Current Role / Title
                      </label>
                      <input
                        value={candidateDesignation}
                        onChange={(e) => setCandidateDesignation(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="e.g. Lead Frontend Eng"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={candidateExp}
                        onChange={(e) => setCandidateExp(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="e.g. 6.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Work Preference
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "REMOTE", label: "Remote" },
                        { id: "HYBRID", label: "Hybrid" },
                        { id: "ONSITE", label: "On-site" },
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setCandidateWorkModel(item.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                            candidateWorkModel === item.id
                              ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Top Skills
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {CANDIDATE_POPULAR_SKILLS.map((sk) => {
                        const active = candidateSkills.includes(sk);
                        return (
                          <button
                            type="button"
                            key={sk}
                            onClick={() => toggleCandidateSkill(sk)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                              active
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {sk}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={customSkill}
                        onChange={(e) => setCustomSkill(e.target.value)}
                        onKeyDown={addCustomSkill}
                        placeholder="Add another skill & press Enter"
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomSkill}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 p-3 border border-red-100 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20"
                    >
                      {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "Launch Candidate Portal"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── STEP 3: PROVISIONING SUCCESS & CLAIM REFRESH ─── */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-4 animate-bounce">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Workspace Ready!</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Provisioning your profile and refreshing session claims...
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-cyan-500 animate-pulse w-full" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
