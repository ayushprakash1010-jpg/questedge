import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://questedge.vercel.app/#organization",
      "name": "QuestEdge Technologies",
      "url": "https://questedge.vercel.app",
      "logo": "https://questedge.vercel.app/icon-512.png",
      "description":
        "AI-Powered Referral Hiring Marketplace connecting companies, independent recruiters, and top talent with milestone-backed bounties.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://questedge.vercel.app/#application",
      "name": "QuestEdge",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://questedge.vercel.app/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is QuestEdge?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "QuestEdge is an AI-powered referral hiring marketplace connecting companies with independent recruiters and talent networks. Companies publish open mandates with referral bounties, recruiters lock 48-hour exclusive claim scopes to refer vetted candidates, and candidates review and consent to roles before their information is shared.",
          },
        },
        {
          "@type": "Question",
          "name": "How does the referral reward lifecycle work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Companies configure referral rewards when posting a mandate. Rewards transition through a 5-stage lifecycle: 'Potential' when candidate consent is given, 'Eligible' upon offer generation, 'Pending Approval' once the candidate joins, and 'Approved' after tenure completion (e.g., 90 days). Once approved, payouts are processed directly to the recruiter. No hire = zero cost.",
          },
        },
        {
          "@type": "Question",
          "name": "What is 48-Hour Claim Scope exclusivity?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "A Claim Scope grants a recruiter exclusive rights for 48 hours to refer a specific candidate to an open mandate. Candidate email and phone hashes are checked to prevent duplicate submissions, eliminate recruiter disputes, and ensure the recruiter who brought the talent is protected.",
          },
        },
        {
          "@type": "Question",
          "name": "How does candidate consent work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "When a recruiter refers a candidate, the candidate receives an encrypted email invitation. The candidate reviews full details — company name, job description, compensation range, and the referring recruiter's note — before accepting. The candidate's contact info and resume are only revealed to the hiring team after explicit acceptance.",
          },
        },
        {
          "@type": "Question",
          "name": "How does the Gemini AI screening engine assist hiring teams?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "QuestEdge leverages Google Gemini AI to analyze candidate resumes against mandate rubrics. It produces fit percentage scores, highlights technical strengths, and flags missing requirements so hiring teams can prioritize the highest-probability candidates first.",
          },
        },
        {
          "@type": "Question",
          "name": "How does QuestEdge protect candidate privacy and comply with data laws?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "QuestEdge is built for full compliance with the Digital Personal Data Protection (DPDP) Act 2023 and GDPR Article 20. Phone numbers and emails are SHA-256 hashed for collision detection without exposing raw PII. Candidates have full self-service access to export their data package or invoke instant Right-to-be-Forgotten data scrubbing.",
          },
        },
        {
          "@type": "Question",
          "name": "What happens if a hired candidate leaves before completing tenure?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Each mandate specifies a tenure duration (typically 60 to 90 days). If a candidate resigns or is terminated before completing this period, the reward is cancelled, and the company is never billed for that hire.",
          },
        },
        {
          "@type": "Question",
          "name": "Who can register as a recruiter on QuestEdge?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text":
              "Independent recruiters, specialized headhunters, and industry professionals with vetted domain networks can register for free. Verified recruiter profiles build trust with companies, gain access to higher bounty tiers, and unlock automated AI candidate matching.",
          },
        },
      ],
    },
  ],
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
