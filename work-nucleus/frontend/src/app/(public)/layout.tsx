import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { faqs } from "@/lib/faq-data";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://questedge.in/#organization",
      "name": "QuestEdge Technologies",
      "url": "https://questedge.in",
      "logo": "https://questedge.in/icon-512.png",
      "description":
        "AI-Powered Referral Hiring Marketplace connecting companies, independent recruiters, and top talent with milestone-backed bounties.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://questedge.in/#application",
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
      "@id": "https://questedge.in/#faq",
      "mainEntity": faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
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
