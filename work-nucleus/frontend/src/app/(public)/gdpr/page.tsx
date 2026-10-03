import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GDPR Compliance | QuestEdge",
};

export default function GDPRPage() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          GDPR Compliance
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Last updated: March 26, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. Our Commitment
            </h2>
            <p className="mt-3">
              QuestEdge is committed to complying with the General Data
              Protection Regulation (GDPR) for all users in the European
              Economic Area (EEA), United Kingdom, and Switzerland. This page
              explains how we handle personal data under GDPR requirements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Data Controller & Processor
            </h2>
            <p className="mt-3">
              When you use QuestEdge, your organization acts as the{" "}
              <strong>Data Controller</strong> for candidate and hiring data.
              QuestEdge acts as the <strong>Data Processor</strong>,
              processing data on your behalf according to your instructions and
              our Data Processing Agreement (DPA).
            </p>
            <p className="mt-3">
              For account and usage data, QuestEdge acts as the Data
              Controller.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. Legal Basis for Processing
            </h2>
            <p className="mt-3">
              We process personal data under the following legal bases:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Contract performance</strong> — processing necessary to
                provide the QuestEdge service as agreed in our Terms of
                Service
              </li>
              <li>
                <strong>Legitimate interest</strong> — improving and securing
                the platform, preventing fraud, and providing customer support
              </li>
              <li>
                <strong>Consent</strong> — for optional analytics cookies and
                marketing communications, where applicable
              </li>
              <li>
                <strong>Legal obligation</strong> — where we are required to
                retain or disclose data by law
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. Your Rights Under GDPR
            </h2>
            <p className="mt-3">
              As a data subject, you have the following rights:
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">
                  Right to Access
                </h3>
                <p className="mt-1">
                  You can request a copy of the personal data we hold about you.
                  We will respond within 30 days.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">
                  Right to Rectification
                </h3>
                <p className="mt-1">
                  You can request that we correct inaccurate personal data. You
                  can also update your profile information directly in the
                  platform.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">
                  Right to Erasure
                </h3>
                <p className="mt-1">
                  You can request deletion of your personal data. We will comply
                  unless we have a legal obligation to retain it. Deletion will
                  be completed within 30 days.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">
                  Right to Data Portability
                </h3>
                <p className="mt-1">
                  You can request your data in a structured, commonly used,
                  machine-readable format (JSON or CSV).
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">
                  Right to Object
                </h3>
                <p className="mt-1">
                  You can object to processing based on legitimate interest. We
                  will cease processing unless we have compelling legitimate
                  grounds.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">
                  Right to Restrict Processing
                </h3>
                <p className="mt-1">
                  You can request that we restrict processing of your data while
                  a complaint or dispute is being resolved.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              5. AI Processing & Automated Decisions
            </h2>
            <p className="mt-3">
              QuestEdge uses AI to generate suggestions such as candidate
              scores and feedback summaries. These are{" "}
              <strong>recommendations only</strong> — no hiring decisions are
              made automatically by the platform. Human oversight is required for
              all hiring decisions.
            </p>
            <p className="mt-3">
              Under GDPR Article 22, you have the right not to be subject to
              decisions based solely on automated processing. QuestEdge is
              designed so that all AI outputs require human review before action
              is taken.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. Data Transfers
            </h2>
            <p className="mt-3">
              If your data is transferred outside the EEA, we ensure appropriate
              safeguards are in place, including Standard Contractual Clauses
              (SCCs) approved by the European Commission. Our AI processing
              provider (Anthropic) maintains their own GDPR compliance measures.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              7. Data Protection Officer
            </h2>
            <p className="mt-3">
              For GDPR-related inquiries, you can contact our data protection
              team at{" "}
              <a
                href="mailto:dpo@questedge.com"
                className="text-indigo-600 hover:underline"
              >
                dpo@questedge.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              8. Data Processing Agreement
            </h2>
            <p className="mt-3">
              Enterprise customers can request a Data Processing Agreement (DPA)
              that details our obligations as a data processor. Contact{" "}
              <a
                href="mailto:legal@questedge.com"
                className="text-indigo-600 hover:underline"
              >
                legal@questedge.com
              </a>{" "}
              to request a DPA.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              9. Data Breach Notification
            </h2>
            <p className="mt-3">
              In the event of a personal data breach that poses a risk to your
              rights and freedoms, we will notify the relevant supervisory
              authority within 72 hours and affected individuals without undue
              delay, as required by GDPR Article 33 and 34.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              10. Supervisory Authority
            </h2>
            <p className="mt-3">
              If you believe your data protection rights have been violated, you
              have the right to lodge a complaint with your local data protection
              supervisory authority.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
