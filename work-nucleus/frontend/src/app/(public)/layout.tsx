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
