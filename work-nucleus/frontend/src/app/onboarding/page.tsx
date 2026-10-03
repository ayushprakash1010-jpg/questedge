"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Target, UserCircle, ArrowRight,
  Briefcase, CheckCircle2, ChevronLeft
} from "lucide-react";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();

  // "role", "company-setup"
  const [step, setStep] = useState<"role" | "company-setup">("role");
  const [selectedRole, setSelectedRole] = useState<"company" | "recruiter" | "candidate" | null>(null);
  
  // Company Form State
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
  }, [user, name]);

  const handleRoleContinue = () => {
    if (!selectedRole) return;
    
    if (selectedRole === "company") {
      setStep("company-setup");
    } else if (selectedRole === "recruiter") {
      router.push("/recruiter/profile");
    } else if (selectedRole === "candidate") {
      router.push("/candidate/profile");
    }
  };

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, industry, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Provisioning failed");
      }

      window.location.href = "/dashboard"; // Forces a hard reload to pick up new session claims
    } catch (err: any) {
      setError(err.message);
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
          className="text-center mb-8"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg mb-4">
            <span className="text-xl font-bold text-white">W</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome to QuestEdge
          </h2>
          <p className="mt-2 text-indigo-100">
            Let's get your account set up. How will you be using the platform?
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
                        ? "border-indigo-600 bg-indigo-50 shadow-md"
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
                      Post mandates, set referral rewards, and hire top talent securely.
                    </p>
                  </div>

                  {/* Recruiter */}
                  <div
                    onClick={() => setSelectedRole("recruiter")}
                    className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                      selectedRole === "recruiter"
                        ? "border-violet-600 bg-violet-50 shadow-md"
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
                      Refer candidates from your network to open mandates and earn payouts.
                    </p>
                  </div>

                  {/* Candidate */}
                  <div
                    onClick={() => setSelectedRole("candidate")}
                    className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                      selectedRole === "candidate"
                        ? "border-emerald-600 bg-emerald-50 shadow-md"
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
                      Build your profile, receive targeted referrals, and find your next role.
                    </p>
                  </div>

                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleRoleContinue}
                    disabled={!selectedRole}
                    className="group flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2: COMPANY SETUP ─── */}
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
                    onClick={() => setStep("role")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Company Details</h3>
                    <p className="text-sm text-slate-500">Set up your workspace to start posting mandates.</p>
                  </div>
                </div>

                <form onSubmit={handleCompanySubmit} className="space-y-5 max-w-lg mx-auto">
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
                        placeholder="e.g. John Doe"
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
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Industry <span className="font-normal text-slate-400">(Optional)</span></label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. Technology"
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
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "Create Workspace"
                      )}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-4">
                      By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
