"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Briefcase,
  MapPin,
  Building2,
  Check,
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface JobData {
  slug: string;
  organization: string;
  title: string;
  department: string;
  designation: string;
  summary: string;
  responsibilities: string[];
  qualifications: { required: string[]; preferred: string[] };
  workMode: string;
  aboutCompany: string;
  skills: { name: string; category: string; priority: string }[];
}

type SubmitState = "idle" | "submitting" | "success" | "error" | "conflict";

export default function PublicJobPage() {
  const { slug } = useParams<{ slug: string }>();
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/public/jobs/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setJob(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleApplyClick = () => {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Please upload a PDF or DOCX file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must not exceed 10 MB");
      return;
    }
    setResumeFile(file);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      setErrorMessage("Please upload your resume");
      return;
    }

    setSubmitState("submitting");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (phone) formData.append("phone", phone);
    if (coverLetter) formData.append("coverLetter", coverLetter);
    formData.append("resume", resumeFile);

    try {
      const res = await fetch(`/api/public/jobs/${slug}/apply`, {
        method: "POST",
        body: formData,
      });

      if (res.status === 409) {
        setSubmitState("conflict");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.message || data.error || "Failed to submit application");
        setSubmitState("error");
        return;
      }

      setSubmitState("success");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setSubmitState("error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <h2 className="text-2xl font-bold text-slate-900">Job Not Found</h2>
        <p className="mt-2 text-slate-500">
          This job listing may have been removed or is no longer active.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Building2 className="h-4 w-4" />
          <span>{job.organization}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{job.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="border-slate-200">
            <Briefcase className="mr-1 h-3 w-3" />
            {job.department}
          </Badge>
          <Badge variant="outline" className="border-slate-200">
            {job.designation}
          </Badge>
          {job.workMode && (
            <Badge variant="outline" className="border-slate-200">
              <MapPin className="mr-1 h-3 w-3" />
              {job.workMode}
            </Badge>
          )}
        </div>
        <div className="mt-6">
          <Button
            size="lg"
            onClick={handleApplyClick}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Apply Now
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card className="mb-6 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">About the Role</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600">{job.summary}</p>
        </CardContent>
      </Card>

      {/* Responsibilities */}
      <Card className="mb-6 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Key Responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="ml-4 list-decimal space-y-2">
            {job.responsibilities?.map((r, i) => (
              <li key={i} className="text-sm text-slate-600">{r}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Qualifications */}
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-green-700">Required Qualifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {job.qualifications?.required?.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-indigo-700">Preferred Qualifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {job.qualifications?.preferred?.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <Card className="mb-6 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={
                    s.priority === "MUST_HAVE"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }
                >
                  {s.name}
                  {s.priority === "MUST_HAVE" && (
                    <span className="ml-1 text-[10px]">(Required)</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* About Company */}
      {job.aboutCompany && (
        <Card className="mb-8 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">About {job.organization}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-slate-600">{job.aboutCompany}</p>
          </CardContent>
        </Card>
      )}

      {/* Application Form */}
      {showForm && (
        <div ref={formRef} id="apply-form">
          {submitState === "success" ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex flex-col items-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
                <h3 className="mt-4 text-xl font-semibold text-green-800">
                  Application Submitted!
                </h3>
                <p className="mt-2 text-center text-sm text-green-700">
                  Thank you for applying. You&apos;ll hear from {job.organization} soon.
                </p>
              </CardContent>
            </Card>
          ) : submitState === "conflict" ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex flex-col items-center py-12">
                <AlertCircle className="h-16 w-16 text-amber-600" />
                <h3 className="mt-4 text-xl font-semibold text-amber-800">
                  Already Applied
                </h3>
                <p className="mt-2 text-center text-sm text-amber-700">
                  You have already applied to this position with this email address.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl">Apply for {job.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Phone
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Cover Letter
                    </label>
                    <Textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Tell us why you're interested in this role..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Resume <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {resumeFile ? (
                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        <span className="flex-1 text-sm text-slate-700">
                          {resumeFile.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(resumeFile.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setResumeFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="rounded p-1 hover:bg-slate-200"
                        >
                          <X className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
                      >
                        <Upload className="h-5 w-5" />
                        Click to upload resume (PDF, DOCX — max 10 MB)
                      </button>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={submitState === "submitting"}
                  >
                    {submitState === "submitting"
                      ? "Submitting..."
                      : "Submit Application"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
