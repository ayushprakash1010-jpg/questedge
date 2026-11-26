import { ShieldCheck, Clock, CheckCircle2, Award } from "lucide-react";

const valuePillars = [
  {
    icon: Award,
    value: "₹0",
    label: "Upfront Retainer",
    sub: "Pay bounties only on verified, tenured hires",
    accent: "text-indigo-600 bg-indigo-50",
  },
  {
    icon: Clock,
    value: "180d",
    label: "Default Claim Lock",
    sub: "Configurable mandate ownership locks & duplicate shield",
    accent: "text-violet-600 bg-violet-50",
  },
  {
    icon: ShieldCheck,
    value: "100%",
    label: "Consent-First",
    sub: "Candidates review full details before profile sharing",
    accent: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: CheckCircle2,
    value: "5-Stage",
    label: "Milestone Security",
    sub: "Transparent tracking from submission to tenure payout",
    accent: "text-cyan-600 bg-cyan-50",
  },
];

export function MarketplaceStats() {
  return (
    <section aria-labelledby="stats-heading" className="border-y border-slate-200/80 bg-white py-10">
      <h2 id="stats-heading" className="sr-only">Key Marketplace Guarantees and Statistics</h2>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-slate-200/80">
          {valuePillars.map((pillar) => (
            <div
              key={pillar.label}
              className="flex flex-col items-center text-center lg:px-6"
            >
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${pillar.accent}`}>
                  <pillar.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {pillar.value}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-bold text-slate-800">{pillar.label}</div>
              <div className="mt-0.5 max-w-[220px] text-xs text-slate-500 leading-relaxed">{pillar.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
