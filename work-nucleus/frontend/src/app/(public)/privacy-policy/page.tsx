import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Work Nucleus",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Last updated: March 26, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. Introduction
            </h2>
            <p className="mt-3">
              Work Nucleus (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
              is committed to protecting the privacy of our users. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your
              information when you use our AI-powered hiring platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Information We Collect
            </h2>
            <h3 className="mt-3 font-semibold text-slate-800">
              2.1 Account Information
            </h3>
            <p className="mt-2">
              When you create an account, we collect your name, email address,
              organization name, and role. Authentication is handled securely via
              Auth0.
            </p>

            <h3 className="mt-4 font-semibold text-slate-800">
              2.2 Hiring Data
            </h3>
            <p className="mt-2">
              We collect data you enter into the platform including hiring plans,
              job descriptions, candidate information, interview feedback,
              pipeline stages, and decisions. This data is essential to provide
              our core services.
            </p>

            <h3 className="mt-4 font-semibold text-slate-800">
              2.3 Usage Data
            </h3>
            <p className="mt-2">
              We automatically collect information about how you interact with
              the platform, including pages visited, features used, and
              timestamps. This helps us improve the product experience.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. How We Use Your Information
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                To provide and maintain the Work Nucleus platform and its
                features
              </li>
              <li>
                To power AI features such as job description generation,
                feedback summarization, candidate scoring, and communication
                drafting
              </li>
              <li>
                To generate analytics and insights about your hiring process
              </li>
              <li>To send notifications and service-related communications</li>
              <li>To provide customer support and respond to inquiries</li>
              <li>
                To improve and optimize the platform based on usage patterns
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. AI Data Processing
            </h2>
            <p className="mt-3">
              Work Nucleus uses Anthropic&apos;s Claude AI to power features
              like JD generation and feedback summarization. Your data is
              processed by AI solely to deliver the requested service output.
              Your data is never used to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              5. Data Sharing
            </h2>
            <p className="mt-3">
              We do not sell your personal data. We may share information with:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Service providers</strong> who help us operate the
                platform (hosting, authentication, AI processing)
              </li>
              <li>
                <strong>Within your organization</strong> — team members with
                appropriate role-based access can view hiring data
              </li>
              <li>
                <strong>Legal authorities</strong> when required by law or to
                protect our rights
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. Data Security
            </h2>
            <p className="mt-3">
              We implement industry-standard security measures including
              encryption of data at rest and in transit, secure authentication
              via Auth0, role-based access control, and comprehensive audit
              logging. We regularly review our security practices to ensure your
              data remains protected.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              7. Data Retention
            </h2>
            <p className="mt-3">
              We retain your data for as long as your account is active or as
              needed to provide services. You may request deletion of your data
              at any time by contacting us. Upon account termination, we will
              delete or anonymize your data within 90 days, unless required by
              law to retain it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              8. Your Rights
            </h2>
            <p className="mt-3">
              Depending on your jurisdiction, you may have the right to access,
              correct, delete, or export your personal data. You may also
              withdraw consent for data processing. To exercise these rights,
              contact us at{" "}
              <a
                href="mailto:privacy@worknucleus.com"
                className="text-indigo-600 hover:underline"
              >
                privacy@worknucleus.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              9. Changes to This Policy
            </h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the updated policy on
              this page and updating the &quot;Last updated&quot; date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              10. Contact Us
            </h2>
            <p className="mt-3">
              If you have questions about this Privacy Policy, please contact us
              at{" "}
              <a
                href="mailto:privacy@worknucleus.com"
                className="text-indigo-600 hover:underline"
              >
                privacy@worknucleus.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
