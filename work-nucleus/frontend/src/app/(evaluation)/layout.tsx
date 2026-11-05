import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidate Assessment Session | QuestEdge",
  description: "Secure, proctored in-platform evaluation session on QuestEdge.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EvaluationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 antialiased text-slate-800">
      {children}
    </div>
  );
}
