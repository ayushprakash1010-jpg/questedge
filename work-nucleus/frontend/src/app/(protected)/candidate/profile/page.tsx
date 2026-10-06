"use client";

import { useEffect, useState } from "react";
import { getCandidateProfile, upsertCandidateProfile, parseResumeText } from "@/lib/marketplace-api";
import { useRouter } from "next/navigation";
import {
  Loader2, Save, CheckCircle2, User, Briefcase, GraduationCap,
  MapPin, ChevronRight, ChevronLeft, Plus, X, ArrowRight, Sparkles,
  DollarSign, Clock, Target, UploadCloud, FileText
} from "lucide-react";

// ── PDF Helper ────────────────────────────────────────────────────
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "//unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + " ";
    
    // Extract hidden hyperlinks from the PDF (e.g., behind text like "GitHub")
    try {
      const annotations = await page.getAnnotations();
      const links = annotations
        .filter((anno: any) => anno.subtype === 'Link' && anno.url)
        .map((anno: any) => anno.url)
        .join(" ");
      if (links) {
        text += "\n[Hidden Links in PDF: " + links + "]\n";
      }
    } catch (e) {
      console.warn("Failed to parse annotations", e);
    }
  }
  return text;
}

// ── Step config ───────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Professional", icon: Briefcase },
  { id: 3, label: "Skills & Education", icon: GraduationCap },
  { id: 4, label: "Preferences", icon: Target },
];

// ── Helpers ───────────────────────────────────────────────────────

function TagInput({
  label, values, onChange, placeholder,
}: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder ?? `Add and press Enter`}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-medium">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="h-3 w-3 hover:text-red-500" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text", className = "",
}: {
  value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white placeholder:text-slate-400 ${className}`}
    />
  );
}

function Select({ value, onChange, children, className = "" }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700 ${className}`}
    >
      {children}
    </select>
  );
}

// ── Main Component ────────────────────────────────────────────────

const emptyProfile = {
  name: "", phone: "", headline: "", currentCompany: "",
  currentDesignation: "", experienceYears: "", skills: [] as string[], education: [] as string[],
  currentLocation: "", preferredLocations: [] as string[],
  currentCtc: "", expectedCtc: "", noticePeriodDays: "",
  preferredRoles: [] as string[], preferredIndustries: [] as string[],
  workModel: "", profileLinks: { linkedin: "", github: "", portfolio: "" },
};

export default function CandidateProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsParsing(true);
      const text = await extractTextFromPDF(file);
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      
      const parsedData = await parseResumeText(accessToken, text);
      if (parsedData) {
        setProfile(p => ({
          ...p,
          name: parsedData.name || p.name,
          phone: parsedData.phone || p.phone,
          currentCompany: parsedData.currentCompany || p.currentCompany,
          currentDesignation: parsedData.currentDesignation || p.currentDesignation,
          experienceYears: parsedData.experienceYears !== undefined && parsedData.experienceYears !== null ? String(parsedData.experienceYears) : p.experienceYears,
          skills: parsedData.skills && parsedData.skills.length > 0 ? parsedData.skills : p.skills,
          education: parsedData.education && parsedData.education.length > 0 ? parsedData.education : p.education,
          currentLocation: parsedData.currentLocation || p.currentLocation,
          headline: parsedData.currentDesignation ? `${parsedData.currentDesignation} ${parsedData.experienceYears ? `with ${parsedData.experienceYears} years experience` : ''}`.trim() : p.headline,
          profileLinks: {
            linkedin: parsedData.linkedin || p.profileLinks.linkedin,
            github: parsedData.github || p.profileLinks.github,
            portfolio: parsedData.portfolio || p.profileLinks.portfolio,
          }
        }));
      }
    } catch (err) {
      console.error("Failed to parse resume", err);
      alert("Failed to extract data from resume. You can still fill it manually.");
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const data = await getCandidateProfile(accessToken);
        if (data?.name) {
          setIsNew(false);
          setProfile({
            name: data.name || "",
            phone: data.phone || "",
            headline: data.headline || "",
            currentCompany: data.currentCompany || "",
            currentDesignation: data.currentDesignation || "",
            experienceYears: data.experienceYears?.toString() || "",
            skills: data.skills || [],
            education: data.education || [],
            currentLocation: data.currentLocation || "",
            preferredLocations: data.preferredLocations || [],
            currentCtc: data.currentCtc?.toString() || "",
            expectedCtc: data.expectedCtc?.toString() || "",
            noticePeriodDays: data.noticePeriodDays?.toString() || "",
            preferredRoles: data.preferredRoles || [],
            preferredIndustries: data.preferredIndustries || [],
            workModel: data.workModel || "",
            profileLinks: {
              linkedin: data.profileLinks?.linkedin || "",
              github: data.profileLinks?.github || "",
              portfolio: data.profileLinks?.portfolio || "",
            },
          });
        }
      } catch {
        // New user — stay on empty profile
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key: string, val: any) => setProfile((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const payload = {
        ...profile,
        experienceYears: profile.experienceYears ? parseFloat(profile.experienceYears) : undefined,
        currentCtc: profile.currentCtc ? parseInt(profile.currentCtc) : undefined,
        expectedCtc: profile.expectedCtc ? parseInt(profile.expectedCtc) : undefined,
        noticePeriodDays: profile.noticePeriodDays ? parseInt(profile.noticePeriodDays) : undefined,
        profileLinks: profile.profileLinks,
      };
      await upsertCandidateProfile(accessToken, payload);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        if (isNew) {
           window.location.href = "/candidate/dashboard";
        } else {
           router.push("/candidate/dashboard");
        }
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const canGoNext = step < 4;
  const canGoPrev = step > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNew ? "Build Your Profile" : "Update Your Profile"}
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-11">
            {isNew
              ? "Complete your profile to get matched with top referral opportunities."
              : "Keep your profile fresh to increase your chances of getting referred."}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Step progress */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => isDone && setStep(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                      : isDone
                      ? "bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200"
                      : "bg-white text-slate-400 border border-slate-200 cursor-default"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                <p className="text-sm text-slate-500 mt-1">Let's start with the basics.</p>
              </div>

              {/* AI Parser Widget */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 to-teal-50/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  {isParsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                </div>
                <div className="flex-1 text-center sm:text-left z-10">
                  <h3 className="text-sm font-bold text-emerald-900">Magic Auto-Fill 🪄</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">Upload your PDF resume and let our AI instantly populate your profile.</p>
                </div>
                <div className="z-10 w-full sm:w-auto shrink-0 relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={isParsing}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className={`px-4 py-2 rounded-lg font-medium text-sm text-center transition-colors ${
                    isParsing ? 'bg-emerald-200 text-emerald-700' : 'bg-emerald-600 text-white group-hover:bg-emerald-700 shadow-sm'
                  }`}>
                    {isParsing ? 'Parsing Document...' : 'Upload PDF'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Full Name *">
                  <Input value={profile.name} onChange={(e) => set("name", e.target.value)} placeholder="Rahul Verma" />
                </Field>
                <Field label="Phone Number" hint="Used only for recruiter outreach">
                  <Input value={profile.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                </Field>
              </div>
              <Field label="Professional Headline">
                <Input value={profile.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Senior Full-Stack Developer | 6 Years | React + Node.js" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="LinkedIn">
                  <Input value={profile.profileLinks.linkedin} onChange={(e) => set("profileLinks", { ...profile.profileLinks, linkedin: e.target.value })} placeholder="linkedin.com/in/username" />
                </Field>
                <Field label="GitHub">
                  <Input value={profile.profileLinks.github} onChange={(e) => set("profileLinks", { ...profile.profileLinks, github: e.target.value })} placeholder="github.com/username" />
                </Field>
                <Field label="Portfolio / Website">
                  <Input value={profile.profileLinks.portfolio} onChange={(e) => set("profileLinks", { ...profile.profileLinks, portfolio: e.target.value })} placeholder="myportfolio.com" />
                </Field>
              </div>
            </div>
          )}

          {/* Step 2: Professional */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Professional Background</h2>
                <p className="text-sm text-slate-500 mt-1">Tell us about your current role and experience.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Current Company">
                  <Input value={profile.currentCompany} onChange={(e) => set("currentCompany", e.target.value)} placeholder="Google, Flipkart, etc." />
                </Field>
                <Field label="Current Designation">
                  <Input value={profile.currentDesignation} onChange={(e) => set("currentDesignation", e.target.value)} placeholder="Senior Software Engineer" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Total Experience (Years)">
                  <Input type="number" value={profile.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} placeholder="5.5" />
                </Field>
                <Field label="Notice Period (Days)">
                  <Input type="number" value={profile.noticePeriodDays} onChange={(e) => set("noticePeriodDays", e.target.value)} placeholder="30" />
                </Field>
                <Field label="Work Mode Preference">
                  <Select value={profile.workModel} onChange={(e) => set("workModel", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Current CTC (₹ per annum)" hint="Enter in rupees (e.g. 1800000 for 18 LPA)">
                  <Input type="number" value={profile.currentCtc} onChange={(e) => set("currentCtc", e.target.value)} placeholder="1800000" />
                </Field>
                <Field label="Expected CTC (₹ per annum)">
                  <Input type="number" value={profile.expectedCtc} onChange={(e) => set("expectedCtc", e.target.value)} placeholder="2200000" />
                </Field>
              </div>
            </div>
          )}

          {/* Step 3: Skills & Education */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Skills & Education</h2>
                <p className="text-sm text-slate-500 mt-1">Add your technical and professional skills.</p>
              </div>
              <TagInput
                label="Your Skills"
                values={profile.skills}
                onChange={(v) => set("skills", v)}
                placeholder="e.g. React, Node.js, Python..."
              />
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs text-emerald-700 font-medium mb-2">💡 Tip: Be specific with skills</p>
                <p className="text-xs text-emerald-600">Use exact skill names like "React 18", "PostgreSQL", "System Design" to match more job requirements.</p>
              </div>
              <TagInput
                label="Education"
                values={profile.education}
                onChange={(v) => set("education", v)}
                placeholder="e.g. B.Tech Computer Science - VIT (2026)"
              />
              <TagInput
                label="Preferred Roles"
                values={profile.preferredRoles}
                onChange={(v) => set("preferredRoles", v)}
                placeholder="e.g. Backend Engineer, Tech Lead..."
              />
              <TagInput
                label="Preferred Industries"
                values={profile.preferredIndustries}
                onChange={(v) => set("preferredIndustries", v)}
                placeholder="e.g. FinTech, SaaS, EdTech..."
              />
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Location & Preferences</h2>
                <p className="text-sm text-slate-500 mt-1">Tell us where you are and where you'd like to work.</p>
              </div>
              <Field label="Current Location">
                <Input value={profile.currentLocation} onChange={(e) => set("currentLocation", e.target.value)} placeholder="Bengaluru, India" />
              </Field>
              <TagInput
                label="Preferred Work Locations"
                values={profile.preferredLocations}
                onChange={(v) => set("preferredLocations", v)}
                placeholder="e.g. Bengaluru, Remote, Mumbai..."
              />

              {/* Summary preview */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3 mt-4">
                <h3 className="text-sm font-semibold text-slate-800">Profile Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="h-4 w-4 text-emerald-500" />
                    <span>{profile.name || <span className="text-slate-400 italic">No name</span>}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Briefcase className="h-4 w-4 text-emerald-500" />
                    <span>{profile.currentDesignation || <span className="text-slate-400 italic">No designation</span>}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span>{profile.experienceYears ? `${profile.experienceYears} years exp.` : <span className="text-slate-400 italic">No exp. set</span>}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    <span>{profile.currentLocation || <span className="text-slate-400 italic">No location</span>}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 col-span-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span>
                      {profile.expectedCtc
                        ? `Expected: ₹${(parseInt(profile.expectedCtc) / 100000).toFixed(1)}L PA`
                        : <span className="text-slate-400 italic">No CTC set</span>}
                    </span>
                  </div>
                  {profile.education.length > 0 && (
                    <div className="flex items-start gap-2 text-slate-600 col-span-2 mt-1">
                      <GraduationCap className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-1">
                        {profile.education.slice(0, 2).map((edu, i) => (
                          <span key={i} className="text-xs">{edu}</span>
                        ))}
                        {profile.education.length > 2 && <span className="text-xs text-slate-400">+{profile.education.length - 2} more</span>}
                      </div>
                    </div>
                  )}
                </div>
                {profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(showAllSkills ? profile.skills : profile.skills.slice(0, 8)).map((s) => (
                      <span key={s} className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {!showAllSkills && profile.skills.length > 8 && (
                      <button 
                        type="button" 
                        onClick={() => setShowAllSkills(true)}
                        className="text-xs text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
                      >
                        +{profile.skills.length - 8} more
                      </button>
                    )}
                    {showAllSkills && profile.skills.length > 8 && (
                      <button 
                        type="button" 
                        onClick={() => setShowAllSkills(false)}
                        className="text-xs text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={!canGoPrev}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {canGoNext ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-md shadow-emerald-200 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !profile.name}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : saved ? (
                <><CheckCircle2 className="h-4 w-4" /> Saved! Redirecting...</>
              ) : (
                <><Save className="h-4 w-4" /> Save & View Dashboard</>
              )}
            </button>
          )}
        </div>

        {/* Skip link for returning users */}
        {!isNew && (
          <div className="text-center mt-4">
            <button
              onClick={() => router.push("/candidate/dashboard")}
              className="text-sm text-slate-400 hover:text-emerald-600 flex items-center gap-1 mx-auto"
            >
              Go to dashboard without saving <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
