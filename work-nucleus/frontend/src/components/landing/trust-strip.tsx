import { CheckCircle, Shield, DollarSign, ClipboardCheck } from "lucide-react";

const trustItems = [
  {
    icon: CheckCircle,
    title: "Verified Recruiters",
    desc: "Every recruiter is identity-verified before accessing the marketplace.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: Shield,
    title: "Candidate Consent First",
    desc: "Candidates always see full job details before their profile is shared.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: DollarSign,
    title: "Escrow-Protected Rewards",
    desc: "Rewards are locked in until tenure is confirmed. Zero risk of non-payment.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: ClipboardCheck,
    title: "Full Audit Trail",
    desc: "Every action — referral, consent, pipeline move — is logged and auditable.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export function TrustStrip() {
  return (
    <section className="bg-slate-50 border-y border-slate-200 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-10">
          Why companies & recruiters trust QuestEdge
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-xl bg-white p-5 border border-slate-200 shadow-sm"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
