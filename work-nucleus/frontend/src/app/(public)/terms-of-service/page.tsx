import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | QuestEdge",
};

export default function TermsOfServicePage() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Last updated: March 26, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3">
              By accessing or using QuestEdge (&quot;the Platform&quot;), you
              agree to be bound by these Terms of Service. If you are using the
              Platform on behalf of an organization, you represent that you have
              authority to bind that organization to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Description of Service
            </h2>
            <p className="mt-3">
              QuestEdge is an AI-powered hiring management platform that
              provides tools for creating hiring plans, generating job
              descriptions, managing interview pipelines, collecting feedback,
              scoring candidates, drafting communications, and analyzing hiring
              metrics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. Account Registration
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                You must provide accurate and complete information when creating
                an account
              </li>
              <li>
                You are responsible for maintaining the security of your account
                credentials
              </li>
              <li>
                You must notify us immediately of any unauthorized use of your
                account
              </li>
              <li>
                One person or organization may not maintain more than one free
                account
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. Acceptable Use
            </h2>
            <p className="mt-3">You agree not to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Use the Platform for any unlawful purpose or in violation of
                applicable employment laws
              </li>
              <li>
                Upload candidate data without appropriate consent or legal basis
              </li>
              <li>
                Attempt to reverse-engineer, decompile, or extract the AI models
                or algorithms
              </li>
              <li>
                Use automated means to access the Platform beyond the provided
                interfaces
              </li>
              <li>
                Share account access with unauthorized individuals
              </li>
              <li>
                Use the Platform in a way that discriminates against candidates
                based on protected characteristics
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              5. Subscription Plans & Payment
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                The Starter plan is free with limited features as described on
                our pricing page
              </li>
              <li>
                Paid plans are billed monthly or annually as selected at
                subscription time
              </li>
              <li>
                Prices may change with 30 days&apos; written notice
              </li>
              <li>
                Refunds are available within the first 14 days of a new paid
                subscription
              </li>
              <li>
                Downgrading may result in loss of access to certain features and
                data
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. AI-Generated Content
            </h2>
            <p className="mt-3">
              The Platform uses AI (powered by Anthropic&apos;s Claude) to
              generate job descriptions, feedback summaries, candidate scores,
              and communications. You acknowledge that:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                AI-generated content is provided as suggestions and should be
                reviewed before use
              </li>
              <li>
                You are responsible for reviewing, editing, and approving all
                AI-generated output before it is shared externally
              </li>
              <li>
                We do not guarantee the accuracy, completeness, or legal
                compliance of AI-generated content
              </li>
              <li>
                Hiring decisions remain solely your responsibility — the
                Platform assists but does not make decisions for you
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              7. Data Ownership
            </h2>
            <p className="mt-3">
              You retain ownership of all data you enter into the Platform,
              including hiring plans, candidate information, and feedback. We
              claim no ownership rights over your content. You grant us a
              limited license to process your data solely for the purpose of
              providing the services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              8. Intellectual Property
            </h2>
            <p className="mt-3">
              The Platform, including its design, features, AI models, and
              branding, is the intellectual property of QuestEdge. You may not
              copy, modify, distribute, or create derivative works based on the
              Platform without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              9. Service Availability
            </h2>
            <p className="mt-3">
              We strive to maintain high availability but do not guarantee
              uninterrupted access. We may perform scheduled maintenance with
              advance notice. We are not liable for downtime caused by factors
              beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              10. Limitation of Liability
            </h2>
            <p className="mt-3">
              To the maximum extent permitted by law, QuestEdge shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of the Platform. Our total
              liability shall not exceed the amount you paid us in the twelve
              months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              11. Termination
            </h2>
            <p className="mt-3">
              Either party may terminate the agreement at any time. You may
              delete your account through the Platform settings or by contacting
              support. We may suspend or terminate your access if you violate
              these terms, with notice when practicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              12. Changes to Terms
            </h2>
            <p className="mt-3">
              We may modify these Terms from time to time. Material changes will
              be communicated via email or in-app notification at least 30 days
              before taking effect. Continued use of the Platform after changes
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              13. Contact
            </h2>
            <p className="mt-3">
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:legal@questedge.com"
                className="text-indigo-600 hover:underline"
              >
                legal@questedge.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
