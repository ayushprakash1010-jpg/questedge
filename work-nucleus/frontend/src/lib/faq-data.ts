export type FaqCategoryId =
  | "all"
  | "companies"
  | "recruiters"
  | "candidates"
  | "ai-privacy";

export interface FaqCategory {
  id: FaqCategoryId;
  label: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  categories: Exclude<FaqCategoryId, "all">[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { id: "all", label: "All Questions" },
  { id: "companies", label: "For Companies" },
  { id: "recruiters", label: "For Recruiters" },
  { id: "candidates", label: "For Candidates" },
  { id: "ai-privacy", label: "AI, Privacy & Jobs" },
];

export const faqs: FaqItem[] = [
  {
    id: "what-is-questedge",
    question: "What is QuestEdge?",
    answer:
      "QuestEdge is an AI-powered referral hiring marketplace and evaluation platform connecting companies, independent recruiters, and candidates. Companies publish mandates with referral bounties (and optionally accept direct applications), recruiters submit consented referrals protected by ownership locks, and hiring teams manage screening, coding/quiz assessments, video interviews, background verification, and digital offers in one workspace.",
    categories: ["companies", "recruiters", "candidates"],
  },
  {
    id: "reward-lifecycle",
    question: "How does the referral reward lifecycle work?",
    answer:
      "Companies configure each mandate's referral reward as either a fixed cash bounty or a percentage of the hired candidate's annual CTC. Rewards are tracked across 5 core lifecycle statuses: 'Potential' when a candidate accepts the referral, 'Eligible' and 'Pending Approval' once the candidate is selected or hired, 'Approved' after the company confirms tenure completion, and 'Paid' once withdrawn/disbursed. Rewards can also enter 'Disputed' or 'Cancelled' if a review is raised or tenure is not completed. No hire means zero bounty cost.",
    categories: ["companies", "recruiters"],
  },
  {
    id: "claim-scope-protection",
    question: "How do Claim Scope locks and duplicate protection work?",
    answer:
      "When a recruiter submits a referral for an open mandate, QuestEdge creates a Claim Scope ownership lock tied to that mandate's configured ownership period (defaulting to 180 days, minimum 30 days) with <48h consent urgency alerts and 3-day review SLA tracking. Candidate email addresses are SHA-256 hashed to prevent duplicate submissions on the same mandate—and candidate profiles also store SHA-256 phone hashes—protecting placement credit and reducing recruiter disputes.",
    categories: ["recruiters", "companies"],
  },
  {
    id: "pricing-and-plans",
    question: "What pricing plans does QuestEdge offer?",
    answer:
      "Companies can start on the Pay-on-Hire (₹0) plan with up to 2 active mandates and zero upfront retainers, upgrade to Growth Workspace (₹999/mo) for unlimited active mandates, Gemini AI screening, 5-stage funnel analytics, and BGV pre-checks, or request a custom Enterprise plan for custom approvals, DPDP governance, RBAC/SSO, and API exports. Independent recruiters can join for free or choose Talent Partner Pro (₹299/mo) for unlimited simultaneous claim scopes and advanced matching. QuestEdge is always free for candidates.",
    categories: ["companies", "recruiters", "candidates"],
  },
  {
    id: "candidate-consent",
    question: "How does candidate consent work?",
    answer:
      "When a recruiter refers a candidate, QuestEdge sends a private consent link by email (valid for 7 days) along with an in-app notification if the candidate already has an account. The candidate reviews the company name, role title, department, location, work model, reward context, and the referring recruiter's pitch note before deciding. Only after explicit acceptance does the referral move forward into the hiring team's active pipeline; candidates can also decline with one click.",
    categories: ["candidates", "recruiters", "ai-privacy"],
  },
  {
    id: "tenure-disputes-bypass",
    question: "What happens if a hire leaves early, or a reward is disputed?",
    answer:
      "Mandates include a retention/tenure period (typically 60 to 90 days) before final bounty approval—if a hire exits early or a dispute is upheld, the reward is cancelled so the company is not billed. To protect recruiters, QuestEdge also runs automated Hire Bypass Detection (flagging stale referrals, filled/paused mandates, and candidate status checks) and supports formal Reward Disputes backed by a tamper-evident SHA-256 audit log.",
    categories: ["companies", "recruiters"],
  },
  {
    id: "gemini-ai-suite",
    question: "How does Google Gemini AI work across screening, ranking, and matching?",
    answer:
      "QuestEdge uses Google Gemini AI across multiple workflows: auto-scoring referred candidates against mandate rubrics (fit percentage, strengths, and missing skills), bulk-scoring PDF/DOCX/TXT resumes in the standalone AI Resume Ranker with customizable weights and shortlisting rules, drafting structured mandates from a short prompt or uploaded JD, matching recruiters' talent pools to mandates, and summarizing BGV findings. All AI outputs are advisory—human reviewers make every hiring decision.",
    categories: ["companies", "recruiters", "ai-privacy"],
  },
  {
    id: "assessments-bgv-offers",
    question: "Does QuestEdge include assessments, video interviews, BGV, and offer letters?",
    answer:
      "Yes. Companies can run timed MCQ/quizzes, Monaco IDE + Judge0 coding challenges with tab-switch and fullscreen proctoring, and embedded 1-on-1 HD video interviews. For selected candidates, teams can initiate OTP-consented Background Verification (Identity via Aadhaar/PAN, Employment, Education, Address, Criminal, and Reference checks), generate and e-sign offer letters with CTC/ESOP breakups, and manage joining checklists.",
    categories: ["companies", "candidates"],
  },
  {
    id: "mandate-access-direct-apply",
    question: "Can companies control recruiter access or accept direct applications?",
    answer:
      "Yes. Each mandate lets companies choose who can participate—Open (any recruiter), Approval-Based, or Invite-Only—and toggle whether the role also accepts direct candidate applications alongside referrals. Candidates can apply directly to eligible mandates, and recruiters can even use 'Apply for Myself' on roles that accept direct applications.",
    categories: ["companies", "candidates", "recruiters"],
  },
  {
    id: "recruiter-eligibility-tiers",
    question: "Who can register as a recruiter, and how do Trust Tiers work?",
    answer:
      "Independent recruiters, specialized headhunters, and domain professionals can register for free. Verified profiles and successful hires advance recruiters across Bronze, Silver, Gold, and Platinum reputation tiers on the marketplace leaderboard. Note that Company, Recruiter, and Candidate workspaces are separate account types per login.",
    categories: ["recruiters"],
  },
  {
    id: "privacy-dpdp-gdpr",
    question: "How does QuestEdge protect candidate privacy and comply with data laws?",
    answer:
      "QuestEdge is built around India's Digital Personal Data Protection (DPDP) Act 2023 and GDPR Article 17 & Article 20 principles. Candidate emails and phone numbers are SHA-256 hashed, security events are chained with tamper-evident SHA-256 hashes, and authenticated candidates have self-service controls in their profile to download a full JSON data-portability export or trigger instant cryptographic anonymization (Right to Erasure).",
    categories: ["candidates", "ai-privacy", "companies"],
  },
  {
    id: "external-job-market",
    question: "What is the External Job Market?",
    answer:
      "The External Job Market aggregates live job listings from Greenhouse, Lever, Ashby, Jobicy, Remotive, RemoteOK, Careerjet, and JSearch into a single searchable workspace. When enabled for your account, signed-in candidates and recruiters can filter roles, bookmark jobs, track external applications, and view AI-powered 'For You' match scores completely free.",
    categories: ["candidates", "recruiters", "ai-privacy"],
  },
];
