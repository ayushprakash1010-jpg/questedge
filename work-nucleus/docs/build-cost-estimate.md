# QuestEdge — Build, Deploy & Maintain Cost Estimate

> **Audience:** Founders, investors, leadership, hiring managers
> **Prepared:** 2026-05-04
> **Scope:** End-to-end HR Tech platform — Recruitment → Background Verification → Appraisal → Compensation
> **Currency:** Indian Rupees (₹) with USD equivalents at ₹83/USD

---

## 1. Executive Summary

QuestEdge is an AI-first HR Tech platform. The hiring module is the first vertical; appraisal and compensation are the next. This document estimates the **time, team, and money** required to take the platform from its current state to a production-grade, multi-tenant SaaS covering the full employee lifecycle.

| Metric | Value |
|---|---|
| Code already written | **~27,200 LOC** across 4 services |
| Effort already invested | **~7–8 months** of equivalent full-time work |
| Effort remaining (full scope) | **14–16 months** with a 6-person team |
| Total build cost (remaining) | **₹1.4 Cr – ₹1.9 Cr** (USD ~$170K – $230K) |
| Deployment cost (Year 1) | **₹6 – 12 lakh / year** (USD ~$7K – $14K) |
| Maintenance cost (steady state) | **₹2.4 Cr – ₹3.0 Cr / year** (team + infra + vendors) |

---

## 2. Platform Snapshot — What Already Exists

### 2.1 Architecture
- **Backend** — NestJS 10 + TypeScript + Prisma + PostgreSQL 16 (117 files)
- **Frontend** — Next.js 14 + React 19 + Nova Design System + Tailwind v4 (93 files)
- **AI Service** — FastAPI + Anthropic Claude + 7 specialised AI agents (24 files)
- **Support Admin** — Standalone Next.js app for L1–L3 internal support (56 files)
- **Infra** — Docker Compose (dev + prod), Nginx reverse proxy, Redis (cache + pg-boss queue), MinIO/S3 storage, Auth0 SSO

### 2.2 Recruitment Capability (Built)
- Hiring plans with budget & headcount tracking
- AI-generated job descriptions with versioning + approval workflow
- Multi-channel job publishing (LinkedIn, Indeed, Naukri, custom)
- Public candidate apply portal
- Candidate database with import/search/filter
- **AI resume scoring** (nightly batch + on-demand) — Claude-powered
- Multi-stage interview pipeline (Screening → Technical → HR → Leadership → Cultural → Offer)
- Structured interview feedback with skill-level ratings
- AI-drafted selection / rejection emails
- Org analytics + hiring funnel insights
- Audit log + role-based access control
- Internal support portal with shadow/impersonate sessions

### 2.3 What's Greenfield
| Module | Status |
|---|---|
| Offer letter generation, e-sign, joining flow | **Not built** |
| Third-party background verification | **Not built** |
| Appraisal management (mid/yearly reviews) | **Not built** |
| Compensation & hike/bonus distribution | **Not built** |
| Mobile apps (employee + manager) | **Not built** |
| Payroll integration | **Not built** |

---

## 3. Feature Scope & Effort Estimate

Effort is measured in **person-weeks (PW)** assuming a senior IC. A junior would take ~1.6× longer.

### 3.1 Recruitment — Resume to Offer Letter (Closing the loop)

| Feature | Effort | Notes |
|---|---|---|
| Offer letter template designer (variables, branding) | 3 PW | Per-org templates, version history |
| Compensation builder (CTC breakup, ESOPs, joining bonus) | 4 PW | Tax slab logic, India-specific |
| Approval workflow (HR → Finance → Founder) | 2 PW | Reuse existing approval engine |
| E-signature integration (DocuSign / Digio / Leegality) | 3 PW | Vendor + webhook + status tracking |
| Candidate offer portal (accept/decline/negotiate) | 3 PW | Public-facing flow |
| Joining formalities checklist + document collection | 4 PW | Pre-onboarding |
| Auto-generation via AI (extend communication-drafter agent) | 1 PW | Reuse existing agent |
| **Subtotal** | **20 PW** | ~5 months solo, ~6–7 weeks with 4 devs |

### 3.2 Background Verification (BGV) Integration

| Feature | Effort | Notes |
|---|---|---|
| Vendor integration (AuthBridge / OnGrid / SpringVerify / IDfy) | 4 PW | API + webhook |
| Consent capture + DPDP-compliant storage | 2 PW | India data law compliance |
| Multi-check orchestration (PAN, Aadhaar, education, employment, address, criminal) | 4 PW | Parallel checks, retry logic |
| Document upload + OCR pre-validation | 3 PW | Reuse PyMuPDF |
| BGV status dashboard (HR view + candidate view) | 3 PW | |
| Discrepancy resolution workflow | 3 PW | Manual review + re-run |
| Compliance report export (PDF) | 2 PW | |
| Cost tracking per check | 1 PW | Each check is paid per use |
| **Subtotal** | **22 PW** | ~5–6 months solo, ~7 weeks with 3 devs |

### 3.3 Appraisal Management

| Feature | Effort | Notes |
|---|---|---|
| Goal / KRA / OKR setting (employee + manager) | 4 PW | Quarterly cycles |
| Self-assessment forms (configurable per role) | 3 PW | |
| Manager review + rating (mid-year, yearly) | 3 PW | |
| 360-degree peer feedback | 4 PW | Anonymous option, peer nomination |
| Rating calibration meeting (skip-level, HR moderation) | 4 PW | Most political/hardest UX |
| Rating distribution analytics (bell curve, normalisation) | 3 PW | Force-fit prevention |
| Continuous feedback (1-on-1 notes, kudos) | 3 PW | |
| Appraisal cycle configuration (admin) | 2 PW | Cycle dates, eligibility, weights |
| Notification + reminder engine | 2 PW | Reuse existing notifications |
| AI-powered review summarisation | 2 PW | New AI agent — feedback consolidator |
| Mobile-responsive flows (most employees use phones) | 4 PW | |
| **Subtotal** | **34 PW** | ~8 months solo, ~9 weeks with 5 devs |

### 3.4 Compensation — Hike & Bonus Distribution

| Feature | Effort | Notes |
|---|---|---|
| Appraisal budget configuration (org → dept → team) | 3 PW | Total ₹ pool, % cap |
| Rating-to-hike matrix (configurable, e.g. 5★ = 15%, 3★ = 6%) | 2 PW | |
| Auto-allocation algorithm (constraint-aware) | 5 PW | **Hardest item** — must respect budget, band, tenure, market correction |
| Manager override + justification capture | 3 PW | Audit trail |
| Multi-level approval (Manager → Director → CHRO → CEO) | 3 PW | Reuse approval engine |
| What-if simulator (drag-drop budget redistribution) | 5 PW | Real-time recompute, high UX value |
| Bonus pool distribution (separate from hike) | 3 PW | Performance + retention bonus |
| Compensation letter generation | 2 PW | Reuse offer letter engine |
| Variance reports (planned vs actual, equity analysis) | 3 PW | Diversity / pay-gap insights |
| Payroll export (Excel, ZingHR / Darwinbox / Keka format) | 2 PW | |
| Historic compensation tracking | 2 PW | |
| **Subtotal** | **33 PW** | ~8 months solo, ~9 weeks with 4 devs |

### 3.5 Cross-cutting Work

| Item | Effort | Notes |
|---|---|---|
| Multi-tenancy hardening (org-level isolation testing) | 4 PW | |
| RBAC expansion (granular permissions for HR/Manager/Employee) | 3 PW | |
| Mobile apps — Employee + Manager (React Native) | 24 PW | Or hybrid PWA: 8 PW |
| Notification expansion (email, SMS, WhatsApp Business API) | 4 PW | |
| Reporting & BI (custom report builder) | 6 PW | |
| Data import/export (existing HRMS migration tooling) | 4 PW | |
| Security audit + penetration testing (external) | 4 PW | Vendor-driven |
| SOC 2 Type 1 readiness | 6 PW | Compliance prep |
| Performance & load testing (10K-employee tenants) | 3 PW | |
| Documentation, in-app help, video walkthroughs | 4 PW | |
| **Subtotal (PWA mobile)** | **46 PW** | |
| **Subtotal (Native mobile)** | **62 PW** | |

### 3.6 Total Remaining Effort

| Approach | Total Person-Weeks | Calendar with 6-person team |
|---|---|---|
| **MVP (PWA, defer SOC 2)** | **155 PW** | **6.5 months** |
| **Full (native mobile + SOC 2)** | **171 PW** | **7 months** |
| **With 20% slippage buffer** | **186–205 PW** | **8–9 months** |

> Real-world calendar including hiring, onboarding, holidays, and unknown unknowns: **plan for 14–16 months total** to a stable v1.0 of the full HRMS.

---

## 4. Team & People Cost

### 4.1 Recommended Team

| Role | Count | Monthly Cost (India, mid-senior) |
|---|---|---|
| Engineering Manager / Tech Lead | 1 | ₹3.0 – 4.5 lakh |
| Senior Backend Engineer (NestJS / Prisma) | 2 | ₹2.0 – 3.5 lakh each |
| Senior Frontend Engineer (Next.js / React) | 2 | ₹2.0 – 3.5 lakh each |
| AI / ML Engineer (Claude, agents, RAG) | 1 | ₹2.5 – 4.5 lakh |
| Product Designer (UX/UI, Nova system) | 1 | ₹1.8 – 3.0 lakh |
| Product Manager | 1 | ₹2.5 – 4.0 lakh |
| QA / SDET | 1 | ₹1.5 – 2.5 lakh |
| DevOps / SRE (part-time, 0.5 FTE) | 0.5 | ₹1.5 – 2.5 lakh |
| **Total monthly** | **9.5 FTE** | **₹19 – 31 lakh** |

### 4.2 Build-Out Cost (14 months)

| Scenario | Monthly Burn | 14-month Build Cost |
|---|---|---|
| **Lean (mid-level salaries)** | ₹19 lakh | **₹2.66 Cr** (~$320K) |
| **Balanced** | ₹25 lakh | **₹3.50 Cr** (~$420K) |
| **Premium (senior, ex-FAANG/unicorn)** | ₹31 lakh | **₹4.34 Cr** (~$520K) |

> **Important:** ~7–8 months of work is *already done*. Building the **remaining scope only** (BGV + offer letters + appraisal + compensation + hardening) with a 6-person sub-team is **~₹1.4 – 1.9 Cr** over 8 months.

---

## 5. Infrastructure & Deployment Cost

### 5.1 Cloud (AWS) — Per Tenant Tier

Assumes 100-employee tenant. Costs scale roughly linearly until ~5,000 employees.

| Service | Spec | Monthly (USD) | Monthly (₹) |
|---|---|---|---|
| ECS Fargate / EKS — Backend | 2 vCPU, 4 GB × 2 instances | $80 | ₹6,640 |
| ECS Fargate — AI Service | 2 vCPU, 4 GB × 2 instances | $80 | ₹6,640 |
| ECS Fargate — Frontend + Admin | 1 vCPU, 2 GB × 2 instances | $40 | ₹3,320 |
| RDS PostgreSQL | db.t4g.medium Multi-AZ | $120 | ₹9,960 |
| ElastiCache Redis | cache.t4g.small | $35 | ₹2,905 |
| S3 (resumes, documents) | 100 GB + transfer | $10 | ₹830 |
| CloudFront CDN | 500 GB egress | $40 | ₹3,320 |
| Application Load Balancer | 1 ALB | $25 | ₹2,075 |
| CloudWatch + alerting | Logs + metrics | $30 | ₹2,490 |
| Secrets Manager + KMS | | $10 | ₹830 |
| Backups + snapshots | | $20 | ₹1,660 |
| **Subtotal** | | **~$490 / mo** | **~₹40,700 / mo** |

**Annual:** ~₹4.9 lakh (~$5.9K) per 100-employee tenant.

### 5.2 Multi-Tenant SaaS Mode (Shared Infra)

Running 50 small tenants on shared infra:

| Component | Monthly | Annual |
|---|---|---|
| 3-node EKS cluster | ₹50,000 | ₹6.0 lakh |
| RDS Multi-AZ (db.r6g.large) | ₹35,000 | ₹4.2 lakh |
| Redis cluster | ₹12,000 | ₹1.4 lakh |
| Storage + CDN + ALB | ₹25,000 | ₹3.0 lakh |
| Observability (Grafana Cloud / Datadog) | ₹20,000 | ₹2.4 lakh |
| **Total** | **₹1.42 lakh** | **₹17 lakh** |

### 5.3 One-Time Setup

| Item | Cost |
|---|---|
| Production setup, IaC (Terraform), CI/CD | ₹3 – 5 lakh (or 4 PW internal) |
| Domain + SSL + email infrastructure | ₹50K |
| Penetration test (external) | ₹2.5 – 4 lakh |
| Security baseline (WAF, GuardDuty, CSPM) | ₹1 lakh + ₹15K/mo |
| **Total one-time** | **₹7 – 10.5 lakh** |

---

## 6. Third-Party / Vendor Costs

### 6.1 Per-API / Usage-Based

| Vendor | Use | Pricing | Monthly Estimate |
|---|---|---|---|
| **Anthropic Claude API** | All AI agents | Sonnet ~$3 / 1M input, $15 / 1M output | ₹50K – ₹3 lakh (varies with usage) |
| **Auth0** | Authentication | $240 + per-MAU above 1K | ₹25K – ₹1.5 lakh |
| **AuthBridge / OnGrid / IDfy** | Background verification | ₹150 – ₹2,500 per check | Pass-through to customer |
| **Digio / Leegality** | E-signature | ₹15 – ₹50 per signature | ₹10K – ₹50K |
| **MSG91 / Twilio / Plivo** | SMS, WhatsApp Business | ₹0.20 / SMS, ₹0.65 / WhatsApp | ₹15K – ₹75K |
| **AWS SES / Postmark** | Transactional email | $0.10 per 1K emails | ₹5K – ₹25K |
| **Sentry / Datadog APM** | Error + perf monitoring | $26 – $80 per host | ₹20K – ₹1 lakh |
| **GitHub + GitHub Copilot Business** | Source control + AI dev tooling | $19 / dev / month | ₹10K – ₹15K |
| **Linear / Jira + Notion + Slack + Figma** | Productivity stack | $10 – $20 per seat | ₹15K – ₹30K |
| **Total recurring vendor cost** | | | **₹1.5 – 8 lakh / month** |

### 6.2 Compliance & Legal

| Item | Cost |
|---|---|
| SOC 2 Type 1 audit | ₹10 – 18 lakh (one-time) |
| SOC 2 Type 2 audit (Year 2) | ₹15 – 25 lakh |
| ISO 27001 (if needed) | ₹6 – 12 lakh |
| DPDP Act + GDPR compliance setup | ₹3 – 6 lakh |
| Contract / privacy policy / DPA legal | ₹2 – 4 lakh |
| **Year 1 compliance budget** | **₹20 – 40 lakh** |

---

## 7. Annual Cost Summary

### 7.1 Year 1 (Build + Launch)

| Category | Low | High |
|---|---|---|
| Engineering team (already running, 14 months) | ₹2.66 Cr | ₹4.34 Cr |
| Cloud infra (gradual ramp) | ₹4 lakh | ₹12 lakh |
| Vendor / API costs | ₹18 lakh | ₹60 lakh |
| Compliance + legal | ₹20 lakh | ₹40 lakh |
| Office, equipment, software licenses | ₹10 lakh | ₹20 lakh |
| Contingency (15%) | ₹46 lakh | ₹85 lakh |
| **Total Year 1** | **₹3.6 Cr** (~$435K) | **₹6.5 Cr** (~$785K) |

### 7.2 Year 2+ (Steady State, post-launch)

| Category | Low | High |
|---|---|---|
| Engineering + product team (8 FTE) | ₹2.0 Cr | ₹3.0 Cr |
| Cloud infra (50–200 tenants) | ₹25 lakh | ₹80 lakh |
| Vendor / API costs (revenue-scaling) | ₹40 lakh | ₹1.5 Cr |
| Customer success + support (3–5 FTE) | ₹35 lakh | ₹70 lakh |
| Compliance audits (recurring) | ₹15 lakh | ₹30 lakh |
| Marketing + sales (deferred — not included) | — | — |
| **Total Year 2 (engineering + ops only)** | **₹3.15 Cr** (~$380K) | **₹6.3 Cr** (~$760K) |

---

## 8. Risk-Adjusted Schedule

| Phase | Duration | Deliverable |
|---|---|---|
| Phase 1 | Months 1–3 | Offer letter + e-sign + joining flow → **first paying customer-ready** |
| Phase 2 | Months 4–6 | Background verification with 1 vendor + compliance |
| Phase 3 | Months 7–10 | Appraisal cycles (mid + yearly) + 360 feedback |
| Phase 4 | Months 11–13 | Compensation engine (hike + bonus distribution) |
| Phase 5 | Months 14–16 | Mobile app, BI/reports, SOC 2, scale hardening |

**Critical-path risks:**
1. Background verification vendor onboarding can take 6–8 weeks of paperwork
2. Appraisal cycles are highly customer-specific — expect 30% rework after first 3 customers
3. Compensation budget allocation is the single hardest UX problem in the product
4. AI cost control: nightly batch resume scoring at scale needs caching + tiered models

---

## 9. Total Cost of Ownership — 3 Year View

| Year | Build / Run | Range |
|---|---|---|
| Year 1 | Build heavy | ₹3.6 – 6.5 Cr |
| Year 2 | Steady ops | ₹3.2 – 6.3 Cr |
| Year 3 | Scale + new modules | ₹4.0 – 8.0 Cr |
| **3-year TCO (engineering + infra + vendor only)** | | **₹10.8 – 20.8 Cr** (~$1.3M – $2.5M) |

---

## 10. Why This is Cheaper Than Alternatives

| Approach | 3-Year Cost | Trade-off |
|---|---|---|
| **Build with QuestEdge path (above)** | ₹11 – 21 Cr | Full IP, AI-first, customisable |
| Buy Darwinbox / Keka / ZingHR | ₹15 – 50 lakh / year | No IP, integration limits, no AI moat |
| Build from absolute zero (no AI, classic stack) | ₹15 – 25 Cr | Slower, no AI advantage, similar team size |
| Outsource to large IT services firm | ₹20 – 40 Cr | Quality risk, no in-house product muscle |

The **AI agent foundation already built** (resume scoring, JD generation, feedback summarisation, candidate scoring) is the most defensible piece — it represents ~₹40–60 lakh of work that competitors will need to replicate.

---

## 11. Recommended Decisions for Leadership

1. **Lock the team at 6 engineers + 1 PM + 1 designer** for the next 14 months. Resist hiring before product-market fit.
2. **Phase the launch.** Ship offer letter + BGV in 6 months and start charging — this funds appraisal/compensation build.
3. **Defer SOC 2 Type 2** until 5+ enterprise pilots; do Type 1 in Month 10–12.
4. **Negotiate volume contracts** with Anthropic, Auth0, and BGV vendor before crossing 10 customers — single biggest cost lever.
5. **Build mobile as PWA first** (8 PW) — only invest in native React Native (24 PW) when employee usage data demands it.
6. **Treat the compensation module as the moat.** It's the hardest feature, the highest-value, and the one customers will pay a premium for.

---

## Appendix A — Codebase Stats (as of 2026-05-04)

| Service | Files | Approx LOC | Primary Language |
|---|---|---|---|
| Backend | 117 | ~14,000 | TypeScript (NestJS) |
| Frontend | 93 | ~8,500 | TypeScript (Next.js / React) |
| AI Service | 24 | ~2,200 | Python (FastAPI) |
| Support Admin | 56 | ~2,500 | TypeScript (Next.js) |
| **Total** | **290** | **~27,200** | |

## Appendix B — Existing AI Agents

| Agent | Purpose | Reusable for new modules? |
|---|---|---|
| JD Generator | Auto-write job descriptions | — |
| Resume Matcher | Score resume vs JD | — |
| Candidate Scorer | Weighted feedback synthesis | Reusable for appraisals |
| Feedback Summariser | Synthesise interview notes | Reusable for 360 reviews |
| Communication Drafter | Auto-draft emails | Reusable for offer letters, hike letters |
| Insights Agent | Org analytics | Reusable for compensation analytics |
| Resume Scorer | Batch nightly scoring | — |

## Appendix C — Glossary
- **PW** — Person-Week (one senior engineer working full-time for one week)
- **BGV** — Background Verification
- **CTC** — Cost to Company (total compensation in Indian context)
- **DPDP** — Digital Personal Data Protection Act, 2023 (India)
- **MAU** — Monthly Active User
- **PWA** — Progressive Web App
- **TCO** — Total Cost of Ownership
