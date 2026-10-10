"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRecruiterProfile, createRecruiterProfile, updateRecruiterProfile } from "@/lib/marketplace-api";
import { User, Briefcase, Link as LinkIcon, Check, Loader, Save } from "lucide-react";
import { toast } from "sonner";

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
    headline: "",
    bio: "",
    experienceYears: "",
    linkedinUrl: "",
    portfolioUrl: "",
    specializations: [] as string[],
  });
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
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
        // No profile yet
        setIsNew(true);
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
        specializations: form.specializations.length > 0 ? form.specializations : undefined,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : undefined,
      };
      
      if (isNew) {
        await createRecruiterProfile(accessToken, payload);
      } else {
        await updateRecruiterProfile(accessToken, payload);
      }
      toast.success(isNew ? "Profile created! Welcome aboard 🎉" : "Profile updated!");
      if (isNew) window.location.href = "/recruiter/dashboard"; // Forces a hard reload to pick up new session claims
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
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {isNew ? "Set Up Your Recruiter Profile" : "My Profile"}
              {isVerified && (
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  <Check className="h-3 w-3" /> Verified
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500">
              {isNew
                ? "Complete your profile to start submitting referrals and earning rewards."
                : "Update your recruiter details and specializations."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Basic Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ayush Prakash"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.experienceYears}
                onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
                placeholder="5"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Professional Headline</label>
              <input
                type="text"
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder="Senior Technical Recruiter specializing in FinTech & SaaS"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">About / Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell companies about your background, recruitment style, and track record..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* LinkedIn */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Online Presence</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-sky-600" /> LinkedIn URL
              </label>
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/your-profile"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-sky-600" /> Portfolio / Past Placements
              </label>
              <input
                type="url"
                value={form.portfolioUrl}
                onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
                placeholder="https://your-portfolio.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Specializations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-1">Specializations</h2>
          <p className="text-xs text-slate-500 mb-4">Select the domains you recruit for. This helps match you with relevant mandates.</p>
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
                      ? "border-sky-500 bg-sky-50 text-sky-700"
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
            <p className="mt-3 text-xs text-sky-600 font-medium">{form.specializations.length} selected</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {saving ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : isNew ? "Create Profile & Continue" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
