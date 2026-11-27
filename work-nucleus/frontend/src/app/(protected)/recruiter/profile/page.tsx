"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getRecruiterProfile,
  createRecruiterProfile,
  updateRecruiterProfile,
  getCandidateProfile,
  upsertCandidateProfile,
  parseResumeText,
} from "@/lib/marketplace-api";
import { getClientApiUrl, getDemoRole } from "@/lib/api";
import {
  User,
  Briefcase,
  Link as LinkIcon,
  Check,
  Loader,
  Save,
  FileText,
  UploadCloud,
  Sparkles,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let pageText = "";
    for (const item of content.items as any[]) {
      if (!item.str && !item.hasEOL) continue;
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += "\n";
      } else if (
        pageText &&
        !pageText.endsWith(" ") &&
        !pageText.endsWith("\n") &&
        item.str
      ) {
        pageText += " ";
      }
      pageText += item.str;
      if (item.hasEOL) {
        pageText += "\n";
      }
      lastY = item.transform[5];
    }
    text += pageText + "\n\n";

    // Extract hidden hyperlinks from the PDF (e.g., behind text like "LinkedIn", "GitHub", "LeetCode")
    try {
      const annotations = await page.getAnnotations();
      const links = annotations
        .filter((anno: any) => anno.subtype === "Link" && (anno.url || anno.unsafeUrl))
        .map((anno: any) => anno.url || anno.unsafeUrl)
        .filter(Boolean)
        .join(" ");
      if (links) {
        text += "\n[Links / Social Profiles in PDF: " + links + "]\n";
      }
    } catch (e) {
      console.warn("Failed to parse annotations", e);
    }
  }
  return text.trim();
}

const SPECIALIZATION_OPTIONS = [
  "Software Engineering",
  "Product Management",
  "Data Science & Analytics",
  "Design (UX/UI)",
  "Sales & Business Development",
  "Marketing",
  "Finance & Accounting",
  "Operations",
  "HR & Talent",
  "Legal & Compliance",
];

export default function RecruiterProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    headline: "",
    bio: "",
    experienceYears: "",
    linkedinUrl: "",
    portfolioUrl: "",
    specializations: [] as string[],
  });
  const [isVerified, setIsVerified] = useState(false);

  // Candidate / Resume Profile state for self-application
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [currentDesignation, setCurrentDesignation] = useState("");
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();

        // 1. Load recruiter profile
        try {
          const profile = await getRecruiterProfile(accessToken);
          setForm({
            name: profile.name || "",
            phone: profile.phone || "",
            headline: profile.headline || "",
            bio: profile.bio || "",
            experienceYears: profile.experienceYears?.toString() || "",
            linkedinUrl: profile.linkedinUrl || "",
            portfolioUrl: profile.portfolioUrl || "",
            specializations: profile.specializations || [],
          });
          setIsVerified(profile.isVerified || false);
        } catch {
          setIsNew(true);
        }

        // 2. Load linked candidate profile (resume & skills)
        try {
          const cand = await getCandidateProfile(accessToken);
          if (cand) {
            setResumeUrl(cand.resumeUrl || null);
            setCandidateSkills(
              Array.isArray(cand.skills)
                ? (cand.skills as any[]).map((s) => (typeof s === "string" ? s : s.name || ""))
                : []
            );
            setCurrentDesignation(cand.currentDesignation || "");
          }
        } catch {
          // No candidate profile yet - will be auto-provisioned upon resume upload or apply
        }
      } catch (err) {
        console.error("Failed to load recruiter profiles:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSpecialization = (s: string) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingResume(true);
      toast.info("Extracting resume text and uploading...");
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const API_URL = getClientApiUrl();
      const demoRole = getDemoRole();

      // 1. Upload to storage
      const formData = new FormData();
      formData.append("resume", file);
      const uploadRes = await fetch(
        `${API_URL}/api/v1/candidate/profile/upload-resume`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(demoRole ? { "X-Demo-Role": demoRole } : {}),
          },
          body: formData,
        }
      );

      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const uploadData = await uploadRes.json();
      setResumeUrl(uploadData.resumeUrl);

      // 2. Extract text client side and parse with Gemini AI
      const text = await extractTextFromPDF(file);
      const parsedData = await parseResumeText(accessToken, text);

      if (parsedData) {
        const skills: string[] = parsedData.skills || [];
        setCandidateSkills(skills);
        if (parsedData.currentDesignation) {
          setCurrentDesignation(parsedData.currentDesignation);
        }

        // Also save to candidate profile
        await upsertCandidateProfile(accessToken, {
          name: parsedData.name || form.name || "User",
          phone: parsedData.phone || form.phone || undefined,
          currentDesignation: parsedData.currentDesignation || undefined,
          currentCompany: parsedData.currentCompany || undefined,
          experienceYears:
            parsedData.experienceYears !== undefined && parsedData.experienceYears !== null
              ? Number(parsedData.experienceYears)
              : form.experienceYears ? Number(form.experienceYears) : undefined,
          skills: skills.map((s) => (typeof s === "string" ? s : (s as any)?.name || "")).filter(Boolean),
          headline: parsedData.headline || form.headline || undefined,
        }).catch((err) => {
          console.warn("Failed to sync candidate profile from recruiter:", err);
        });

        // Auto-fill recruiter form fields from the parsed resume (preferring extracted resume data)
        setForm((prev) => ({
          ...prev,
          name: parsedData.name || prev.name,
          phone: parsedData.phone || prev.phone,
          headline:
            parsedData.headline ||
            (parsedData.currentDesignation
              ? `${parsedData.currentDesignation}${parsedData.currentCompany ? ` at ${parsedData.currentCompany}` : ""}`
              : prev.headline),
          bio: parsedData.summary || parsedData.bio || prev.bio,
          experienceYears:
            parsedData.experienceYears !== undefined && parsedData.experienceYears !== null
              ? String(parsedData.experienceYears)
              : prev.experienceYears,
          linkedinUrl: parsedData.linkedin || prev.linkedinUrl,
          portfolioUrl: parsedData.portfolio || parsedData.github || prev.portfolioUrl,
        }));

        toast.success(`Resume uploaded and parsed! Auto-filled profile and found ${skills.length} skills.`);
      } else {
        toast.success("Resume uploaded successfully!");
      }
    } catch (err: any) {
      console.error("Resume upload error:", err);
      toast.error(err.message || "Failed to upload resume. Please try again.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const skill = newSkillInput.trim();
    if (!candidateSkills.includes(skill)) {
      setCandidateSkills((prev) => [...prev, skill]);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setCandidateSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        headline: form.headline.trim() || undefined,
        bio: form.bio.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        portfolioUrl: form.portfolioUrl.trim() || undefined,
        specializations:
          form.specializations.length > 0 ? form.specializations : undefined,
        experienceYears: form.experienceYears
          ? parseInt(form.experienceYears, 10)
          : undefined,
      };

      if (isNew) {
        await createRecruiterProfile(accessToken, payload);
      } else {
        await updateRecruiterProfile(accessToken, payload);
      }

      // Also sync candidate profile skills & details
      if (candidateSkills.length > 0 || currentDesignation) {
        await upsertCandidateProfile(accessToken, {
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          headline: form.headline.trim() || undefined,
          currentDesignation: currentDesignation || undefined,
          skills: candidateSkills.map((s) => (typeof s === "string" ? s : (s as any)?.name || "")).filter(Boolean),
          experienceYears: form.experienceYears
            ? Number(form.experienceYears)
            : undefined,
        }).catch(() => {});
      }

      toast.success(
        isNew ? "Profile created! Welcome aboard 🎉" : "Profile updated!"
      );
      if (isNew) window.location.href = "/recruiter/dashboard";
    } catch (err: any) {
      console.error("Save profile error:", err);
      toast.error(err.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {isNew ? "Set Up Your Recruiter Profile" : "My Profile & Resume"}
              {isVerified && (
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  <Check className="h-3 w-3" /> Verified
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500">
              {isNew
                ? "Complete your profile to start submitting referrals, earning rewards, and applying directly."
                : "Manage your recruiter info, specializations, and candidate resume for direct applications."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Resume & Skills Card (For Direct Apply) ────────────────── */}
        <div className="bg-gradient-to-br from-sky-50/60 to-white rounded-xl border border-sky-100 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-sky-950 uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-600" />
                My Resume & Technical Skills
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your resume to apply for mandates directly and get instant AI job matching.
              </p>
            </div>
            {resumeUrl && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Check className="h-3.5 w-3.5" /> Resume Active
              </span>
            )}
          </div>

          <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 bg-white/80 rounded-xl p-5 text-center transition-colors">
            <input
              type="file"
              id="recruiter-resume-upload"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleResumeUpload}
              disabled={isUploadingResume}
            />
            <label
              htmlFor="recruiter-resume-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              {isUploadingResume ? (
                <>
                  <Loader className="h-7 w-7 text-sky-600 animate-spin" />
                  <p className="text-xs font-semibold text-sky-700">
                    Extracting text & parsing with Gemini AI...
                  </p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {resumeUrl
                        ? "Upload a new resume to update your parsed profile"
                        : "Click or drag & drop to upload your resume (PDF/DOCX)"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      AI will automatically extract your technical skills, experience, and designation.
                    </p>
                  </div>
                </>
              )}
            </label>
          </div>

          {/* Parsed Technical Skills Chips */}
          {candidateSkills.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-sky-100/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Extracted Skills ({candidateSkills.length})
                </span>
                <span className="text-[11px] text-slate-400">Used for mandate match scoring</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {candidateSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200/80 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-sky-500 hover:text-sky-800 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add custom skill input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Add another skill (e.g. Next.js, Docker)..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Basic Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ayush Prakash"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.experienceYears}
                onChange={(e) =>
                  setForm((f) => ({ ...f, experienceYears: e.target.value }))
                }
                placeholder="5"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Professional Headline
              </label>
              <input
                type="text"
                value={form.headline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headline: e.target.value }))
                }
                placeholder="Senior Full Stack Engineer & Technical Talent Partner"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                About / Bio
              </label>
              <textarea
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                placeholder="Tell companies about your background, recruitment style, and engineering experience..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Online Presence */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Online Presence
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-sky-600" /> LinkedIn URL
              </label>
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linkedinUrl: e.target.value }))
                }
                placeholder="https://linkedin.com/in/your-profile"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-sky-600" /> Portfolio / GitHub URL
              </label>
              <input
                type="url"
                value={form.portfolioUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, portfolioUrl: e.target.value }))
                }
                placeholder="https://github.com/your-username"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Specializations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">
            Specializations
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Select the domains you recruit or specialize in.
          </p>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATION_OPTIONS.map((s) => {
              const active = form.specializations.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialization(s)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-sky-500 bg-sky-50 text-sky-700 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50/50"
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                  {s}
                </button>
              );
            })}
          </div>
          {form.specializations.length > 0 && (
            <p className="mt-3 text-xs text-sky-600 font-medium">
              {form.specializations.length} selected
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
        >
          {saving ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving
            ? "Saving..."
            : isNew
            ? "Create Profile & Continue"
            : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
