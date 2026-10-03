"use client";

import { useState } from "react";
import { Mail, CheckCircle2, Building2, Target, UserCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState("company");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="bg-slate-50 py-24 sm:py-32 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600">
            <MessageSquare className="h-4 w-4" /> Contact Us
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            We're here to help
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            We're here for every side of the marketplace — Companies, Recruiters, and Candidates.
          </p>
        </div>

        {/* Quick Contact Cards */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">Companies</h3>
            <p className="mt-2 text-sm text-slate-500">
              Need help posting mandates, setting up billing, or managing referrals?
            </p>
            <a href="mailto:companies@questedge.com" className="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-500">
              companies@questedge.com &rarr;
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
              <Target className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">Recruiters</h3>
            <p className="mt-2 text-sm text-slate-500">
              Questions about KYC verification, payouts, or how escrow rewards work?
            </p>
            <a href="mailto:recruiters@questedge.com" className="mt-4 inline-flex items-center text-sm font-semibold text-violet-600 hover:text-violet-500">
              recruiters@questedge.com &rarr;
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <UserCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">Candidates</h3>
            <p className="mt-2 text-sm text-slate-500">
              Need help with consent requests, profile management, or job tracking?
            </p>
            <a href="mailto:candidates@questedge.com" className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-500">
              candidates@questedge.com &rarr;
            </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="mx-auto mt-16 max-w-2xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  Message sent!
                </h3>
                <p className="mt-2 text-base text-slate-600">
                  We'll route this to the right team and get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="contact-reason">What's this about?</Label>
                  <select
                    id="contact-reason"
                    required
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select a reason...</option>
                    <option value="company-setup">I want to post mandates as a company</option>
                    <option value="recruiter-join">I want to join as a recruiter</option>
                    <option value="candidate-help">I need help with my candidate application</option>
                    <option value="billing">I have a billing or payment question</option>
                    <option value="support">Technical support</option>
                    <option value="press">Partnership / press inquiry</option>
                  </select>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="contact-first">First Name</Label>
                    <Input id="contact-first" type="text" className="mt-1.5" required />
                  </div>
                  <div>
                    <Label htmlFor="contact-last">Last Name</Label>
                    <Input id="contact-last" type="text" className="mt-1.5" required />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact-email">Email Address</Label>
                  <Input id="contact-email" type="email" className="mt-1.5" required />
                </div>

                <div>
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea id="contact-message" rows={5} className="mt-1.5" required placeholder="How can we help you?" />
                </div>

                <Button type="submit" size="lg" className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700">
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
