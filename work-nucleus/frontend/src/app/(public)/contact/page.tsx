"use client";

import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Contact Us
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Have questions about Work Nucleus? Our team is here to help.
          </p>
        </div>

        <div className="mt-16 grid gap-16 lg:grid-cols-2">
          {/* Contact Info */}
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Reach out to us
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Whether you&apos;re exploring Work Nucleus for your team,
              need enterprise pricing, or have technical questions — we&apos;d
              love to hear from you.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Mail className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Email
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    hello@work-nucleus.com
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Phone className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Phone
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    +91 (800) 123-4567
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Office
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Bangalore, India
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-7 w-7 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Message sent!
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  We&apos;ll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Company
                  </label>
                  <input
                    type="text"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    How can we help?
                  </label>
                  <textarea
                    rows={4}
                    required
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
