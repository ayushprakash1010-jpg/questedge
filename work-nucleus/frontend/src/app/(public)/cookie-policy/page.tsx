import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | QuestEdge",
};

export default function CookiePolicyPage() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Last updated: March 26, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. What Are Cookies
            </h2>
            <p className="mt-3">
              Cookies are small text files stored on your device when you visit a
              website. They help the website remember your preferences and
              improve your browsing experience. QuestEdge uses cookies and
              similar technologies to operate and improve the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Types of Cookies We Use
            </h2>

            <h3 className="mt-4 font-semibold text-slate-800">
              Essential Cookies
            </h3>
            <p className="mt-2">
              These cookies are required for the platform to function. They
              handle authentication sessions (via Auth0), maintain your login
              state, and ensure security. You cannot opt out of essential
              cookies.
            </p>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-800">
                      Cookie
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-800">
                      Purpose
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-800">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3">auth0.session</td>
                    <td className="px-4 py-3">
                      Maintains your authenticated session
                    </td>
                    <td className="px-4 py-3">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">csrf_token</td>
                    <td className="px-4 py-3">
                      Protects against cross-site request forgery
                    </td>
                    <td className="px-4 py-3">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">cookie_consent</td>
                    <td className="px-4 py-3">
                      Stores your cookie preference choice
                    </td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 font-semibold text-slate-800">
              Functional Cookies
            </h3>
            <p className="mt-2">
              These cookies remember your preferences such as sidebar state,
              theme settings, and recently viewed pages. They enhance your
              experience but are not strictly necessary.
            </p>

            <h3 className="mt-6 font-semibold text-slate-800">
              Analytics Cookies
            </h3>
            <p className="mt-2">
              We use analytics cookies to understand how users interact with the
              platform, which features are most used, and where users encounter
              issues. This data is aggregated and anonymized. It helps us
              prioritize improvements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. Third-Party Cookies
            </h2>
            <p className="mt-3">
              Some cookies are placed by third-party services we use:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Auth0</strong> — authentication and session management
              </li>
            </ul>
            <p className="mt-3">
              We do not use advertising or tracking cookies. We do not sell
              cookie data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. Managing Cookies
            </h2>
            <p className="mt-3">
              You can control cookies through your browser settings. Most
              browsers allow you to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>View which cookies are stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block cookies from specific or all websites</li>
              <li>Set preferences for first-party vs third-party cookies</li>
            </ul>
            <p className="mt-3">
              Please note that disabling essential cookies will prevent you from
              using the platform, as authentication requires cookies to
              function.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              5. Updates to This Policy
            </h2>
            <p className="mt-3">
              We may update this Cookie Policy to reflect changes in our
              practices or for legal reasons. The &quot;Last updated&quot; date
              at the top indicates when the policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. Contact Us
            </h2>
            <p className="mt-3">
              If you have questions about our use of cookies, contact us at{" "}
              <a
                href="mailto:privacy@questedge.com"
                className="text-indigo-600 hover:underline"
              >
                privacy@questedge.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
