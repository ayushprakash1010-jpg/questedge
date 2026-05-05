"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
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
          <div>
            <h2 className="text-xl font-bold text-slate-900">Reach out to us</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Whether you&apos;re exploring Work Nucleus for your team, need
              enterprise pricing, or have technical questions — we&apos;d love to
              hear from you.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Mail className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Email</div>
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
                  <div className="text-sm font-semibold text-slate-900">Phone</div>
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
                  <div className="text-sm font-semibold text-slate-900">Office</div>
                  <div className="mt-1 text-sm text-slate-600">Bangalore, India</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form — sunken Card surface per v2 spec for forms */}
          <div className="rounded-2xl border border-slate-200/60 bg-slate-50 p-8">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
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
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-first">First Name</Label>
                    <Input id="contact-first" type="text" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-last">Last Name</Label>
                    <Input id="contact-last" type="text" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">Work Email</Label>
                  <Input id="contact-email" type="email" required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-company">Company</Label>
                  <Input id="contact-company" type="text" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-message">How can we help?</Label>
                  <Textarea id="contact-message" rows={4} required />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
