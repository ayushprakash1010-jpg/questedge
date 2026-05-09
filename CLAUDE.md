# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo is a **multi-service HR platform monorepo**, not a single app. Top-level directories:

- `work-nucleus/` — runtime services (this is where almost all code lives).
  - `backend/` — NestJS 10 API (port 3000). Prisma + Postgres + Redis + pg-boss + Auth0 JWT.
  - `frontend/` — Next.js 14 App Router customer app (port 3001). React 19 + Tailwind v4 + Auth0 SDK v4 + React Query + Zustand.
  - `support-admin/` — separate Next.js 14 app for internal support staff (port 3002). Different Auth0 connection from `frontend/`.
  - `ai-service/` — FastAPI Python service (port 8000). Wraps Anthropic Claude SDK; called only from `backend/` over an internal API key.
  - `infra/` — `docker-compose.yml`, `nginx/`, `k6/`. Single source of truth for service wiring and env vars in dev.
  - `Makefile` — top-level dev workflow (run from `work-nucleus/`).
  - `docs/runbooks/` — incident response notes.
- `design-system-v2/` — canonical design tokens + UI mockups (HTML).
  - `tokens.css` is the source of truth for color/spacing/radius/shadow/motion tokens.
  - `CLAUDE.md` here is a **500-line implementation guide for the frontend**: when doing any UI work in `work-nucleus/frontend/`, read `design-system-v2/CLAUDE.md` first — it specifies exact Tailwind classes, component variants, and patterns the redesign is targeting.
  - `ui-kit/*.html` are pixel-target mockups for each module.
- `project-plan/` — long-form planning docs (`mvp.md`, `plan-v2.md`, `redesign-plan.md`, `branding.md`, `auth-strategy.md`). Useful context, not authoritative for code.

## Common commands

All `make` commands run from `work-nucleus/`.

```bash
# Start everything (postgres, redis, minio, backend, frontend, support-admin, ai-service, pgboss-dashboard)
make dev

# Just infra (postgres + redis), so you can run a service locally on the host
make infra

# Stop the stack
make down

# Prisma
make prisma-migrate         # cd backend && npx prisma migrate dev
make prisma-studio          # cd backend && npx prisma studio
make prisma-generate

# Tests / lint
make test-backend           # cd backend && npm test
make test-ai                # cd ai-service && python -m pytest
make lint                   # lints backend + frontend + support-admin
```

Per-service scripts (run inside the service directory):

- `backend/`: `npm run start:dev` (watch), `npm run start:debug`, `npm run build`, `npm run test`, `npm run test:watch`, `npm run test:e2e` (config at `test/jest-e2e.json`), `npm run test:cov`, `npm run lint`. Run a single Jest test: `npx jest path/to/file.spec.ts -t "test name"`.
- `frontend/` and `support-admin/`: `npm run dev`, `npm run build`, `npm run lint`. Frontend is hard-coded to port 3001, support-admin to 3002.
- `ai-service/`: `uvicorn app.main:app --reload --port 8000`. Tests via `python -m pytest`.

## Architecture

### Service mesh

```
frontend (3001) ─┐
                 ├─► backend (3000) ──► ai-service (8000)
support-admin (3002) ┘                       │
                                             ▼
                                       postgres + redis + minio
```

- **Browser → backend goes through Next.js API routes,** not directly: `frontend/src/middleware.ts` and per-route handlers in `frontend/src/app/api/*` proxy to the NestJS backend so Auth0 session cookies stay HttpOnly. `NEXT_PUBLIC_API_URL` is for client-direct calls; `API_URL_INTERNAL` is the docker-network URL used by Next server-side code.
- **backend → ai-service is authenticated by `INTERNAL_API_KEY`,** a shared secret in env. Every AI endpoint requires `Depends(verify_internal_api_key)`. Never expose ai-service to the browser.
- **Object storage is MinIO in dev** (S3-compatible at `:9000`, console at `:9001`). Backend uses `@aws-sdk/client-s3` against `S3_ENDPOINT`. Bucket `work-nucleus-resumes`.
- **pg-boss runs jobs inside Postgres** (schema `pgboss`). Dashboard at `:3003` (admin/admin in dev). The resume-scoring worker is the canonical reference for how a worker is registered: `backend/src/modules/job-queue/`.

### Backend (NestJS)

- ~40 feature modules under `backend/src/modules/*` — every domain (hiring-plans, candidates, offers, bgv, appraisal-cycles, compensation, comms, push, …) is its own module. New features should add a new module, not extend an existing one.
- External system integrations live in `backend/src/integrations/{esign,bgv,msg91}` (NOT in `modules/`). Use this split: `modules/X/` is in-app feature; `integrations/Y/` wraps a third party.
- **Auth model:** `JwtAuthGuard` and `RolesGuard` are global (`app.module.ts`). Every endpoint is protected by default. Mark public endpoints with `@Public()` (`auth/decorators/public.decorator.ts`). Restrict by role with `@Roles(Role.ADMIN, Role.HR, ...)` (roles enum lives in `prisma/schema.prisma`). Read the current user with `@CurrentUser()`.
- **Bootstrap (`backend/src/main.ts`)** disables Nest's default body parser and installs `express.json` with a `verify` hook that captures `req.rawBody` — required for webhook HMAC verification. Don't change this without auditing every webhook integration. Global `ValidationPipe` is `whitelist + transform + forbidNonWhitelisted`, so all DTOs must be class-validator classes.
- **CORS is allowlisted to `http://localhost:3001` and `http://localhost:3002` only.** Production origins must be added explicitly.
- **Prisma schema is large (~1600 lines, ~50+ models).** Treat it as the canonical domain model. The `Role`, `HiringPlanStatus`, `ApplicationStatus`, `StageType`, etc. enums there are the single source of truth — frontend types should mirror, not redefine.
- **Swagger docs auto-generated at `/api/docs`** when backend is running.

### Frontend (Next.js App Router)

- Routes are split into route groups: `(public)` for marketing/login, `(protected)` for the authenticated app shell. Modules currently live as `(protected)/{dashboard,hiring-plans,candidates,offers,bgv,appraisal,compensation,training,admin}`.
- **Mock mode:** if `NEXT_PUBLIC_USE_MOCK_DATA=true`, `frontend/src/middleware.ts` intercepts every `/api/*` request and serves canned responses from `frontend/src/lib/mock/{router,data}.ts` — Auth0 is fully bypassed and `/` redirects to `/dashboard`. Use this for UI work without running the backend stack. Real data path uses Auth0 middleware via `frontend/src/lib/auth0.ts`.
- Client API helper lives at `frontend/src/lib/api.ts` (thin `fetch` wrapper). Server-side proxies in `app/api/*` should use `API_URL_INTERNAL`.
- **Design system:** primitives in `src/components/ui/*` (button, card, badge, input, tabs, progress, avatar, alert, dropdown-menu, etc.) are local shadcn-style. Composite/shared in `src/components/shared/*`. Sidebar/topbar/global-search are top-level `src/components/*.tsx`. **All visual decisions must follow `design-system-v2/CLAUDE.md`** (Inter font, indigo-600 primary, `rounded-xl` cards / `rounded-lg` inputs, lucide-react icons only, brand gradient `from-indigo-500 to-cyan-500`).
- An ongoing redesign (`project-plan/redesign-plan.md`, current branch prefix `redesign/`) is migrating off a previous Nova design system to v2 tokens. Treat that doc as the working roadmap when touching shared UI.
- React 19 + Tailwind v4 (note: Tailwind v4 uses `@theme { ... }` in CSS, not `tailwind.config.js`). Token CSS is in `src/app/globals.css`.

### AI service (FastAPI)

- Each `app/agents/*.py` is one task-specific Claude wrapper (jd_generator, candidate_scorer, feedback_summarizer, communication_drafter, insights_agent, resume_matcher, bgv_summariser, appraisal_agent). They share `base_agent.py`.
- `app/main.py` mounts one HTTP endpoint per agent under `/ai/*`. Adding an agent = new schema in `app/schemas/`, new agent in `app/agents/`, new endpoint in `main.py` (must use `Depends(verify_internal_api_key)`).
- DB access (when needed) is async SQLAlchemy via `app/services/db.py`; Postgres URL uses the `postgresql+asyncpg://` driver.
- **AI outputs that affect candidates (BGV summary, appraisal summary) are advisory only** — the docstrings call this out explicitly. Don't introduce code paths that auto-action AI verdicts.

### Cross-cutting

- Auth0 sync: `AUTH0_SYNC_SECRET` validates Auth0 → backend webhooks (HMAC), which is why raw body capture matters in `main.ts`.
- Audit logging is its own backend module (`modules/audit/`); sensitive actions should write to `AuditLog`.
- AI call cost tracking lives in `modules/ai-cost/` and the `AiCallLog` Prisma model — agent calls should be wrapped to record token usage.

## Conventions worth knowing before editing

- **Prisma is the schema source of truth.** Don't define duplicate enums in TypeScript — import from `@prisma/client`.
- **Don't add a new top-level package or service without updating `infra/docker-compose.yml` and the `Makefile`.** The dev experience assumes one `make dev` boots everything.
- **Backend module boundary is strict:** controllers thin, services own business logic, Prisma access via the `PrismaService` (`backend/src/prisma/prisma.service.ts`). Add new domain logic as a new module in `modules/` rather than putting it in `common/` or `auth/`.
- **Frontend `(protected)` vs `(public)` route groups matter:** anything under `(protected)` assumes the Auth0 session and the `<Sidebar/> + <TopBar/>` shell from `app/(protected)/layout.tsx`.
- Lint scripts use `--fix` (backend) and `next lint` (frontend/admin); ESLint configs are stock NestJS / Next defaults plus Prettier.
- `.env`, `.env.local`, `.env.*.local` are gitignored. Each service ships a `.env.example` — use it.
