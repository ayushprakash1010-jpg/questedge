import { Hero } from "@/components/landing/hero";
import { MarketplaceStats } from "@/components/landing/marketplace-stats";
import { TrustStrip } from "@/components/landing/trust-strip";
import { AIAgents } from "@/components/landing/ai-agents";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { CTABanner } from "@/components/landing/cta-banner";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <MarketplaceStats />
      <TrustStrip />
      <AIAgents />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTABanner />
    </>
  );
}

