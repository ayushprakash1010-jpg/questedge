# 00 — Repository Audit

**Project:** Work Nucleus / QuestEdge  
**Audited:** 2026-10-17  
**Auditor:** Principal Architect — Phase 0 Discovery

---

## 1. Repository Layout (Verified)

```
work-nucleus-ai/
├── CLAUDE.md                   ← 503-line architecture reference (canonical)
├── README.md                   ← intentionally minimal
├── design-system-v2/
│   ├── CLAUDE.md               ← 536-line Tailwind/component guide
│   ├── tokens.css              ← CSS custom property definitions (20 KB)
│   ├── preview/                ← brand/colour HTML reference pages
│   └── ui-kit/                 ← pixel-target mockups
├── project-plan/
│   ├── auth-strategy.md, branding.md, mvp.md, plan.md, plan-v2.md, redesign-plan.md
│   └── admin-portal/           ← THIS planning suite
└── work-nucleus/
    ├── Makefile
    ├── DEPLOYMENT.md           ← free-tier deployment runbook
    ├── backend/                ← NestJS 10, port 3000
    ├── frontend/               ← Next.js 14, port 3001
    ├── support-admin/          ← Next.js 14, port 3002
    ├── ai-service/             ← FastAPI + Gemini, port 8000
    ├── infra/                  ← docker-compose.yml, docker-compose.prod.yml, nginx
    └── docs/                   ← runbooks/incident-response.md
```

Note: `work-nucleus/shared/` exists as an empty placeholder — no shared library is published.

---

## 2. Backend Architecture (NestJS 10)

### 2.1 Module inventory (46 confirmed)

| Module | Verified Status | Key endpoints |
|--------|----------------|---------------|
| `auth` | Implemented | `/auth/provision`, `/auth/me`, `/auth/sync` |
| `users` | Implemented | Org-scoped CRUD |
| `health` | Implemented | `GET /health` |
| `hiring-plans` | Implemented | Full CRUD + AI JD generation |
| `job-descriptions` | Implemented | Versioned JDs, approval workflow |
| `pipeline` | Implemented | Stages, interviewer assignment |
| `candidates` | Implemented | Org-scoped, dedup by (orgId, email) |
| `applications` | Implemented | Stage tracking, AI match score |
| `feedback` | Implemented | Structured feedback, skill ratings |
| `decisions` | Implemented | SELECTED/REJECTED + AI comm draft |
| `offers` | Implemented | E-sign flow, approval chain, candidate token |
| `offer-templates` | Implemented | Per-org templates |
| `compensation` | Implemented | Offer comp package (fixed/variable/bonus/ESOP) |
| `joining` | Implemented | Checklist + candidate token flow |
| `bgv` | Implemented | Consent → vendor routing → AI summary |
| `appraisal-cycles` | Implemented | Full lifecycle (DRAFT→CLOSED) |
| `goals` | Implemented | OKR/KRA with self/manager ratings |
| `assessments` | Implemented | Self / Manager / Skip-level |
| `peer-feedback` | Implemented | Anonymous token-based |
| `calibration` | Implemented | Session management |
| `comp-budget` | Implemented | Hike/bonus pool per cycle |
| `comp-revisions` | Implemented | Per-employee, multi-stage approval chain |
| `comp-allocator` | Partially implemented | Module exists; full implementation unverified |
| `mandates` | Implemented | Full CRUD + AI generation + WhatsApp notify |
| `recruiter` | Implemented | RecruiterProfile CRUD |
| `referrals` | Implemented | Consent flow, ownership tracking |
| `candidate-portal` | Implemented | CandidateProfile CRUD |
| `claim-scope` | Implemented | Ownership locking, dispute |
| `rewards` | Implemented | Company approval + recruiter withdrawal |
| `ai-screening` | Implemented | AI mandate generation |
| `support` | Implemented | Dashboard, orgs, tickets, sessions, analytics, tools |
| `audit` | Partial | Read-only GET (own org only) — no platform-wide view |
| `security` | Implemented | Hash-chained SecurityLog + chain verify |
| `analytics` | Implemented | Funnel metrics |
| `reports` | Implemented | ReportDefinition CRUD |
| `notifications` | Implemented | In-app + WhatsApp (MSG91) |
| `comms` | Implemented | Multi-channel communication |
| `push` | Implemented | Web Push subscriptions |
| `email` | Implemented | Email integration |
| `settings` | Implemented | Per-org JSON blob |
| `search` | Implemented | Global search across entities |
| `skills` | Implemented | Global skill catalog (~hundreds of skills) |
| `training` | Implemented | Modules + completions |
| `file-upload` | Implemented | S3 presigned URLs (MinIO in dev) |
| `job-queue` | Implemented | pg-boss wrapper + resume-scoring.worker.ts |
| `cache` | Partial | In-memory HotCacheService (Redis-ready but Redis unused) |
| `ai-cost` | Implemented | Per-call log + per-org dashboard |
| `publishing` | Implemented | LinkedIn/Indeed/Naukri/CUSTOM |
| `public-apply` | Implemented | Public job apply (no auth) |

### 2.2 Auth pipeline (verified)

- Auth0 JWT (RS256) via JWKS, validated in `Auth0JwtStrategy`
- Both `JwtAuthGuard` AND `RolesGuard` registered as `APP_GUARD` — all routes protected by default
- `@Public()` decorator overrides both guards
- Roles enum: `ADMIN | HR | HIRING_MANAGER | INTERVIEWER | VIEWER | SUPPORT_REP | SUPPORT_ADMIN`
- UserType enum: `CANDIDATE | RECRUITER | COMPANY_ADMIN | COMPANY_USER | PLATFORM_ADMIN`
- Support app uses separate Auth0 connection (`AUTH0_SUPPORT_CONNECTION` + `AUTH0_SUPPORT_CLIENT_ID`)
- IMPORTANT: Auth0 custom claim namespace in strategy is `https://api.questedge.com/` but CLAUDE.md says `https://api.work-nucleus.com/` — verify the Auth0 Login Action matches the strategy
- 60-second in-memory profile cache per-sub in Auth0JwtStrategy

### 2.3 Tenant isolation (verified)

- `orgId` mandatory on every multi-tenant model
- Services read `user.orgId` from `@CurrentUser()` — never from request body (CLAUDE.md rule)
- Exception: SupportController deliberately crosses tenant boundaries, protected by `@Roles(SUPPORT_REP, SUPPORT_ADMIN)`

### 2.4 Audit and security logging (verified)

- `AuditLog`: orgId-scoped, action, entityType, entityId, changes JSON, ipAddress
- `SecurityLog`: SHA-256 hash-chained (`prevHash + serialised_payload`). Chain-verify endpoint: `GET /api/v2/security/verify-chain`
- `AuditController` at `/api/v1/admin/audit-log` reads only within caller's `orgId` — no platform-wide view
- `SupportSession`: SHADOW/IMPERSONATE, actionsLog JSON[], ipAddress persisted

---

## 3. Frontend Architecture (Next.js 14 App Router)

### 3.1 Route inventory (verified)

**Public `(public)/`**
- `jobs/` — public jobs board
- `bgv/` — BGV consent (token-based)
- `offer/` — offer view (token-based)
- `joining/` — joining checklist (token-based)
- `peer-feedback/` — peer feedback (token-based)
- `consent/[token]/` — generic consent flow
- Legal pages (contact, privacy-policy, terms, gdpr, cookie-policy)

**Protected `(protected)/`**
- `dashboard/` — user dashboard
- `hiring-plans/` — full hiring lifecycle
- `candidates/` — org candidate list
- `offers/` — offer management
- `bgv/` — BGV management
- `appraisal/` — appraisal cycles
- `compensation/` — comp revisions
- `training/` — training modules
- `mandates/` — marketplace (list + detail + create + rewards)
- `recruiter/` — recruiter dashboard
- `candidate/` — candidate portal
- `company/` — company admin view
- `support/` — user-facing support tickets
- `admin/` — **ORG-LEVEL ADMIN ONLY** (not platform-admin)
  - `admin/users/` — user management within org
  - `admin/settings/` — org settings
  - `admin/audit-log/` — org audit log
  - `admin/ai-cost/` — AI cost dashboard (org-scoped)
  - `admin/appraisal/`, `admin/compensation/`, `admin/reports/`

**API proxies `api/`**
- `api/auth/` — Auth0 SDK v4
- `api/v2/[...path]/route.ts` — catch-all proxy (attaches bearer token, forwards to backend)

### 3.2 Component inventory (verified)

- Shell: Sidebar (240px fixed, role-gated items), TopBar (64px), GlobalSearch, NotificationBell
- UI primitives: button, badge, card, input, label, select, textarea, tabs, progress, slider, dropdown-menu, avatar, alert, empty-state, skeleton, spinner, toaster
- Shared composites: kpi-card, ai-insight-card, candidate-card, page-header, data-table (paginated)
- Feature: kanban-board, jd-tab, feedback-form, pipeline-setup, plan-detail-panel, candidate-sheet, decision-modal, hiring-plan-form

### 3.3 Design system (verified)

- Primary: `indigo-600 (#4f46e5)`, Secondary: `cyan-500`, AI surface: `from-purple-600 to-indigo-600`
- Font: Inter only (via `next/font/google`)
- Icons: lucide-react only (16px in-button, 18px nav, 20px feature, 24-28px hero)
- Charts: Recharts
- Animations: Framer Motion (always `viewport={{ once: true }}` on scroll)
- Tailwind CSS (custom properties in `globals.css` matching `design-system-v2/tokens.css`)

---

## 4. Support-Admin Application (port 3002)

### 4.1 Implemented pages (verified)

| Route | Status | Notes |
|-------|--------|-------|
| `/` dashboard | ✅ Implemented | KPIs: totalOrgs, activeUsers, activePlans, openTickets, orgsNeedingAttention |
| `/organizations` | ✅ Implemented | Search, industry filter, health score, open ticket count |
| `/organizations/[orgId]` | ✅ Implemented | Detail + users + hiring plans + health history |
| `/tickets` | ✅ Implemented | Filters by status, priority, org, assignee, category |
| `/tickets/new` | ✅ Implemented | Create ticket |
| `/tickets/[ticketId]` | ✅ Implemented | Detail + notes + escalation |
| `/metrics` | ✅ Implemented | Ticket volume, response time, SLA, org health, rep performance |
| `/tools` | ✅ Implemented | Feature flag viewer |
| `/tools/sessions` | ✅ Implemented | Session history |
| `/tools/shadow` | ✅ Implemented | Start shadow session |

### 4.2 Backend support API (verified)

| Endpoint | Role gate | Notes |
|----------|-----------|-------|
| `GET /api/v1/support/dashboard` | SUPPORT_REP, SUPPORT_ADMIN | Cross-org KPIs |
| `GET /api/v1/support/organizations` | SUPPORT_REP, SUPPORT_ADMIN | Paginated, search, industry filter |
| `GET /api/v1/support/organizations/:orgId` | SUPPORT_REP, SUPPORT_ADMIN | Detail + health |
| `GET /api/v1/support/organizations/:orgId/users` | SUPPORT_REP, SUPPORT_ADMIN | Read-only user list |
| `GET /api/v1/support/organizations/:orgId/hiring-plans` | SUPPORT_REP, SUPPORT_ADMIN | Read-only |
| `GET /api/v1/support/organizations/:orgId/health` | SUPPORT_REP, SUPPORT_ADMIN | OrgHealthMetric history |
| `POST/GET/PATCH /api/v1/support/tickets/*` | SUPPORT_REP, SUPPORT_ADMIN | Full ticket lifecycle |
| `POST /api/v1/support/sessions/shadow` | SUPPORT_REP, SUPPORT_ADMIN | Shadow session |
| `POST /api/v1/support/sessions/impersonate` | SUPPORT_ADMIN only | Impersonation |
| `GET /api/v1/support/analytics/*` | SUPPORT_REP, SUPPORT_ADMIN | Ticket metrics, SLA, org health |
| `POST /api/v1/support/tools/export-data` | SUPPORT_ADMIN only | GDPR export |
| `GET/PATCH /api/v1/support/tools/feature-flags/:orgId` | GET: SUPPORT_REP, PATCH: SUPPORT_ADMIN | Feature flags |
| `POST /api/v1/support/tools/bulk-action` | SUPPORT_ADMIN only | close-old-tickets, deactivate-inactive-users |

---

## 5. Prisma Schema Summary (1925 lines, ~50 models)

### Key model groups

| Group | Models | Count |
|-------|--------|-------|
| Core identity | Organization, User, OrgSettings | 3 |
| Hiring | HiringPlan, Candidate, CandidateApplication, PipelineStage, InterviewFeedback, SelectionDecision, JobDescription, JobPublishing | 8+ |
| Offers/Joining | OfferTemplate, Offer, OfferDocVersion, Compensation, ESignRequest, JoiningChecklist, CandidateJoining | 7 |
| BGV | BgvProfile, BgvCheck | 2 |
| Appraisal | AppraisalCycle, OrgGoal, Goal, AppraisalAssessment, PeerFeedbackRequest, CalibrationSession | 6 |
| Compensation engine | AppraisalBudget, CompensationRevision, CompensationSnapshot | 3 |
| Marketplace | CandidateProfile, RecruiterProfile, Mandate, MandateParticipation, Referral, CandidateConsent, ClaimScope, RewardTracking, SavedJob | 9 |
| Support | OrgHealthMetric, SupportTicket, SupportNote, SupportEscalation, SupportSession | 5 |
| Platform/Observability | AuditLog, SecurityLog, AiCallLog, DashboardInsight, NotificationLog, ReportDefinition, UserNotificationPref, PushSubscription, Notification | 9 |
| Cross-cut | Skill, HiringPlanSkill, FeedbackSkillRating, TrainingModule, TrainingCompletion | 5 |

### Critical integrity invariants

- `User.email` UNIQUE globally (single identity across all orgs)
- `Candidate (orgId, email)` UNIQUE composite — dedup per org
- `CandidateApplication (candidateId, hiringPlanId)` UNIQUE
- `Referral (mandateId, candidateProfileId)` UNIQUE
- `ClaimScope (candidateProfileId, mandateId)` UNIQUE — one ownership per mandate/candidate pair
- `SecurityLog` is hash-chained — do NOT insert into middle of chain

---

## 6. AI Service (FastAPI, port 8000)

### 6.1 Agents (verified)

8 agents: JD generator, feedback summarizer, candidate scorer, communication drafter, insights, resume matcher, BGV summariser, appraisal agent.

### 6.2 Important discrepancy

CLAUDE.md (line 464) says default model is `claude-sonnet-4-20250514`. The actual `ai-service/app/config.py` shows:
- `GEMINI_API_KEY` (not `ANTHROPIC_API_KEY`)
- `GEMINI_MODEL = "gemini-3.8-flash"` (not `CLAUDE_MODEL`)
- Docker compose passes `GEMINI_API_KEY`

**The AI service has been migrated to Gemini. CLAUDE.md is outdated on this point.** All agent descriptions and the BaseAgent reference to `tenacity` retry logic may still apply, but cost tracking field names (`agentName`, not agent class) and model used will differ.

---

## 7. Infrastructure

### Current deployment stack (from DEPLOYMENT.md)

| Service | Provider | Free tier limits | Notes |
|---------|----------|-----------------|-------|
| Frontend (main) | Vercel | 100 GB bandwidth/mo | Serverless, no persistent workers |
| Frontend (support-admin) | Vercel | Same | Separate project |
| Backend | Render | 512 MB RAM, spins down after 15 min inactivity | Free tier limitation |
| Database | Neon | 0.5 GB storage, 1 branch | Serverless Postgres |
| Cache | Upstash | 10,000 commands/day | Redis serverless |
| Object storage | MinIO (dev) / TBD (prod) | N/A | No prod S3 configured yet |
| Auth | Auth0 | 7,500 MAU free | M2M calls count toward limits |
| AI | Gemini API | Free tier: 1,500 req/day, 1M tokens/min | Subject to change |
| Job queue | pg-boss (in Postgres) | Shares Neon DB | No extra service needed |
| Email | Unknown — email module exists | TBD | Provider not confirmed |
| SMS/WhatsApp | MSG91 | Paid per message | Usage-based |

---

## 8. Technical Debt and Key Findings

### P0 — Critical

| ID | Finding | Location | Action Required |
|----|---------|----------|----------------|
| P0-1 | `POST /api/v2/ai-cost/internal/log` is `@Public()` — no JWT, only X-Internal-API-Key. Attacker who learns the key can write fake cost logs. | `ai-cost.controller.ts:33` | Add IP allowlist or rate limiting |
| P0-2 | Platform admin has no cross-org audit view. `AuditController` scopes to caller's orgId. Security events are unviewable by platform staff without joining each org. | `audit.controller.ts:26` | New platform-admin audit endpoint |
| P0-3 | Two debug public endpoints left in production mandates controller: `GET /mandates/test-ai` and `GET /mandates/test-whatsapp` with hardcoded phone numbers. | `mandates.controller.ts:59-77` | Remove immediately |

### P1 — High

| ID | Finding | Location | Action Required |
|----|---------|----------|----------------|
| P1-1 | `SecurityLog.verifyChain` checks chain pointers but skips hash equality (`void expected`). The tamper-evidence guarantee is incomplete. | `security.service.ts:82` | Implement actual hash comparison |
| P1-2 | `PLATFORM_ADMIN` UserType exists in enum but no controller, guard, or service actually checks for it. Platform-level privilege is undefined. | `schema.prisma:413` | Define and enforce PLATFORM_ADMIN |
| P1-3 | No rate limiting on any backend endpoint. | `main.ts` | Add @nestjs/throttler |
| P1-4 | Redis configured in docker-compose but HotCacheService uses in-memory Map. Cache is not shared between instances and is lost on restart. | `cache.service.ts` | Switch to Redis backend |
| P1-5 | AuditLog writes are not enforced by middleware — each module calls AuditService manually. Coverage is unknown. | `audit.service.ts` | Audit coverage and add missing writes |

### P2 — Medium

| ID | Finding | Location | Action Required |
|----|---------|----------|----------------|
| P2-1 | CORS allowlist only covers localhost origins. Production origins not set. | `main.ts` | Add production origins before deployment |
| P2-2 | Auth0 custom claim namespace mismatch between CLAUDE.md (`work-nucleus.com`) and strategy code (`questedge.com`). | `auth0-jwt.strategy.ts:14` | Verify Auth0 Login Action matches strategy |
| P2-3 | No platform-wide AI cost view. `AiCostController` is org-scoped. | `ai-cost.controller.ts` | Add SUPPORT_ADMIN cross-org AI cost view |
| P2-4 | Render free tier spins down after 15 min inactivity — pg-boss cron jobs may miss scheduled runs if backend is sleeping. | `DEPLOYMENT.md` | Upgrade to paid Render tier or use keep-alive ping |

### P3 — Low

| ID | Finding | Location | Action Required |
|----|---------|----------|----------------|
| P3-1 | Scratch scripts in backend root: `check-all.ts`, `check.js`, `dump.js`, `fix-rewards.ts`, `test-*.ts` | `backend/` | Remove or move to scripts/ dir |
| P3-2 | `user_inputs.txt` (465 KB) committed to work-nucleus root | `work-nucleus/user_inputs.txt` | Remove from repo (likely not intended) |
| P3-3 | `support-admin/.env.local` only contains mock-data flag — no real auth config visible | `support-admin/.env.local` | Confirm secrets are in Vercel env, not local file |
