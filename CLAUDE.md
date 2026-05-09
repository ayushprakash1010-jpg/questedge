# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 1. What this repo is

**Work Nucleus** is a multi-tenant AI-first HR platform. The hiring module is the first vertical shipped; appraisal, BGV (background verification), compensation, training, and reporting are also implemented or in flight. The same code base is being actively redesigned (`design-system-v2/`).

This is a **monorepo with four runtime services** plus design assets and planning docs. There is no top-level package manager (no root `package.json`); each service manages its own deps. Orchestration is via Docker Compose and a Makefile under `work-nucleus/`.

```
work-nucleus-ai/
├── CLAUDE.md                    ← (this file) high-level architecture
├── README.md                    ← intentionally minimal
├── design-system-v2/            ← canonical design tokens + UI mockups
│   ├── CLAUDE.md                ← 500-line Tailwind/component implementation guide
│   ├── tokens.css               ← source of truth for colors/spacing/radii/etc.
│   ├── preview/*.html           ← brand/colors/components/spacing/typography reference
│   └── ui-kit/*.html            ← pixel-target mockups (Dashboard, Hiring Plans,
│                                  Pipeline Kanban, Candidate Detail, Feedback Form,
│                                  JD Editor, Offer Letter, Appraisal, BGV Consent)
├── project-plan/                ← long-form planning docs
│   ├── mvp.md, plan.md, plan-v2.md
│   ├── redesign-plan.md         ← active frontend redesign roadmap
│   ├── auth-strategy.md         ← Auth0 setup steps (frontend + backend + Mgmt API)
│   └── branding.md
└── work-nucleus/                ← the runtime code lives here
    ├── Makefile                 ← top-level dev workflow (run from this directory)
    ├── backend/                 ← NestJS 10 API on :3000
    ├── frontend/                ← Next.js 14 customer app on :3001
    ├── support-admin/           ← Next.js 14 internal support app on :3002
    ├── ai-service/              ← FastAPI Anthropic SDK wrapper on :8000
    ├── infra/                   ← docker-compose, nginx, k6 load tests
    ├── docs/                    ← runbooks (incident-response.md), cost estimates
    └── shared/                  ← (empty placeholder)
```

---

## 2. Common commands

All `make` targets run from `work-nucleus/`.

```bash
# Boot the entire stack (postgres, redis, minio, backend, frontend,
# support-admin, ai-service, pgboss-dashboard)
make dev

# Just infrastructure (postgres + redis), so a service can run on the host
make infra

# Stop everything
make down

# Build all images
make build

# Prisma
make prisma-migrate         # cd backend && npx prisma migrate dev
make prisma-generate
make prisma-studio

# Tests / lint
make test-backend           # cd backend && npm test
make test-ai                # cd ai-service && python -m pytest
make lint                   # eslint --fix on backend, frontend, support-admin
```

**Per-service commands** (run inside the service directory):

| Service | Dev | Build | Test | Lint |
|---|---|---|---|---|
| `backend/` | `npm run start:dev` (watch) / `npm run start:debug` | `npm run build` | `npm test` (Jest), `npm run test:watch`, `npm run test:e2e`, `npm run test:cov` | `npm run lint` |
| `frontend/` | `npm run dev` (port 3001) | `npm run build` | — | `npm run lint` |
| `support-admin/` | `npm run dev` (port 3002) | `npm run build` | — | `npm run lint` |
| `ai-service/` | `uvicorn app.main:app --reload --port 8000` | (Docker) | `python -m pytest` | — |

**Single-test workflows:**

```bash
# Backend: run one Jest spec, optionally one test
cd backend && npx jest src/path/to/feature.spec.ts -t "creates a hiring plan"
# E2E (separate config): npm run test:e2e -- -t "auth flow"

# AI service: run one pytest file/test
cd ai-service && python -m pytest tests/test_jd_agent.py::test_generate -v
```

**Service URLs in dev:**

| URL | What |
|---|---|
| http://localhost:3000 | Backend API |
| http://localhost:3000/api/docs | Swagger UI |
| http://localhost:3001 | Customer frontend (Next.js) |
| http://localhost:3002 | Support admin (Next.js) |
| http://localhost:3003 | pg-boss job dashboard (admin/admin) |
| http://localhost:8000 | AI service (FastAPI) |
| http://localhost:9001 | MinIO console (minioadmin/minioadmin) |

**Mock-data UI workflow** — set `NEXT_PUBLIC_USE_MOCK_DATA=true` in `frontend/.env.local` (and/or `support-admin/.env.local`); the Next middleware short-circuits Auth0 and serves canned data from `src/lib/mock/`. No backend/db required for UI work.

---

## 3. Service mesh

```
                ┌───────────────────────┐
   browser  ──► │  frontend (3001)      │ ◄── (mock mode short-circuits here)
                │  Next.js 14 + App Rtr │
                │  Auth0 SDK v4         │
                └───────┬───────────────┘
                        │ Next API routes proxy
                        │ (/app/api/v2/[...path]/route.ts attaches bearer)
                        ▼
                ┌───────────────────────┐         INTERNAL_API_KEY
                │  backend (3000)       │ ───────────────────────────►  ai-service (8000)
                │  NestJS 10 + Prisma   │  X-Internal-API-Key header     FastAPI + Anthropic SDK
                │  Global JwtAuthGuard  │                                 (8 task-specific agents)
                └─┬───────┬───────────┬─┘
                  │       │           │
                  │       │           └──► Auth0 (JWKS, Mgmt API, webhook sync)
                  │       │
                  │       └──► Vendor integrations (Digio/Leegality, AuthBridge/OnGrid/IDfy, MSG91)
                  │
                  ▼
       ┌──────────────────────┐    ┌──────────────────┐    ┌──────────────────┐
       │ postgres (5432)      │    │ redis (6379)     │    │ minio/S3 (9000)  │
       │  app schema + pgboss │    │  cache (planned) │    │  resumes, docs   │
       └──────────────────────┘    └──────────────────┘    └──────────────────┘

   support-admin (3002) → backend (3000)   (separate Auth0 connection, support roles only)
```

**Critical wiring rules:**

- **Browser never talks to backend directly.** The frontend exposes `/app/api/*` route handlers (and a catch-all `/app/api/v2/[...path]/route.ts`) that read the Auth0 session cookie, fetch a fresh access token via `auth0.getAccessToken()`, and forward to backend with `Authorization: Bearer <token>`. This keeps the Auth0 session cookie HttpOnly. `NEXT_PUBLIC_API_URL` is the browser-facing URL; `API_URL_INTERNAL` is the docker-network URL used server-side (`frontend/src/lib/api-url.ts`).
- **backend → ai-service is authenticated by `INTERNAL_API_KEY`** sent as `X-Internal-API-Key`. Every AI endpoint requires `Depends(verify_internal_api_key)`. Never expose ai-service to the browser, and never proxy it through the public frontend route.
- **AI outputs are advisory only** for high-stakes decisions (BGV recommendation, appraisal summary). The endpoints' docstrings call this out; don't add code paths that auto-action AI verdicts.
- **Object storage is MinIO in dev** (S3-compatible). Backend uses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` against `S3_ENDPOINT`. Bucket: `work-nucleus-resumes`.
- **CORS allowlist** in `backend/src/main.ts` is currently `localhost:3001` and `localhost:3002` only. Production origins must be added there explicitly.

---

## 4. Backend architecture (NestJS)

### 4.1 Module map

`backend/src/` is organized by concern, not by layer:

```
src/
├── main.ts                   ← bootstrap (raw-body capture, ValidationPipe, CORS, Swagger)
├── app.module.ts             ← imports every feature module + global guards
├── prisma/                   ← PrismaService (forNestJS DI, lifecycle hooks)
├── auth/                     ← Auth0 JWT validation, provisioning, user sync
│   ├── strategies/auth0-jwt.strategy.ts   ← JWKS verification, hydrates req.user from DB
│   ├── guards/{jwt-auth,roles}.guard.ts   ← APP_GUARD, applied globally
│   ├── decorators/{public,roles,current-user}.decorator.ts
│   ├── auth0-management.service.ts        ← create/block users via Auth0 Mgmt API
│   ├── auth.controller.ts                 ← /auth/provision, /auth/me, /auth/sync (webhook)
│   └── auth.service.ts
├── users/                    ← user CRUD inside the app (vs. Auth0 identity)
├── health/                   ← /health
├── common/
│   ├── interceptors/logging.interceptor.ts   ← method/URL/status/ms log line
│   └── filters/global-exception.filter.ts    ← maps Prisma error codes → HTTP
├── modules/                  ← ALL FEATURE MODULES live here
└── integrations/             ← third-party adapters (vendor SDKs, webhook handlers)
    ├── esign/                ← Digio + Leegality, behind IESignProvider
    ├── bgv/                  ← AuthBridge + OnGrid + IDfy, behind IBgvProvider
    └── msg91/                ← SMS / WhatsApp via MSG91
```

### 4.2 Feature modules (`backend/src/modules/`)

~40 modules, one per business concern. Each typically has `*.module.ts`, `*.controller.ts`, `*.service.ts`, and a `dto/` directory. Pattern:

```
modules/
├── hiring-plans/             ← role-based hiring plans, budget, headcount
├── job-descriptions/         ← versioned JDs with approval workflow
├── publishing/               ← job posting to LinkedIn/Indeed/Naukri
├── public-apply/             ← public candidate apply (no auth)
├── candidates/               ← candidate database, dedup by (orgId, email)
├── pipeline/                 ← interview stages, interviewer assignments
├── applications/             ← Candidate × HiringPlan join with stage tracking
├── feedback/                 ← structured interview feedback + skill ratings
├── decisions/                ← SELECTED/REJECTED + AI-drafted communications
├── offers/, offer-templates/ ← offer letter generation, e-sign flow
├── compensation/             ← per-offer comp package
├── joining/                  ← post-offer onboarding checklist
├── bgv/                      ← consent, vendor-routed checks, AI summary
├── appraisal-cycles/, goals/, assessments/, peer-feedback/, calibration/
├── comp-budget/, comp-revisions/, comp-allocator/  ← appraisal-driven comp engine
├── skills/                   ← global + industry-specific skill catalog
├── analytics/, reports/      ← funnel metrics, custom reports
├── notifications/, comms/    ← in-app + multi-channel (email/SMS/WA/push)
├── push/                     ← Web-Push subscriptions
├── search/                   ← global search across entities
├── audit/                    ← AuditLog writes for sensitive ops
├── security/                 ← @Global, security event chain (hash-linked log)
├── settings/                 ← per-org JSON blob
├── support/                  ← support tickets, escalations, shadow sessions
├── training/                 ← interviewer training modules + completions
├── file-upload/              ← S3 upload helper (presigned URLs)
├── job-queue/                ← pg-boss wrapper + workers (resume-scoring.worker.ts)
├── cache/                    ← @Global HotCacheService (in-memory now, Redis-ready)
└── ai-cost/                  ← AI call cost tracking dashboard
```

**New features go in a new module** under `modules/`; don't extend `auth/`, `common/`, or an unrelated module. Third-party integrations go in `integrations/` (each behind an interface so the provider can be swapped).

### 4.3 Bootstrap details (`backend/src/main.ts`)

This file has non-obvious behavior — read it before changing it.

- `bodyParser: false` then explicit `express.json({ limit: '5mb', verify: (req, _res, buf) => { req.rawBody = buf; } })`. The `rawBody` capture is **required for webhook HMAC verification** (Auth0 sync, Digio/Leegality e-sign, BGV vendors, MSG91). If you change to the default body parser you will silently break every webhook signature.
- `ValidationPipe` runs globally with `whitelist: true, transform: true, forbidNonWhitelisted: true`. Every DTO MUST be a class-validator class — plain objects will be stripped.
- `GlobalExceptionFilter` maps Prisma error codes (`P2002` → 409, `P2025` → 404, `P2003` → 400) to consistent error envelopes `{ error: { code, message, details? }, statusCode }`.
- `LoggingInterceptor` writes `<METHOD> <URL> <status> - <ms>ms` for every request.
- Swagger UI is mounted at `/api/docs` with bearer auth.

### 4.4 Auth model

The auth pipeline is:

1. Frontend redirects to **Auth0 Universal Login** (`/auth/login` route owned by Auth0 SDK v4).
2. After callback, the frontend has a session cookie + can mint access tokens with audience `AUTH0_AUDIENCE`.
3. Frontend server-side proxies attach the access token as a bearer to every backend call.
4. Backend `Auth0JwtStrategy` (`backend/src/auth/strategies/auth0-jwt.strategy.ts`) validates the JWT against Auth0's JWKS (RS256, issuer `https://${AUTH0_DOMAIN}/`, audience `AUTH0_AUDIENCE`), then **hydrates `req.user` from the local `User` table** keyed by `auth0Sub`. Custom claims at namespace `https://api.work-nucleus.com/{email,name}` are read for not-yet-provisioned users.
5. `JwtAuthGuard` and `RolesGuard` are registered as `APP_GUARD`s in `app.module.ts` — **every endpoint is protected by default**.

To opt out or restrict:

- `@Public()` — skip auth (e.g. `/auth/sync` webhook, public apply pages).
- `@Roles(Role.ADMIN, Role.HR, ...)` — restrict by role. Roles enum is defined in `prisma/schema.prisma` (`ADMIN | HR | HIRING_MANAGER | INTERVIEWER | VIEWER | SUPPORT_REP | SUPPORT_ADMIN`).
- `@CurrentUser()` parameter decorator — gives you the hydrated user (`{ id, orgId, email, name, role, organization, isProvisioned }`).

**First-login provisioning:** a brand-new Auth0 user has no local row. `/api/v1/auth/me` returns `{ isProvisioned: false }`. Frontend redirects to `/onboarding`, which calls `/api/v1/auth/provision` to create an `Organization` + admin `User` in one transaction. Subsequent calls hydrate from DB.

**Auth0 → backend profile sync:** Auth0 Login Action calls `POST /api/v1/auth/sync` with `X-Auth0-Webhook-Secret` matching `AUTH0_SYNC_SECRET` to keep email/name/avatar in sync. This is `@Public()` because it's the secret, not a JWT, that authenticates.

### 4.5 Background jobs (pg-boss)

Jobs run **inside Postgres** (schema `pgboss`). The wrapper is `modules/job-queue/job-queue.service.ts`:

```ts
await jobQueue.ensureQueue('my-queue');                   // idempotent
await jobQueue.scheduleCron('my-queue', '0 2 * * *');     // cron entry
await jobQueue.enqueue('my-queue', { ...data });
await jobQueue.registerWorker<MyData>('my-queue', async (jobs) => {
  for (const job of jobs) { ... }
}, { localConcurrency: 3 });
```

Reference implementation: `modules/job-queue/resume-scoring.worker.ts` — a nightly cron (`0 2 * * *`) finds applications with no `aiMatchScore`, fans them out to per-application jobs, each of which fetches the resume from S3, calls ai-service `/ai/extract-resume-text` then `/ai/match-resume`, and writes the score back to `CandidateApplication`.

Workers are registered via `OnModuleInit` so they boot with the app. The pg-boss admin dashboard is exposed at `:3003` in dev.

### 4.6 Caching

`modules/cache/cache.service.ts` exposes a `HotCacheService` with `get`/`set`/`del`/`wrap` and a default 5-minute TTL. It's an in-memory `Map` today (max 5000 entries, FIFO eviction); a Redis-backed swap is planned (`cache-manager-redis-store` is already in `package.json`). The module is `@Global` so any module can inject it.

### 4.7 Error envelope

All HTTP errors follow:

```json
{ "error": { "code": "DUPLICATE_ENTRY", "message": "...", "details": { ... } }, "statusCode": 409 }
```

Codes: `BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | TOO_MANY_REQUESTS | DUPLICATE_ENTRY | NOT_FOUND | FOREIGN_KEY_ERROR | DATABASE_ERROR | VALIDATION_ERROR | INTERNAL_ERROR`. Throw `HttpException` subclasses (`BadRequestException`, `ConflictException`, etc.) and let the filter format them.

### 4.8 Vendor integration pattern

Each integration module exposes a single interface and N implementations. Routing between vendors is done by a small "router" service. Examples:

- `integrations/bgv/bgv-provider.interface.ts` defines `IBgvProvider` (`initiateProfile`, `submitCheck`, `getCheckStatus`, `downloadReport`, `verifyWebhook`, `parseWebhookEvent`); implementations are `authbridge.client.ts`, `ongrid.client.ts`, `idfy.client.ts`. `BgvVendorRouter` picks based on `BgvProfile.vendor`.
- `integrations/esign/esign-provider.interface.ts` defines `IESignProvider`; implementations are `digio.client.ts`, `leegality.client.ts`.

Both are `@Global` modules so any feature module can inject them. **All `verifyWebhook` implementations rely on `req.rawBody`** — see §4.3.

---

## 5. Domain model (Prisma)

`backend/prisma/schema.prisma` is ~1600 lines and ~50 models. **Treat it as the single source of truth** — all enums and shapes live here. Frontend types should mirror, not redefine.

### 5.1 Tenancy

Almost every model has `orgId String @db.Uuid` referencing `Organization`. **Every query must filter by `orgId`** (this is the multi-tenant boundary). The backend enforces this by reading `user.orgId` from `@CurrentUser()` and passing it to every service call. Don't accept `orgId` from request bodies.

### 5.2 Domain phases (per the schema's `// ── ... Phase N ──` headers)

| Phase | Domain | Key models |
|---|---|---|
| Core | Identity / RBAC | `Organization`, `User`, `OrgSettings` |
| Hiring | Plan → JD → Pipeline → Application → Decision | `HiringPlan`, `Skill`, `HiringPlanSkill`, `JobDescription`, `PipelineStage`, `PipelineStageInterviewer`, `Candidate`, `CandidateApplication`, `CandidateStageHistory`, `InterviewFeedback`, `FeedbackSkillRating`, `SelectionDecision` |
| Publishing | Channels + public apply | `JobPublishing` (LinkedIn/Indeed/Naukri/CUSTOM, with `publicSlug`) |
| Phase 1 | Offer + e-sign + joining | `OfferTemplate`, `Offer`, `OfferDocVersion`, `Compensation`, `ESignRequest`, `JoiningChecklist`, `CandidateJoining` |
| Phase 2 | Background verification | `BgvProfile`, `BgvCheck` (PAN/AADHAAR/EDUCATION/EMPLOYMENT/etc., per-vendor) |
| Phase 3 | Appraisal | `AppraisalCycle`, `OrgGoal`, `Goal`, `AppraisalAssessment`, `PeerFeedbackRequest`, `CalibrationSession` |
| Phase 4 | Compensation engine | `AppraisalBudget`, `CompensationRevision`, `CompensationSnapshot` |
| Phase 5 | Hardening | `ReportDefinition`, `UserNotificationPref`, `NotificationLog`, `PushSubscription`, `SecurityLog` (hash-chained), `AiCallLog` (per-call cost), `DashboardInsight` |
| Cross-cut | Audit / support / training | `AuditLog`, `Notification`, `TrainingModule`, `TrainingCompletion`, `OrgHealthMetric`, `SupportTicket`, `SupportNote`, `SupportEscalation`, `SupportSession` |

### 5.3 Important integrity invariants

- `Candidate (orgId, email)` is unique — dedup applicants per org.
- `CandidateApplication (candidateId, hiringPlanId)` is unique — one application per plan per candidate.
- `InterviewFeedback (applicationId, stageId, interviewerId)` is unique — one feedback per interviewer per stage.
- `AppraisalAssessment (cycleId, employeeId, type)` is unique.
- `PeerFeedbackRequest (cycleId, subjectUserId, reviewerUserId)` is unique.
- `CompensationRevision (cycleId, employeeId)` is unique.
- `Offer.compensationId` is `@unique` — comp is one-to-one with offer.
- Cascading deletes on parent rows (e.g. delete a `HiringPlan` and its skills/JDs/stages/applications cascade).

### 5.4 Seed data

`backend/prisma/seed.ts` (run via `npm run prisma db seed` per `package.json` `prisma.seed`) installs a global skill catalog (~hundreds of skills across TECHNICAL/LEADERSHIP/BEHAVIOURAL/COMMUNICATION/DOMAIN, segmented by industry). `seed.sql` is the same data as raw SQL for direct DB import.

---

## 6. Frontend architecture (Next.js 14 App Router)

### 6.1 Route structure

```
frontend/src/app/
├── layout.tsx                       ← root: Inter font + Auth0Provider + Toaster
├── globals.css                      ← v2 token CSS (target: matches design-system-v2/tokens.css)
├── (public)/                        ← unauthenticated routes
│   ├── layout.tsx                   ← public chrome
│   ├── page.tsx                     ← landing
│   ├── jobs/                        ← public jobs board (?slug=...)
│   ├── bgv/                         ← candidate consent flow (token-based)
│   ├── offer/                       ← candidate offer view (token-based)
│   ├── joining/                     ← candidate joining checklist
│   ├── peer-feedback/               ← anonymous peer feedback (token-based)
│   ├── contact/, privacy-policy/, terms-of-service/, gdpr/, cookie-policy/
├── (protected)/                     ← authenticated app shell
│   ├── layout.tsx                   ← Sidebar + TopBar; redirects unauth to /auth/login,
│   │                                  unprovisioned to /onboarding
│   ├── dashboard/, hiring-plans/, candidates/, offers/, bgv/,
│   ├── appraisal/, compensation/, training/,
│   └── admin/{users,settings,reports,audit-log,ai-cost,appraisal,compensation}
├── onboarding/                      ← first-run org/admin provisioning form
└── api/                             ← Next route handlers (server-side proxies)
    ├── auth/                        ← Auth0 SDK v4 owns these routes
    ├── v2/[...path]/route.ts        ← catch-all proxy: attaches Auth0 bearer, forwards to backend
    └── {profile,candidates,hiring-plans,...}/route.ts  ← per-resource proxies
```

### 6.2 Middleware (`frontend/src/middleware.ts`)

Two modes:

1. **Mock mode** (`NEXT_PUBLIC_USE_MOCK_DATA=true`) — intercepts every `/api/*` (except `/api/auth/*`), runs the request through `lib/mock/router.ts`, returns canned data from `lib/mock/data.ts`. Auth0 routes are bypassed; `/`, `/auth/login`, `/auth/callback` redirect to `/dashboard`. Use this for pure UI work without booting the backend stack.
2. **Normal mode** — Auth0 SDK middleware handles `/auth/*`, redirects authenticated users away from `/` to `/dashboard`, and otherwise lets pages render. The `/api/*` proxies handle their own auth.

Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `sitemap.xml`, `robots.txt`.

### 6.3 API call pattern

- **Server-side (RSC, route handlers):** import `auth0` from `@/lib/auth0`, call `auth0.getSession()` + `auth0.getAccessToken()`, then `fetch(API_URL_INTERNAL + path)` with `Authorization: Bearer <token>`. The catch-all `/api/v2/[...path]/route.ts` is the canonical example — copy its pattern when adding a new resource proxy.
- **Client-side:** call your `/api/...` Next route, never the backend directly. The thin client helper is `frontend/src/lib/api.ts` (`apiClient<T>(path, { token, ...init })`).
- React Query (`@tanstack/react-query`) is the recommended cache layer for client components. Zustand (`zustand`) is available for client-side global state.

### 6.4 Components

```
src/components/
├── sidebar.tsx                ← 240px fixed; nav items role-gated; Lucide icons
├── top-bar.tsx                ← 64px; <GlobalSearch/> + <NotificationBell/> + user menu
├── global-search.tsx
├── notification-bell.tsx
├── ui/                        ← local shadcn-style primitives
│   ├── button, badge, card, input, label, select, textarea
│   ├── tabs, progress, slider, dropdown-menu, avatar
│   ├── alert, empty-state, skeleton, spinner, toaster
│   └── README.md
├── shared/                    ← cross-page composites
│   ├── kpi-card, ai-insight-card, candidate-card, page-header, data-table
│   └── README.md
├── hiring-plans/              ← module-specific (kanban-board, jd-tab, feedback-form,
│                                pipeline-setup, plan-detail-panel, candidate-sheet,
│                                decision-modal, hiring-plan-form)
└── landing/                   ← marketing components
```

**All visual decisions must follow `design-system-v2/CLAUDE.md`** — it specifies exact Tailwind classes, variants, and patterns. Highlights:

- **Font:** Inter only (loaded via `next/font/google` in `app/layout.tsx`).
- **Primary color:** indigo-600 (`#4f46e5`). Brand gradient: `from-indigo-500 to-cyan-500`. AI surfaces: `from-purple-600 to-indigo-600` with a glowing shadow.
- **Radii:** `rounded-xl` cards / `rounded-lg` buttons & inputs / `rounded-full` badges & avatars.
- **Icons:** `lucide-react` only. Sizes: 16px in-button, 18px nav, 20px feature, 24-28px hero.
- **Animations:** Framer Motion. Always pass `viewport={{ once: true }}` on scroll animations.
- **Charts:** Recharts; chart palette is fixed in `design-system-v2/CLAUDE.md` §10.

A frontend redesign is in progress to consolidate all UI on these v2 tokens — see `project-plan/redesign-plan.md` and the recent `redesign/pr-*` commits. Don't reintroduce the old Nova design system.

### 6.5 PWA

`app/layout.tsx` declares the manifest and theme color. The protected layout calls `registerServiceWorker()` (`lib/pwa.ts`). `PushSubscription` is persisted server-side via `modules/push/`.

---

## 7. Support admin (`work-nucleus/support-admin/`)

Smaller standalone Next.js 14 app for **internal staff** (Support Reps, Support Admins). It reuses backend APIs via the same proxy pattern but **uses a different Auth0 connection** (`AUTH0_SUPPORT_CONNECTION` / `AUTH0_SUPPORT_CLIENT_ID`) so support users are kept in a separate identity store from customer users. Roles `SUPPORT_REP` and `SUPPORT_ADMIN` in the Prisma `Role` enum unlock these routes.

Pages: `(protected)/{organizations,tickets,metrics,tools}`. The notable ops surface is `support-admin → backend modules/support` for ticket management, escalations, and `SupportSession` (shadow / impersonate, fully audited). A "back to main app" link uses `NEXT_PUBLIC_MAIN_APP_URL`.

---

## 8. AI service (`work-nucleus/ai-service/`)

```
ai-service/app/
├── main.py                    ← FastAPI app; one HTTP endpoint per agent under /ai/*
├── config.py                  ← pydantic-settings (ANTHROPIC_API_KEY, CLAUDE_MODEL,
│                                INTERNAL_API_KEY, DATABASE_URL, PORT)
├── middleware/api_key_auth.py ← X-Internal-API-Key header check
├── agents/                    ← one Claude wrapper per task
│   ├── base_agent.py          ← retry (tenacity), Claude call, AIAgentLog persistence
│   ├── jd_generator.py
│   ├── feedback_summarizer.py
│   ├── candidate_scorer.py
│   ├── communication_drafter.py
│   ├── insights_agent.py
│   ├── resume_matcher.py
│   ├── bgv_summariser.py
│   └── appraisal_agent.py
├── prompts/*.j2               ← Jinja2 templates for each agent's system prompt
├── schemas/*.py               ← pydantic request/response models
├── services/
│   ├── db.py                  ← async SQLAlchemy (postgresql+asyncpg://)
│   └── resume_parser.py       ← PDF/DOCX text extraction (pymupdf, python-docx)
└── models/agent_log.py        ← SQLAlchemy AIAgentLog (mirror of backend AiCallLog purpose)
```

### 8.1 Adding an agent

1. Pydantic request/response in `schemas/<feature>.py`.
2. Jinja2 system prompt in `prompts/<feature>.j2`.
3. Agent class in `agents/<feature>.py` extending `BaseAgent`; call `await self.call_claude(system_prompt, user_prompt, max_tokens=..., temperature=...)`.
4. Endpoint in `main.py`:
   ```python
   @app.post("/ai/<feature>", response_model=FeatureResponse)
   async def feature(request: FeatureRequest, _api_key: str = Depends(verify_internal_api_key)):
       ...
   ```
5. Backend service calls it via `fetch(${AI_SERVICE_URL}/ai/<feature>, { headers: { 'X-Internal-API-Key': ... } })`.

### 8.2 Reliability

`BaseAgent.call_claude` uses `tenacity` with `stop_after_attempt(3)` + exponential backoff, retrying only `APIConnectionError` and `RateLimitError`. Timeout is 30 s. Every call is logged to `ai_agent_logs` (latency, tokens, status, error message) regardless of outcome — this is what the backend `ai-cost` dashboard reads from.

### 8.3 Default model

`CLAUDE_MODEL` defaults to `claude-sonnet-4-20250514`. Override per environment via env var. Don't hard-code model IDs in agent code.

---

## 9. Infrastructure & deployment

`work-nucleus/infra/` contains:

- **`docker-compose.yml`** — dev. All eight services on a single network, MinIO console at 9001, pg-boss dashboard at 3003. Ports are exposed to host so each service is reachable directly.
- **`docker-compose.prod.yml`** — production-shaped. Postgres credentials from env, Redis with AOF persistence, services on a single `app` network. Used as the deployment template (e.g. on a VM).
- **`nginx/`** — reverse proxy config for prod.
- **`k6/scenarios.js`** — k6 load tests for the high-fan-out scenarios called out in `plan-v2.md`: 1000 concurrent self-assessments, 500 concurrent calibration users, 5000 employees opening compensation letters in 5 min, 200 concurrent BGV webhook arrivals. Run with `BASE=http://localhost:3000 TOKEN=... k6 run scenarios.js --env SCENARIO=self_assessment`.

**Environment files** are gitignored. Each service ships a `.env.example`. Key variables per service:

- **backend** — `DATABASE_URL`, `REDIS_HOST/PORT`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_MANAGEMENT_CLIENT_ID/SECRET`, `AUTH0_SYNC_SECRET`, `AI_SERVICE_URL`, `INTERNAL_API_KEY`, `S3_*`, `FRONTEND_URL`.
- **frontend** — `AUTH0_SECRET`, `AUTH0_DOMAIN/CLIENT_ID/CLIENT_SECRET/AUDIENCE`, `APP_BASE_URL`, `NEXT_PUBLIC_API_URL`, `API_URL_INTERNAL`, `NEXT_PUBLIC_USE_MOCK_DATA?`.
- **support-admin** — same as frontend but `AUTH0_SUPPORT_CLIENT_ID/SECRET/CONNECTION` and `NEXT_PUBLIC_MAIN_APP_URL`.
- **ai-service** — `ANTHROPIC_API_KEY`, `DATABASE_URL` (asyncpg URL), `INTERNAL_API_KEY`, `PORT`, optionally `CLAUDE_MODEL`.

**Runbook:** `work-nucleus/docs/runbooks/incident-response.md` defines SEV-1/2/3, the IC/Comms/SME roles, and the standard 15-minute response loop. Key health endpoints: `GET /health` (backend), `GET /api/v2/security/verify-chain` (validates the hash-chained `SecurityLog`), `GET /ai/health` (ai-service).

---

## 10. Conventions & gotchas (read these before editing)

1. **Prisma schema is the source of truth.** Don't define duplicate enums in TypeScript or Python — import from `@prisma/client`, mirror in `ai-service/app/schemas/`. Don't re-shape models in frontend types beyond Zod-style narrowing.
2. **`orgId` is the tenant boundary.** Every backend service method takes `orgId` as the first argument and filters with it. Never trust an `orgId` from a request body.
3. **Don't change the body parser in `main.ts`** without auditing every webhook — `req.rawBody` is required for HMAC verification.
4. **Adding a service or process means updating both `infra/docker-compose.yml` and the `Makefile`.** The `make dev` story is "one command boots everything."
5. **Backend module layout is strict:** controllers thin, business logic in services, all DB access via `PrismaService`. Add new domain logic as a new module in `modules/`, integrations behind an interface in `integrations/`.
6. **Frontend `(protected)` vs `(public)` route groups matter** — anything under `(protected)` assumes the Auth0 session and the Sidebar/TopBar shell from `app/(protected)/layout.tsx`. Public candidate flows (offer view, BGV consent, peer feedback) live under `(public)/` and are gated by single-use tokens (`Offer.candidateToken`, `BgvProfile.consentToken`, `PeerFeedbackRequest.reviewerToken`, `CandidateJoining.candidateToken`).
7. **AI calls must be cost-tracked.** Every Claude call in `ai-service/` is logged via `BaseAgent`; the backend `ai-cost` module exposes the dashboard. Don't add agent calls outside `BaseAgent.call_claude`.
8. **AI verdicts are advisory only** in BGV (`PROCEED|CAUTION|BLOCK`) and appraisal — a human reviewer must approve. Don't add code paths that bypass that review.
9. **Sensitive actions write to `AuditLog` and/or `SecurityLog`.** `SecurityLog` is hash-chained (`prevHash` + `hash`) so chain validation can detect tampering — preserve that property when writing new entries (chain forward, don't insert into the middle).
10. **Backend roles enum** — `ADMIN | HR | HIRING_MANAGER | INTERVIEWER | VIEWER | SUPPORT_REP | SUPPORT_ADMIN`. Apply `@Roles(...)` at the controller class level when an entire resource is role-gated; per-method otherwise. The `IS_PUBLIC_KEY` decorator overrides both guards.
11. **Lint scripts use `--fix` (backend) and `next lint` (frontend/admin).** Run `make lint` before opening a PR for cross-service changes.
12. **Default to no comments and no new docs files.** Tasks should produce code changes; planning/architecture lives in this file and `project-plan/`.
13. **Don't reintroduce the old Nova design system.** It's been removed; all UI work targets `design-system-v2/`.
