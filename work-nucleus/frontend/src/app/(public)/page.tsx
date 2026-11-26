import { Hero } from "@/components/landing/hero";
import { MarketplaceStats } from "@/components/landing/marketplace-stats";
import { LiveMarketplacePreview } from "@/components/landing/live-marketplace-preview";
import { Features } from "@/components/landing/features";
import { ExternalJobMarket } from "@/components/landing/external-job-market";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AIAgents } from "@/components/landing/ai-agents";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CTABanner } from "@/components/landing/cta-banner";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <MarketplaceStats />
      <LiveMarketplacePreview />
      <Features />
      <ExternalJobMarket />
      <HowItWorks />
      <AIAgents />
      <RoiCalculator />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTABanner />
    </>
  );
}
