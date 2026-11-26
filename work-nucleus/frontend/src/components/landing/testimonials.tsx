import { Star } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  avatarBg: string;
  tag: string;
  tagColor: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Switching from traditional agency retainers to performance-backed referral bounties gave our engineering team immediate cost predictability. Gemini AI fit scoring filters out resume noise before hiring manager review, and paying only after tenure completion removes hiring risk.",
    name: "Dr. Shiv Kumar",
    role: "Managing Director · VIP & Enterprise Hiring Partner",
    initials: "SK",
    avatarBg: "bg-emerald-600",
    tag: "For Companies",
    tagColor: "text-emerald-400 bg-emerald-950/60 border-emerald-800/60",
  },
  {
    quote:
      "Exclusive claim scope locks change the game for independent recruiters. Instead of worrying about duplicate submissions or credit disputes, SHA-256 collision protection secures my ownership window and lets me track every milestone through payout.",
    name: "Pooja Singh",
    role: "Founder & AI Talent Strategist · GrowYT",
    initials: "PS",
    avatarBg: "bg-violet-600",
    tag: "For Recruiters",
    tagColor: "text-violet-400 bg-violet-950/60 border-violet-800/60",
  },
  {
    quote:
      "I usually ignore cold recruiter outreach because profiles get forwarded without permission. On QuestEdge, I reviewed the company name, role details, work model, and recruiter pitch note before granting consent—and my profile stayed private until I accepted.",
    name: "Ayush Prakash",
    role: "Staff Software Engineer · Systems & Infrastructure",
    initials: "AP",
    avatarBg: "bg-amber-600",
    tag: "For Candidates",
    tagColor: "text-amber-400 bg-amber-950/60 border-amber-800/60",
  },
];

export function Testimonials() {
  return (
    <section aria-labelledby="testimonials-heading" className="relative overflow-hidden bg-[#0B132B] py-16 sm:py-20 text-white">
      {/* Subtle background ambient glows */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-3.5 py-1 rounded-full border border-cyan-800/60">
            Built for Every Stakeholder
          </span>
          <h2 id="testimonials-heading" className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Designed for hiring teams, recruiters, and engineers
          </h2>
          <p className="mt-4 text-base text-slate-300">
            Zero upfront retainers, protected claim scopes, and consent-first candidate privacy across every stage.
          </p>
        </div>

        {/* 3 Dark Perspective Cards */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-[#141C2E]/90 p-7 shadow-xl backdrop-blur-sm hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-5xl font-black leading-none text-cyan-400/30 group-hover:text-cyan-400/50 transition-colors">
                    “
                  </span>

                  <div className="flex items-center gap-1 text-amber-400" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${t.tagColor}`}>
                    {t.tag}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-200 font-normal">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-7 flex items-center gap-3.5 border-t border-slate-800/80 pt-5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.avatarBg} text-sm font-bold text-white shadow-md`}>
                  {t.initials}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-white truncate">{t.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
