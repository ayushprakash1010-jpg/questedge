"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMandate, joinMandate, leaveMandate, Mandate } from "@/lib/marketplace-api";
import { MandateStatusBadge, RewardBadge, SkillChip } from "@/components/marketplace/MandateCard";
import { Loader2, ArrowLeft, Building2, MapPin, Briefcase, CheckCircle2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
export default function RecruiterMandateDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ candidateName: "", candidateEmail: "", candidatePhone: "", recruiterNote: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const tokenRes = await fetch("/api/auth/token");
        const { accessToken } = await tokenRes.json();
        const data = await getMandate(accessToken, id);
        setMandate({ ...data, isJoined: false }); 
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/v1/referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mandateId: id,
          ...formData,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error("Failed to submit referral. Server returned an invalid response.");
        }
        const message = errorData?.error?.message || errorData?.message || "Failed to submit referral";
        throw new Error(message);
      }

      setSubmitSuccess(true);
      toast.success("Consent request sent successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ candidateName: "", candidateEmail: "", candidatePhone: "", recruiterNote: "" });
        setSubmitSuccess(false);
      }, 2000);

    } catch (err: any) {
      setSubmitError(err.message);
      toast.error(err.message || "Failed to submit referral.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (!mandate) return <div>Mandate not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-sky-600 transition-colors mb-4 flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Discover
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-500 font-medium flex items-center gap-1">
                  <Building2 className="h-4 w-4" /> {mandate.organization.name}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">{mandate.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                {mandate.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{mandate.location}</span>}
                {mandate.workModel && <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{mandate.workModel}</span>}
                <MandateStatusBadge status={mandate.status} />
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              {mandate.referralRewardAmount && (
                <RewardBadge amount={mandate.referralRewardAmount} currency={mandate.currency} />
              )}
              <Button 
                onClick={() => setIsModalOpen(true)}
                size="lg" 
                className="bg-sky-600 hover:bg-sky-700 text-white shadow-md gap-2 w-full"
              >
                <UserPlus className="h-4 w-4" />
                Refer a Candidate
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 text-lg mb-4">Job Description</h3>
            <div className="prose prose-sm max-w-none text-slate-600">
              {mandate.description}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {mandate.mandatorySkills.map((s) => (
                <SkillChip key={s} skill={s} />
              ))}
            </div>
          </div>

          {(mandate.hiringManagerName || mandate.teamDescription) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Team & Reporting</h3>
              {mandate.hiringManagerName && (
                <div className="mb-4">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reports To</span>
                  <div className="font-medium text-slate-900">{mandate.hiringManagerName}</div>
                  {mandate.hiringManagerTitle && (
                    <div className="text-sm text-slate-500">{mandate.hiringManagerTitle}</div>
                  )}
                </div>
              )}
              {mandate.teamDescription && (
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">About the Team</span>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap">{mandate.teamDescription}</div>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-slate-100 rounded-xl border border-slate-200 p-6 text-center">
            <h3 className="font-semibold text-slate-700 mb-2">Your Referrals</h3>
            <p className="text-sm text-slate-500 mb-4">You haven't referred anyone for this mandate yet.</p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="w-full bg-white border-sky-200 text-sky-700 hover:bg-sky-50">
              Submit First Referral
            </Button>
          </div>
        </div>
      </div>

      {/* Referral Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900">Refer a Candidate</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {submitSuccess ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Referral Submitted!</h4>
                  <p className="text-sm text-slate-500 text-center">An email has been dispatched to the candidate for consent.</p>
                </div>
              ) : (
                <form onSubmit={handleReferralSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Candidate Full Name</label>
                    <Input 
                      required
                      placeholder="Jane Doe"
                      value={formData.candidateName}
                      onChange={(e) => setFormData({...formData, candidateName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Candidate Email</label>
                    <Input 
                      required
                      type="email"
                      placeholder="jane@example.com"
                      value={formData.candidateEmail}
                      onChange={(e) => setFormData({...formData, candidateEmail: e.target.value})}
                    />
                    <p className="text-xs text-slate-500 mt-1.5">We'll send the secure consent link here.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <Input 
                      placeholder="+1 234 567 890"
                      value={formData.candidatePhone}
                      onChange={(e) => setFormData({...formData, candidatePhone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Recruiter Pitch Note <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <textarea 
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                      placeholder="Tell the candidate why they are a great fit..."
                      value={formData.recruiterNote}
                      onChange={(e) => setFormData({...formData, recruiterNote: e.target.value})}
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                      {submitError}
                    </div>
                  )}

                  <Button type="submit" disabled={submitting} className="w-full bg-sky-600 hover:bg-sky-700 text-white mt-4">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {submitting ? "Submitting..." : "Send Consent Request"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
