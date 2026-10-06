"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMandate, publishMandate } from "@/lib/marketplace-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Wrench,
  IndianRupee,
  Gift,
  Eye,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";

// ── Stepper config ────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Basic Info", description: "Title & overview", icon: Briefcase },
  { id: 2, title: "Requirements", description: "Skills & experience", icon: Wrench },
  { id: 3, title: "Compensation", description: "Salary & benefits", icon: IndianRupee },
  { id: 4, title: "Referral Config", description: "Reward & participation", icon: Gift },
  { id: 5, title: "Review", description: "Preview & publish", icon: Eye },
];

// ── Reusable form field ───────────────────────────────────────────

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Skill tag input ───────────────────────────────────────────────

function SkillTagInput({
  label,
  skills,
  onChange,
  hint,
}: {
  label: string;
  skills: string[];
  onChange: (s: string[]) => void;
  hint?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !skills.includes(v)) onChange([...skills, v]);
    setInput("");
  };

  const remove = (s: string) => onChange(skills.filter((x) => x !== s));

  return (
    <FormField label={label} hint={hint}>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Type a skill and press Enter"
          className="bg-white"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {skills.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700"
          >
            {s}
            <button onClick={() => remove(s)} className="hover:text-red-500 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </FormField>
  );
}

// ── Review summary card ───────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function CreateMandatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    department: "",
    description: "",
    requiredExperience: "",
    mandatorySkills: [] as string[],
    preferredSkills: [] as string[],
    numberOfOpenings: 1,
    location: "",
    workModel: "Hybrid",
    employmentType: "Full-time",
    compensationMin: "",
    compensationMax: "",
    currency: "INR",
    applicationDeadline: "",
    acceptsDirectApply: true,
    acceptsReferrals: true,
    participationType: "OPEN",
    referralRewardAmount: "",
    referralRewardType: "FIXED",
    ownershipPeriodDays: 180,
    expectedTimeline: "",
    noticePeriodPref: "",
    hiringManagerName: "",
    hiringManagerTitle: "",
    teamDescription: "",
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return toast.error("Please enter a prompt first.");
    setIsGenerating(true);
    try {
      const token = await getToken();
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/v1/mandates/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (!res.ok) {
        let errStr = "Failed to generate mandate";
        try {
          const errData = await res.json();
          errStr = errData.message || errStr;
        } catch (_) {}
        throw new Error(errStr);
      }
      const data = await res.json();
      
      setForm((f) => ({
        ...f,
        title: data.title || f.title,
        department: data.department || f.department,
        description: data.description || f.description,
        requiredExperience: data.requiredExperience || f.requiredExperience,
        mandatorySkills: data.mandatorySkills?.length ? data.mandatorySkills : f.mandatorySkills,
        preferredSkills: data.preferredSkills?.length ? data.preferredSkills : f.preferredSkills,
        workModel: data.workModel || f.workModel,
        employmentType: data.employmentType || f.employmentType,
      }));
      toast.success("Mandate generated successfully! Please review the details.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate mandate");
    } finally {
      setIsGenerating(false);
    }
  };

  const getToken = async () => {
    const res = await fetch("/api/auth/token");
    const { accessToken } = await res.json();
    return accessToken;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const mandate = await createMandate(token, {
        ...form,
        compensationMin: form.compensationMin ? Number(form.compensationMin) : undefined,
        compensationMax: form.compensationMax ? Number(form.compensationMax) : undefined,
        referralRewardAmount: form.referralRewardAmount ? Number(form.referralRewardAmount) : undefined,
        numberOfOpenings: Number(form.numberOfOpenings),
        ownershipPeriodDays: Number(form.ownershipPeriodDays),
      });
      setSavedId(mandate.id);
      router.push(`/mandates/${mandate.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      let id = savedId;
      if (!id) {
        const mandate = await createMandate(token, {
          ...form,
          compensationMin: form.compensationMin ? Number(form.compensationMin) : undefined,
          compensationMax: form.compensationMax ? Number(form.compensationMax) : undefined,
          referralRewardAmount: form.referralRewardAmount ? Number(form.referralRewardAmount) : undefined,
          numberOfOpenings: Number(form.numberOfOpenings),
          ownershipPeriodDays: Number(form.ownershipPeriodDays),
        });
        id = mandate.id;
      }
      await publishMandate(token, id);
      router.push(`/mandates/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to publish mandate. Please check all fields.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Mandate</h1>
            <p className="text-xs text-slate-400">
              Step {step} of {STEPS.length} — {STEPS[step - 1].description}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isDone = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                      isDone ? "bg-indigo-600 border-indigo-600" : isCurrent ? "border-indigo-600 bg-white" : "border-slate-200 bg-white"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : (
                      <Icon className={cn("h-4 w-4", isCurrent ? "text-indigo-600" : "text-slate-300")} />
                    )}
                  </div>
                  <span className={cn("text-xs font-medium hidden sm:block", isCurrent ? "text-indigo-700" : "text-slate-400")}>
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-2 mt-[-14px]", step > s.id ? "bg-indigo-600" : "bg-slate-200")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              {/* AI Generator Box */}
              <div className="mb-8 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl" />
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-violet-500/10 blur-xl" />
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-indigo-900">AI Mandate Generator</h3>
                      <p className="text-xs text-indigo-600/80">Describe the role in one sentence and let AI do the rest.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., Need a senior frontend dev who knows React, Tailwind, and Node for a remote role paying up to 40LPA"
                      className="bg-white border-indigo-200 focus-visible:ring-indigo-500 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }}
                    />
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-sm"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Magic Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <FormField label="Job Title" required>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Senior Backend Engineer" className="bg-slate-50 text-lg font-medium" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Department">
                  <Input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Engineering" />
                </FormField>
                <FormField label="Number of Openings">
                  <Input type="number" min="1" value={form.numberOfOpenings} onChange={(e) => update("numberOfOpenings", e.target.value)} />
                </FormField>
              </div>
              <FormField label="Job Description" required hint="Markdown is supported. Be specific about responsibilities and expectations.">
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={8}
                  placeholder="Describe the role, responsibilities, team culture..."
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </FormField>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Reporting & Team Details</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <FormField label="Hiring Manager Name" hint="Who will they report to?">
                    <Input value={form.hiringManagerName} onChange={(e) => update("hiringManagerName", e.target.value)} placeholder="e.g. Rahul Sharma" />
                  </FormField>
                  <FormField label="Hiring Manager Title">
                    <Input value={form.hiringManagerTitle} onChange={(e) => update("hiringManagerTitle", e.target.value)} placeholder="e.g. VP of Engineering" />
                  </FormField>
                </div>
                <FormField label="Team Description" hint="Briefly describe the team size, goals, or culture.">
                  <textarea
                    value={form.teamDescription}
                    onChange={(e) => update("teamDescription", e.target.value)}
                    rows={3}
                    placeholder="e.g. You'll be joining a fast-paced 5-person squad building our core payments infrastructure..."
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  />
                </FormField>
              </div>
            </>
          )}

          {/* Step 2: Requirements */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Location">
                  <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Bangalore, India" />
                </FormField>
                <FormField label="Work Model">
                  <select value={form.workModel} onChange={(e) => update("workModel", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>On-site</option>
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Required Experience">
                  <Input value={form.requiredExperience} onChange={(e) => update("requiredExperience", e.target.value)} placeholder="e.g. 5-8 years" />
                </FormField>
                <FormField label="Notice Period Preference">
                  <Input value={form.noticePeriodPref} onChange={(e) => update("noticePeriodPref", e.target.value)} placeholder="e.g. 30 days or less" />
                </FormField>
              </div>
              <SkillTagInput
                label="Mandatory Skills *"
                skills={form.mandatorySkills}
                onChange={(s) => update("mandatorySkills", s)}
                hint="Candidates MUST have these skills"
              />
              <SkillTagInput
                label="Preferred Skills"
                skills={form.preferredSkills}
                onChange={(s) => update("preferredSkills", s)}
                hint="Nice-to-have — not required"
              />
            </>
          )}

          {/* Step 3: Compensation */}
          {step === 3 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Min Salary">
                  <Input type="number" value={form.compensationMin} onChange={(e) => update("compensationMin", e.target.value)} placeholder="1500000" />
                </FormField>
                <FormField label="Max Salary">
                  <Input type="number" value={form.compensationMax} onChange={(e) => update("compensationMax", e.target.value)} placeholder="2000000" />
                </FormField>
                <FormField label="Currency">
                  <select value={form.currency} onChange={(e) => update("currency", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option>INR</option>
                    <option>USD</option>
                    <option>GBP</option>
                    <option>EUR</option>
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Employment Type">
                  <select value={form.employmentType} onChange={(e) => update("employmentType", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option>Full-time</option>
                    <option>Contract</option>
                    <option>Part-time</option>
                    <option>Internship</option>
                  </select>
                </FormField>
                <FormField label="Application Deadline">
                  <Input type="date" value={form.applicationDeadline} onChange={(e) => update("applicationDeadline", e.target.value)} />
                </FormField>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.acceptsDirectApply} onChange={(e) => update("acceptsDirectApply", e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-slate-700">Accept Direct Applications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.acceptsReferrals} onChange={(e) => update("acceptsReferrals", e.target.checked)} className="rounded" />
                  <span className="text-sm font-medium text-slate-700">Accept Recruiter Referrals</span>
                </label>
              </div>
            </>
          )}

          {/* Step 4: Referral Config */}
          {step === 4 && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                💡 Setting an attractive reward amount significantly increases recruiter participation and the quality of referrals you receive.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Referral Reward Amount" hint="Amount paid to recruiter upon successful hire">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{form.currency === "INR" ? "₹" : "$"}</span>
                    <Input type="number" value={form.referralRewardAmount} onChange={(e) => update("referralRewardAmount", e.target.value)} placeholder="50000" className="pl-7" />
                  </div>
                </FormField>
                <FormField label="Reward Type">
                  <select value={form.referralRewardType} onChange={(e) => update("referralRewardType", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="FIXED">Fixed Amount</option>
                    <option value="PERCENTAGE">% of CTC</option>
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Recruiter Participation" hint="Who can refer candidates for this mandate">
                  <select value={form.participationType} onChange={(e) => update("participationType", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="OPEN">Open — Any recruiter can join</option>
                    <option value="APPROVAL_BASED">Approval-Based — You approve recruiters</option>
                    <option value="INVITE_ONLY">Invite Only — You invite specific recruiters</option>
                  </select>
                </FormField>
                <FormField label="Ownership Lock Period (days)" hint="How long a recruiter 'owns' a candidate they referred">
                  <Input type="number" min="30" value={form.ownershipPeriodDays} onChange={(e) => update("ownershipPeriodDays", e.target.value)} />
                </FormField>
              </div>
            </>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                <div className="px-5 py-4">
                  <h2 className="text-xl font-bold text-slate-900">{form.title || "Untitled Mandate"}</h2>
                  {form.department && <p className="text-sm text-slate-500 mt-0.5">{form.department}</p>}
                </div>
                <div className="px-5 py-3 space-y-0">
                  <ReviewRow label="Location" value={`${form.location || "Not set"} · ${form.workModel}`} />
                  <ReviewRow label="Experience" value={form.requiredExperience} />
                  <ReviewRow label="Employment" value={form.employmentType} />
                  <ReviewRow label="Openings" value={form.numberOfOpenings} />
                  <ReviewRow label="Salary Range" value={form.compensationMin && form.compensationMax ? `${form.currency} ${Number(form.compensationMin).toLocaleString()} – ${Number(form.compensationMax).toLocaleString()}` : undefined} />
                  <ReviewRow label="Referral Reward" value={form.referralRewardAmount ? `${form.currency === "INR" ? "₹" : "$"}${Number(form.referralRewardAmount).toLocaleString()} (${form.referralRewardType})` : "No reward set"} />
                  <ReviewRow label="Participation" value={form.participationType.replace("_", " ")} />
                  <ReviewRow label="Ownership Lock" value={`${form.ownershipPeriodDays} days`} />
                </div>
                {form.mandatorySkills.length > 0 && (
                  <div className="px-5 py-4">
                    <p className="text-sm text-slate-500 mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.mandatorySkills.map((s) => (
                        <span key={s} className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              {step === STEPS.length ? (
                <>
                  <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                    {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Save as Draft
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2"
                    onClick={handlePublish}
                    disabled={saving || !form.title}
                  >
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                    🚀 Publish to Marketplace
                  </Button>
                </>
              ) : (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                  onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
                  disabled={step === 1 && !form.title}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
