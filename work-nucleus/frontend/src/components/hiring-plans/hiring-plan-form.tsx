"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, Check, X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Skill {
  id: string;
  name: string;
  category: string;
  industry?: string;
}

interface SelectedSkill {
  skillId: string;
  name: string;
  category: string;
  priority: "MUST_HAVE" | "NICE_TO_HAVE";
  minProficiency: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface HiringPlanFormData {
  title: string;
  industry: string;
  department: string;
  designation: string;
  quarter: number;
  year: number;
  totalRoles: number;
  reportingManagerName: string;
  hodName: string;
  teamSize: number | undefined;
  teamLevels: string;
  hiringManagerId: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  benefits: string[];
  notes: string;
  skills: SelectedSkill[];
}

const INDUSTRIES = [
  "Software Engineering",
  "Finance",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Marketing",
  "Education",
  "Other",
];

const STEPS = [
  "Basic Info",
  "Team Structure",
  "Compensation",
  "Skills",
  "Review & Submit",
];

const categoryColors: Record<string, string> = {
  TECHNICAL: "bg-blue-50 text-blue-700 border-blue-200",
  LEADERSHIP: "bg-purple-50 text-purple-700 border-purple-200",
  BEHAVIOURAL: "bg-green-50 text-green-700 border-green-200",
  COMMUNICATION: "bg-amber-50 text-amber-700 border-amber-200",
  DOMAIN: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

interface HiringPlanFormProps {
  initialData?: HiringPlanFormData;
  planId?: string;
}

export function HiringPlanForm({ initialData, planId }: HiringPlanFormProps) {
  const router = useRouter();
  const isEdit = !!planId;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [form, setForm] = useState<HiringPlanFormData>(
    initialData || {
      title: "",
      industry: "Software Engineering",
      department: "",
      designation: "",
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      year: new Date().getFullYear(),
      totalRoles: 1,
      reportingManagerName: "",
      hodName: "",
      teamSize: undefined,
      teamLevels: "",
      hiringManagerId: "",
      budgetMin: 0,
      budgetMax: 0,
      currency: "INR",
      benefits: [],
      notes: "",
      skills: [],
    }
  );

  // Skill search
  const [skillSearch, setSkillSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Skill[]>([]);
  const [searchingSkills, setSearchingSkills] = useState(false);

  // User search for hiring manager
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<User[]>([]);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Benefits tag input
  const [benefitInput, setBenefitInput] = useState("");

  // Fetch current user profile for "Assign to me" option
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.isProvisioned && data.id) {
            setCurrentUser({ id: data.id, name: data.name || "Me", email: data.email });
          }
        }
      } catch {
        // ignore
      }
    }
    fetchProfile();
  }, []);

  const updateField = <K extends keyof HiringPlanFormData>(
    key: K,
    value: HiringPlanFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // Skill search effect
  useEffect(() => {
    if (!skillSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingSkills(true);
      try {
        const params = new URLSearchParams({ q: skillSearch });
        if (form.industry) params.set("industry", form.industry);
        const res = await fetch(`/api/skills/search?${params}`);
        const data = await res.json();
        setSearchResults(
          (data as Skill[]).filter(
            (s: Skill) => !form.skills.some((sel) => sel.skillId === s.id)
          )
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingSkills(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [skillSearch, form.industry, form.skills]);

  // User search effect
  const searchUsers = useCallback(async () => {
    if (!userSearch.trim()) {
      setUserResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?page=1&limit=10`);
      const data = await res.json();
      setUserResults(
        (data.data || []).filter((u: User) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase())
        )
      );
    } catch {
      setUserResults([]);
    }
  }, [userSearch]);

  useEffect(() => {
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchUsers]);

  const addSkill = (skill: Skill) => {
    updateField("skills", [
      ...form.skills,
      {
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        priority: "MUST_HAVE",
        minProficiency: 3,
      },
    ]);
    setSkillSearch("");
    setSearchResults([]);
  };

  const removeSkill = (skillId: string) => {
    updateField(
      "skills",
      form.skills.filter((s) => s.skillId !== skillId)
    );
  };

  const updateSkill = (skillId: string, field: string, value: unknown) => {
    updateField(
      "skills",
      form.skills.map((s) =>
        s.skillId === skillId ? { ...s, [field]: value } : s
      )
    );
  };

  const addBenefit = () => {
    if (benefitInput.trim() && !form.benefits.includes(benefitInput.trim())) {
      updateField("benefits", [...form.benefits, benefitInput.trim()]);
      setBenefitInput("");
    }
  };

  const removeBenefit = (benefit: string) => {
    updateField(
      "benefits",
      form.benefits.filter((b) => b !== benefit)
    );
  };

  // Step validation
  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (!form.title || form.title.length < 3) newErrors.title = "Title must be at least 3 characters";
      if (!form.department) newErrors.department = "Department is required";
      if (!form.designation) newErrors.designation = "Designation is required";
    }

    if (stepIndex === 1) {
      if (form.totalRoles < 1) newErrors.totalRoles = "At least 1 role required";
      if (!form.reportingManagerName) newErrors.reportingManagerName = "Required";
      if (!form.hodName) newErrors.hodName = "Required";
      if (!form.hiringManagerId) newErrors.hiringManagerId = "Select a hiring manager";
    }

    if (stepIndex === 2) {
      if (form.budgetMin <= 0) newErrors.budgetMin = "Must be greater than 0";
      if (form.budgetMax <= 0) newErrors.budgetMax = "Must be greater than 0";
      if (form.budgetMax < form.budgetMin) newErrors.budgetMax = "Must be >= minimum";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        skills: form.skills.map((s) => ({
          skillId: s.skillId,
          priority: s.priority,
          minProficiency: s.minProficiency,
        })),
      };

      const url = isEdit ? `/api/hiring-plans/${planId}` : "/api/hiring-plans";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/hiring-plans/${data.id}`);
      } else {
        const err = await res.json();
        setErrors({ submit: err.message || "Failed to save" });
      }
    } catch {
      setErrors({ submit: "Failed to save hiring plan" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? "Edit Hiring Plan" : "Create Hiring Plan"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEdit ? "Update your hiring plan details" : "Set up a new hiring plan in 5 steps"}
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i === step
                  ? "bg-indigo-600 text-white"
                  : i < step
                  ? "bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            <span
              className={cn(
                "ml-2 hidden text-xs font-medium sm:inline",
                i === step ? "text-indigo-600" : "text-slate-400"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px w-8",
                  i < step ? "bg-indigo-300" : "bg-slate-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g., Senior Frontend Engineer"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Industry *</Label>
                <Select
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  placeholder="e.g., Engineering"
                  className={errors.department ? "border-red-500" : ""}
                />
                {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="designation">Designation *</Label>
              <Input
                id="designation"
                value={form.designation}
                onChange={(e) => updateField("designation", e.target.value)}
                placeholder="e.g., Senior Engineer"
                className={errors.designation ? "border-red-500" : ""}
              />
              {errors.designation && <p className="mt-1 text-xs text-red-500">{errors.designation}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Quarter *</Label>
                <Select
                  value={String(form.quarter)}
                  onChange={(e) => updateField("quarter", Number(e.target.value))}
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>
                      Q{q}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={form.year}
                  onChange={(e) => updateField("year", Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Team Structure */}
      {step === 1 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Team Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="totalRoles">Total Roles *</Label>
              <Input
                id="totalRoles"
                type="number"
                min={1}
                value={form.totalRoles}
                onChange={(e) => updateField("totalRoles", Number(e.target.value))}
                className={errors.totalRoles ? "border-red-500" : ""}
              />
              {errors.totalRoles && <p className="mt-1 text-xs text-red-500">{errors.totalRoles}</p>}
            </div>
            <div>
              <Label htmlFor="hiringManager">Hiring Manager *</Label>
              <div className="relative">
                {selectedManager ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                    <span className="text-sm">{selectedManager.name} ({selectedManager.email})</span>
                    <button
                      onClick={() => {
                        setSelectedManager(null);
                        updateField("hiringManagerId", "");
                      }}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="hiringManager"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className={cn("pl-9", errors.hiringManagerId ? "border-red-500" : "")}
                      />
                    </div>
                    {userResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {userResults.map((u) => (
                          <button
                            key={u.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => {
                              setSelectedManager(u);
                              updateField("hiringManagerId", u.id);
                              setUserSearch("");
                              setUserResults([]);
                            }}
                          >
                            <span className="font-medium">{u.name}</span>
                            <span className="text-slate-400">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {currentUser && (
                      <button
                        type="button"
                        className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        onClick={() => {
                          setSelectedManager(currentUser);
                          updateField("hiringManagerId", currentUser.id);
                          setUserSearch("");
                          setUserResults([]);
                        }}
                      >
                        Assign to me ({currentUser.name})
                      </button>
                    )}
                  </>
                )}
              </div>
              {errors.hiringManagerId && (
                <p className="mt-1 text-xs text-red-500">{errors.hiringManagerId}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="reportingManagerName">Reporting Manager *</Label>
                <Input
                  id="reportingManagerName"
                  value={form.reportingManagerName}
                  onChange={(e) => updateField("reportingManagerName", e.target.value)}
                  className={errors.reportingManagerName ? "border-red-500" : ""}
                />
                {errors.reportingManagerName && (
                  <p className="mt-1 text-xs text-red-500">{errors.reportingManagerName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="hodName">HOD Name *</Label>
                <Input
                  id="hodName"
                  value={form.hodName}
                  onChange={(e) => updateField("hodName", e.target.value)}
                  className={errors.hodName ? "border-red-500" : ""}
                />
                {errors.hodName && <p className="mt-1 text-xs text-red-500">{errors.hodName}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="teamSize">Team Size</Label>
                <Input
                  id="teamSize"
                  type="number"
                  value={form.teamSize ?? ""}
                  onChange={(e) =>
                    updateField("teamSize", e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
              <div>
                <Label htmlFor="teamLevels">Team Levels</Label>
                <Input
                  id="teamLevels"
                  value={form.teamLevels}
                  onChange={(e) => updateField("teamLevels", e.target.value)}
                  placeholder="e.g., L4-L6"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Compensation */}
      {step === 2 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Compensation & Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="budgetMin">Budget Min *</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={form.budgetMin || ""}
                  onChange={(e) => updateField("budgetMin", Number(e.target.value))}
                  className={errors.budgetMin ? "border-red-500" : ""}
                />
                {errors.budgetMin && <p className="mt-1 text-xs text-red-500">{errors.budgetMin}</p>}
              </div>
              <div>
                <Label htmlFor="budgetMax">Budget Max *</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={form.budgetMax || ""}
                  onChange={(e) => updateField("budgetMax", Number(e.target.value))}
                  className={errors.budgetMax ? "border-red-500" : ""}
                />
                {errors.budgetMax && <p className="mt-1 text-xs text-red-500">{errors.budgetMax}</p>}
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Benefits</Label>
              <div className="flex gap-2">
                <Input
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  placeholder="Add a benefit (e.g., Health Insurance)"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                />
                <Button type="button" variant="outline" onClick={addBenefit}>
                  Add
                </Button>
              </div>
              {form.benefits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.benefits.map((b) => (
                    <Badge key={b} variant="secondary" className="gap-1">
                      {b}
                      <button onClick={() => removeBenefit(b)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Skills */}
      {step === 3 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Search skills..."
                className="pl-9"
              />
              {searchingSkills && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {searchResults.map((skill) => (
                    <button
                      key={skill.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => addSkill(skill)}
                    >
                      <Badge
                        variant="outline"
                        className={cn("text-xs", categoryColors[skill.category])}
                      >
                        {skill.category}
                      </Badge>
                      <span>{skill.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.skills.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Search and add skills to this hiring plan
              </p>
            ) : (
              <div className="space-y-3">
                {form.skills.map((skill) => (
                  <div
                    key={skill.skillId}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-2 sm:w-48">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", categoryColors[skill.category])}
                      >
                        {skill.category}
                      </Badge>
                      <span className="text-sm font-medium">{skill.name}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-1">
                      <button
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                          skill.priority === "MUST_HAVE"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-500"
                        )}
                        onClick={() =>
                          updateSkill(
                            skill.skillId,
                            "priority",
                            skill.priority === "MUST_HAVE" ? "NICE_TO_HAVE" : "MUST_HAVE"
                          )
                        }
                      >
                        {skill.priority === "MUST_HAVE" ? "Must Have" : "Nice to Have"}
                      </button>
                      <div className="flex items-center gap-2 sm:flex-1">
                        <span className="text-xs text-slate-500">Proficiency:</span>
                        <Slider
                          min={1}
                          max={5}
                          value={skill.minProficiency}
                          onValueChange={(v) =>
                            updateSkill(skill.skillId, "minProficiency", v)
                          }
                          className="flex-1"
                        />
                        <span className="w-6 text-center text-sm font-semibold text-indigo-600">
                          {skill.minProficiency}
                        </span>
                      </div>
                      <button
                        onClick={() => removeSkill(skill.skillId)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {step === 4 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewField label="Title" value={form.title} />
              <ReviewField label="Industry" value={form.industry} />
              <ReviewField label="Department" value={form.department} />
              <ReviewField label="Designation" value={form.designation} />
              <ReviewField label="Period" value={`Q${form.quarter} ${form.year}`} />
              <ReviewField label="Total Roles" value={String(form.totalRoles)} />
              <ReviewField label="Reporting Manager" value={form.reportingManagerName} />
              <ReviewField label="HOD" value={form.hodName} />
              <ReviewField
                label="Hiring Manager"
                value={selectedManager?.name || form.hiringManagerId}
              />
              <ReviewField label="Team Size" value={form.teamSize ? String(form.teamSize) : "N/A"} />
              <ReviewField
                label="Budget"
                value={`${form.currency} ${form.budgetMin.toLocaleString()} - ${form.budgetMax.toLocaleString()}`}
              />
              <ReviewField label="Currency" value={form.currency} />
            </div>

            {form.benefits.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500">Benefits</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {form.benefits.map((b) => (
                    <Badge key={b} variant="secondary">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {form.skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Skills ({form.skills.length})
                </p>
                <div className="mt-2 space-y-2">
                  {form.skills.map((s) => (
                    <div
                      key={s.skillId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge
                        variant="outline"
                        className={cn("text-xs", categoryColors[s.category])}
                      >
                        {s.category}
                      </Badge>
                      <span>{s.name}</span>
                      <span className="text-slate-400">
                        {s.priority === "MUST_HAVE" ? "Must Have" : "Nice to Have"}
                      </span>
                      <span className="text-indigo-600">Level {s.minProficiency}/5</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errors.submit && (
              <p className="text-sm text-red-500">{errors.submit}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? () => router.push("/hiring-plans") : prevStep}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? "Cancel" : "Previous"}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={nextStep}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {isEdit ? "Update Plan" : "Create Plan"}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value || "N/A"}</p>
    </div>
  );
}
