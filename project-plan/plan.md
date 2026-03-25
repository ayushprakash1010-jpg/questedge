# Work Nucleus — Execution Plan with Claude Code Instructions

**Source:** `mvp.md` v1.1 | **Created:** March 24, 2026 | **Total Duration:** 8 Sprints (16 Weeks)

---

## Architecture Overview

```
                              Auth0 (AuthN/AuthZ/Sessions/Tokens)
                                 │
                                 ▼
Frontend (Next.js 14)  ──►  Nginx Gateway  ──►  NestJS Backend (port 3000)
Admin (react-admin)    ──►       │          ──►  Python AI Service (port 8000)
                                 │
                    PostgreSQL + Redis + S3/MinIO
                   (user profiles, app data — no credentials)
```

**Key Tech Decisions:**
- Monorepo: `/work-nucleus` with `backend`, `ai-service`, `frontend`, `admin`, `shared`, `infra`, `docs`
- Auth: Auth0 (authentication, session management, refresh tokens, AuthZ/AuthN) — no custom auth logic
- Backend: NestJS 10 + Prisma ORM + Auth0 JWT validation + CASL RBAC
- AI Service: Python 3.12 + FastAPI + Anthropic SDK (claude-sonnet-4-20250514)
- Frontend: Next.js 14 (App Router) + Tailwind + shadcn/ui + Zustand + TanStack Query
- Kanban: @dnd-kit/core
- Real-time: Socket.IO via NestJS WebSocket Gateway
- Deployment: Docker Compose (MVP)

---

## Pre-Sprint Checklist

Before starting Sprint 1, ensure:
- [ ] Node.js 20+, Python 3.12+, Docker & Docker Compose installed
- [ ] PostgreSQL 16 and Redis 7 available (or will use Docker)
- [ ] Anthropic API key obtained
- [ ] Auth0 tenant created with application configured (domain, client ID, client secret, API audience)
- [ ] Git repository initialized

---

## Sprint 1: Project Foundation & Auth (Weeks 1-2)

**Goal:** Monorepo setup, database, Auth0 integration, user management, basic CI.

### Phase 1A: Monorepo & Backend Skeleton

```
Claude Code Instruction:

Set up a monorepo for "Work Nucleus" HR tech platform:

/work-nucleus
├── /backend           # NestJS 10 (TypeScript)
├── /ai-service        # Python FastAPI
├── /frontend          # Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
├── /admin             # React admin panel (react-admin)
├── /shared            # Shared TypeScript types, constants
├── /infra             # Docker Compose, nginx config
└── /docs              # Documentation

BACKEND setup:
1. Initialize NestJS: nest new backend --strict
2. Install and configure:
   - Prisma ORM (provider: postgresql)
   - @nestjs/passport + passport-jwt (for validating Auth0-issued JWTs — NOT for issuing tokens)
   - jwks-rsa (to fetch Auth0 JWKS signing keys for JWT verification)
   - @nestjs/config (env vars)
   - class-validator + class-transformer (DTO validation)
   - @nestjs/swagger (API docs at /api/docs)
   - @nestjs/cache-manager + cache-manager-redis-store (Redis)
   - @nestjs/websockets + @nestjs/platform-socket.io (real-time)
3. Create Prisma schema with initial models:
   - Organization (id UUID, name, industry, createdAt, updatedAt)
   - User (id UUID, orgId FK, email @unique, auth0Sub String @unique, name, role Enum(ADMIN, HR, HIRING_MANAGER, INTERVIEWER, VIEWER), avatarUrl?, isActive @default(true), createdAt, updatedAt)
   NOTE: No passwordHash — Auth0 owns all credentials, password hashing, MFA, and session tokens.
   auth0Sub stores the Auth0 user ID (e.g., "auth0|abc123") to link Auth0 identity to local user record.
4. Run: npx prisma migrate dev --name init
5. Add global pipes: ValidationPipe (whitelist, transform), LoggingInterceptor
6. Add CORS config, health check: GET /api/v1/health
7. Swagger at /api/docs
```

### Phase 1B: Auth0 Integration

```
Claude Code Instruction:

Integrate Auth0 for all authentication in Work Nucleus. Auth0 handles: login, registration, password management,
session management, refresh tokens, MFA, and all AuthZ/AuthN. Our backend ONLY validates Auth0-issued JWTs
and maps the Auth0 identity to a local User record for app-specific data (role, org, preferences).

AUTH0 SETUP (manual, done before this phase):
- Create Auth0 tenant, Regular Web Application, and API (audience: https://api.work-nucleus.com)
- Enable Auth0 login/signup flows (Universal Login)
- Configure callback URLs for frontend (http://localhost:3001/api/auth/callback)
- Note: AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE env vars needed

BACKEND (NestJS — AuthModule):
1. Install: @nestjs/passport, passport, passport-jwt, jwks-rsa
2. Create Auth0JwtStrategy (extends PassportStrategy(Strategy, 'jwt')):
   - Configure with:
     - secretOrKeyProvider: passportJwtSecret({ jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json` }) via jwks-rsa
     - issuer: `https://${AUTH0_DOMAIN}/`
     - audience: AUTH0_AUDIENCE (e.g., https://api.hireflow.com)
     - algorithms: ['RS256']
   - In validate(payload):
     a. Extract auth0Sub from payload.sub
     b. Look up local User by auth0Sub in Prisma
     c. If user not found, return null (401)
     d. If user found but isActive=false, return null (401)
     e. Attach full local user object (id, orgId, role, email, name) to request
3. Implement JwtAuthGuard as global guard (validates Auth0 JWT on every request)
4. Implement RolesGuard decorator: @Roles('ADMIN', 'HR') that checks req.user.role from local DB

5. POST /api/v1/auth/provision — Called after first Auth0 login to create org + first admin user
   - Accepts: orgName, industry, name (Auth0 JWT must be present, extracts email + auth0Sub from token)
   - Creates Organization + User (role=ADMIN, auth0Sub from token) in transaction
   - Returns: { user, organization }
   - This is called ONCE during onboarding. Subsequent logins just use the JWT validate flow.

6. GET /api/v1/auth/me — Return current user profile (from local DB, looked up via Auth0 sub)
   - Includes: user data, organization data, role, permissions

7. POST /api/v1/auth/sync — Optional webhook endpoint for Auth0 Actions/Rules
   - Syncs Auth0 profile changes (email, name, avatar) to local User record
   - Secured by Auth0 webhook secret

NOTE: No /login, /register, /refresh endpoints — Auth0 handles all of these directly.
No password hashing, no token issuance, no session storage in our backend.
```

### Phase 1C: User Management Module

```
Claude Code Instruction:

Build the UsersModule (admin-only) for NestJS:

CRUD at /api/v1/admin/users:
- List with pagination, filter by role (queries local Postgres User table)
- Create (invite user to org):
  a. Use Auth0 Management API to create user in Auth0 (email + temporary password + send password reset email)
  b. Create local User record with auth0Sub returned from Auth0, assigned role, orgId
  c. Install: auth0 (Node.js Auth0 Management API SDK)
- Update (change role, toggle isActive) — role and isActive are local DB fields, not Auth0
- Delete (soft: set isActive=false in local DB; optionally block user in Auth0 via Management API)
- All local queries via Prisma
- Protected by @Roles('ADMIN')

NOTE: Auth0 is the source of truth for credentials/login. Local DB is source of truth for
role, org membership, and app-specific profile data.
```

### Phase 1D: Python AI Service Skeleton

```
Claude Code Instruction:

Set up the Python FastAPI AI service at /ai-service:

1. app/main.py — FastAPI app entry point
2. app/config.py — pydantic-settings BaseSettings
   (reads: ANTHROPIC_API_KEY, DATABASE_URL, INTERNAL_API_KEY, PORT)
3. app/middleware/api_key_auth.py — dependency checking X-Internal-API-Key header
4. app/agents/base_agent.py:
   - Initialize Anthropic client using anthropic Python SDK
   - Method: async call_claude(system_prompt, user_prompt, max_tokens=4096) -> dict
   - Retry: 3 attempts, exponential backoff, 30s timeout
   - Logs every call to ai_agent_logs table via SQLAlchemy async
   - Tracks: input_json, output_json, model_used, tokens_input, tokens_output, latency_ms
5. app/services/db.py — async SQLAlchemy engine + session for ai_agent_logs
6. GET /ai/health endpoint
7. requirements.txt: fastapi, uvicorn, anthropic, pydantic, pydantic-settings, sqlalchemy[asyncio], asyncpg, jinja2, tenacity
```

### Phase 1E: Frontend Shell

```
Claude Code Instruction:

Set up the Next.js 14 frontend at /frontend:

1. npx create-next-app@latest frontend --typescript --tailwind --app --src-dir
2. Install shadcn/ui, add components: button, input, card, table, badge, dropdown-menu, dialog, toast, avatar, tabs, form, select
3. Install @auth0/nextjs-auth0 for Auth0 integration
4. Configure Auth0 provider:
   - Create /api/auth/[...auth0] route handler (handles login, callback, logout, refresh automatically)
   - Env vars: AUTH0_SECRET, AUTH0_BASE_URL, AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE
   - Auth0 handles: login page (Universal Login), registration, password reset, session cookies, refresh tokens
   - Use UserProvider from @auth0/nextjs-auth0 to wrap app
   - Use useUser() hook for client-side user state
   - Use getSession() for server-side user state
   - On first login (no local user record): redirect to /onboarding page to call POST /api/v1/auth/provision (create org + user)
   - Access token (JWT) automatically attached to API calls via Auth0 middleware
   NOTE: No custom login/register forms — Auth0 Universal Login handles all auth UI
5. Create ProtectedLayout at /app/(protected)/layout.tsx — uses withPageAuthRequired or checks Auth0 session, redirects to Auth0 login if no session
6. App shell inside protected area:
   - Sidebar: Logo, nav links (Dashboard, Hiring Plans, Candidates, Training, Admin) with role-based visibility
   - Top bar: search placeholder, notification bell placeholder, user avatar dropdown (Profile, Settings, Logout)
7. /admin/users page: data table (Name, Email, Role, Status, Actions), create/edit dialogs
```

### Phase 1F: Docker Compose & Dev Environment

```
Claude Code Instruction:

Create Docker Compose setup at /infra:

docker-compose.yml with:
1. postgres:16 — volume mount, POSTGRES_DB=work_nucleus
2. redis:7 — volume mount
3. backend — build ./backend, port 3000, depends_on postgres+redis, env for DB, Redis, AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_MANAGEMENT_CLIENT_ID, AUTH0_MANAGEMENT_CLIENT_SECRET, AI_SERVICE_URL=http://ai-service:8000
4. ai-service — build ./ai-service, port 8000, depends_on postgres, env for ANTHROPIC_API_KEY, DATABASE_URL, INTERNAL_API_KEY
5. frontend — build ./frontend, port 3001, env NEXT_PUBLIC_API_URL=http://localhost:3000, AUTH0_SECRET, AUTH0_BASE_URL, AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE

Create .env.example with all required variables.
Create Makefile with targets: dev, build, prisma-migrate, prisma-studio, test-backend, test-ai, lint
```

### Sprint 1 Deliverables
- [ ] Running monorepo with all 4 services
- [ ] Auth0 integration — login/signup/logout/session/refresh via Auth0 Universal Login
- [ ] Backend JWT validation of Auth0 tokens with local user lookup
- [ ] User provisioning (Auth0 Management API for invites, local DB for role/org)
- [ ] Database with Prisma migrations (User table has auth0Sub, no passwordHash)
- [ ] App shell with Auth0-protected routing
- [ ] Python AI service skeleton with Claude client
- [ ] Docker Compose dev environment

---

## Sprint 2: Hiring Plan Builder (Weeks 3-4)

**Goal:** Full hiring plan CRUD, skills taxonomy, plan templates.

### Phase 2A: Database Models — Skills & Hiring Plans

```
Claude Code Instruction:

Add Prisma schema models for hiring plans:

1. Skill model:
   - id UUID, name String, category Enum(TECHNICAL, LEADERSHIP, BEHAVIOURAL, COMMUNICATION, DOMAIN)
   - industry String?, isGlobal Boolean @default(false), createdAt

2. HiringPlan model:
   - id UUID, orgId FK→Organization, title, industry, department, quarter Int, year Int
   - totalRoles Int, filledRoles Int @default(0)
   - status Enum(DRAFT, ACTIVE, COMPLETED, CANCELLED)
   - budgetMin Decimal, budgetMax Decimal, currency @default("INR"), benefits Json
   - hiringManagerId FK→User, reportingManagerName, hodName
   - teamSize Int?, teamLevels String?, designation String, notes String?
   - createdBy FK→User, createdAt, updatedAt

3. HiringPlanSkill model:
   - id UUID, hiringPlanId FK, skillId FK
   - priority Enum(MUST_HAVE, NICE_TO_HAVE), minProficiency Int
   - @@unique([hiringPlanId, skillId])

4. Run migration: npx prisma migrate dev --name add-hiring-plans

5. Create seed script (prisma/seed.ts):
   - Insert 100+ skills across categories and industries
   - Industries: software engineering, finance, healthcare, manufacturing, retail, marketing
   - Run with: npx prisma db seed
```

### Phase 2B: Backend — Hiring Plans Module

```
Claude Code Instruction:

Create HiringPlansModule at src/modules/hiring-plans/:

DTOs (class-validator):
- CreateHiringPlanDto: title (IsString, MinLength 3), industry, department, quarter (IsInt 1-4), year, totalRoles (Min 1), budgetMin, budgetMax, currency @default('INR'), benefits (IsArray), hiringManagerId (IsUUID), reportingManagerName, hodName, teamSize?, teamLevels?, designation, skills array of { skillId, priority, minProficiency 1-5 }
- UpdateHiringPlanDto: PartialType(CreateHiringPlanDto)
- QueryHiringPlansDto: status?, quarter?, year?, department?, hiringManagerId?, page, limit, sortBy, sortOrder

Service (HiringPlansService):
- create(): Plan + bulk create HiringPlanSkill in Prisma transaction
- findAll(): List with filters, pagination, includes skills and hiring manager name
- findOne(): Full detail with skills, hiring manager, creator info
- update(): Update plan + upsert skills in transaction
- remove(): Soft delete (status = CANCELLED)
- clone(): Deep copy with skills, reset filledRoles=0, status=DRAFT, append "(Copy)" to title

Controller: /api/v1/hiring-plans, protected by JwtAuthGuard, @Roles('ADMIN', 'HR', 'HIRING_MANAGER')

Also create SkillsModule:
- Admin CRUD: /api/v1/admin/skills (admin only)
- Search: GET /api/v1/skills/search?q=&category=&industry= (all authenticated users, Prisma `contains`)
```

### Phase 2C: Frontend — Hiring Plans List & Dashboard

```
Claude Code Instruction:

Build Hiring Plans list page at /(protected)/hiring-plans/page.tsx:

1. Data table (shadcn DataTable) with TanStack Query:
   - Columns: Title, Industry, Department, Quarter+Year, Roles (filled/total + progress bar), Budget Range (formatted), Status (colored badge), Hiring Manager, Actions dropdown (View, Edit, Clone, Delete)
   - Filter bar: Status dropdown, Quarter dropdown, Department input
   - "Create New Plan" button → /hiring-plans/new
   - Empty state with CTA

2. Dashboard at /dashboard:
   - Stats row: 4 cards — Total Active Plans, Total Open Roles, Roles Filled This Quarter, Avg Budget Range
   - Fetch from GET /api/v1/hiring-plans/stats endpoint
```

### Phase 2D: Frontend — Hiring Plan Form (Multi-Step)

```
Claude Code Instruction:

Create multi-step Hiring Plan form at /hiring-plans/new and /hiring-plans/[id]/edit:

Using react-hook-form + zod schema validation:

Step 1 - Basic Info: Title, Industry (select), Department, Designation, Quarter (Q1-Q4), Year
Step 2 - Team Structure: Total Roles, Reporting Manager, HOD, Team Size, Team Levels, Hiring Manager (async user search)
Step 3 - Compensation: Budget Min/Max, Currency (INR/USD/EUR/GBP), Benefits (tag input)
Step 4 - Skills: Searchable skill picker from /api/v1/skills/search, per skill: category badge, Priority toggle (Must Have/Nice to Have), Proficiency slider (1-5), remove button
Step 5 - Review & Submit: Read-only summary, Create/Update button

Step navigation with Previous/Next, step indicator, per-step validation.
Use useMutation (TanStack Query) for create/update.
```

### Phase 2E: Frontend — Hiring Plan Detail Page

```
Claude Code Instruction:

Create Hiring Plan detail page at /hiring-plans/[id]:

- Header: title, status badge, "Quarter Q{n} {year}", budget range, Edit button
- Tabs (shadcn Tabs): Overview | Job Description | Pipeline | Feedback | Analytics
- Overview tab: Card sections — Basic Info, Team Structure, Compensation & Benefits, Required Skills (grouped by category with proficiency badges)
- Other tabs: "Coming Soon" placeholder
- Back button to /hiring-plans
```

### Sprint 2 Deliverables
- [ ] Hiring plan CRUD with NestJS modules, DTOs, Prisma queries
- [ ] Skills taxonomy with 100+ seed entries
- [ ] Multi-step creation form with validation
- [ ] Plan list, detail, edit, clone functionality
- [ ] Dashboard summary cards

---

## Sprint 3: AI Job Description Generator (Weeks 5-6)

**Goal:** AI-powered JD generation, versioning, approval workflow.

### Phase 3A: Database & Backend — JD Module

```
Claude Code Instruction:

Build the Job Description module for NestJS backend:

1. Add Prisma model — JobDescription:
   - id UUID, hiringPlanId FK, version Int @default(1)
   - content Json (title, summary, responsibilities[], qualifications{required[], preferred[]}, aboutCompany, workMode)
   - fitmentMapping Json (role, designation, ctcRange{min,max,currency}, reportingTo, hod, teamSize, teamLevels, industry)
   - evaluationParameters Json (technicalSkills[{name,proficiencyExpected,assessmentCriteria}], leadershipSkills[{name,indicators}], behaviouralSkills[{name,assessmentCriteria}])
   - generatedByAi Boolean, aiPromptUsed String?
   - status Enum(DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED)
   - createdBy FK, approvedBy FK?, approvedAt DateTime?
   - createdAt, updatedAt
   - Run migration: npx prisma migrate dev --name add-job-descriptions

2. JobDescriptionsModule service:
   - generate(hiringPlanId, userId, additionalContext?):
     Fetch plan → call Python AI POST /ai/generate-jd → save as new version
   - findLatest(hiringPlanId): Latest version (prefer approved)
   - update(jdId, dto): Manual edit, sets generatedByAi=false
   - approve(jdId, userId): Set APPROVED status
   - listVersions(hiringPlanId): All versions desc

   Controller: /api/v1/hiring-plans/:planId/jd/*
   @Roles('ADMIN','HR','HIRING_MANAGER')
   Use HttpModule to call Python service via ConfigService AI_SERVICE_URL
```

### Phase 3B: Python AI — JD Generator Agent

```
Claude Code Instruction:

Build the JD Generator agent in the Python AI service:

1. POST /ai/generate-jd endpoint in app/main.py
   - Request model (Pydantic): GenerateJdRequest with hiringPlan (dict), skills (list), additionalContext (str|None)
   - Response model: GenerateJdResponse with content, fitmentMapping, evaluationParameters

2. JdGeneratorAgent class (extends BaseAgent) at app/agents/jd_generator.py:
   - Load system prompt from app/prompts/jd_system.j2 (Jinja2 template)
   - Template variables: industry, role details, skill categories, team structure, CTC range
   - System prompt instructs Claude to return ONLY valid JSON matching JD schema
   - Model: claude-sonnet-4-20250514, max_tokens=4096
   - Parse JSON response, validate against Pydantic model
   - If parse fails, retry once with "fix your JSON" follow-up
   - Log to ai_agent_logs: agent_type='jd_generation'

3. Create Jinja2 prompt template at app/prompts/jd_system.j2:
   - Professional JD generation instructions
   - All hiring plan fields as template variables
   - Exact JSON output schema with examples
   - Generate evaluation parameters by: Technical, Leadership, Behavioural
```

### Phase 3C: Frontend — JD Tab UI

```
Claude Code Instruction:

Build the JD tab inside /hiring-plans/[id] detail page (replace placeholder):

States:
1. No JD exists → Hero section: "Generate Job Description with AI" button + optional textarea for additional context
2. Loading → Animated skeleton with "AI is crafting your job description..." message
3. JD Display:
   - Title as heading, status badge (Draft/Pending/Approved/Published)
   - Sections: Summary, Key Responsibilities (ordered list), Required/Preferred Qualifications (cards)
   - Fitment Mapping card: grid of Role, Designation, CTC Range, Reporting To, HOD, Team Size
   - Evaluation Parameters: 3-column layout — Technical Skills (name + proficiency bar + criteria), Leadership Skills (name + indicators), Behavioural Skills (name + criteria)
   - Edit mode: toggle makes all sections editable, Save/Cancel buttons
   - Version dropdown: select previous versions, "Restore This Version" button
   - Actions: Approve button (if DRAFT), Regenerate with AI, Export as PDF (stretch)
   - Approval banner: "Approved by {name} on {date}"

4. Add JD status badge to hiring plan list view and detail page header.
```

### Sprint 3 Deliverables
- [ ] NestJS JD module calling Python AI service
- [ ] Python JD agent with Jinja2 prompts + Claude SDK
- [ ] Structured JD with fitment mapping and evaluation parameters
- [ ] JD versioning and approval workflow
- [ ] JD display with edit capability
- [ ] AI agent logging

---

## Sprint 4: Kanban Interview Pipeline (Weeks 7-8)

**Goal:** Configurable interview stages, candidate management, drag-and-drop Kanban.

### Phase 4A: Database Models — Pipeline, Candidates, Applications

```
Claude Code Instruction:

Add Prisma models for the interview pipeline:

1. PipelineStage:
   - id UUID, hiringPlanId FK, name, stageOrder Int
   - stageType Enum(SCREENING, TECHNICAL, HR, LEADERSHIP, CULTURAL, OFFER, CUSTOM)
   - maxDurationDays Int?, skillsToEvaluate Json (array of skill IDs), description?, createdAt, updatedAt

2. PipelineStageInterviewer:
   - id UUID, stageId FK, userId FK, isMandatory Boolean @default(false)
   - @@unique([stageId, userId])

3. Candidate:
   - id UUID, orgId FK, name, email, phone?, resumeUrl?
   - source Enum(REFERRAL, JOB_BOARD, DIRECT, AGENCY, INTERNAL)
   - currentCompany?, currentRole?, experienceYears Decimal?, expectedCtc Decimal?, noticePeriodDays Int?, notes?
   - @@unique([orgId, email])

4. CandidateApplication:
   - id UUID, candidateId FK, hiringPlanId FK, currentStageId FK→PipelineStage?
   - status Enum(ACTIVE, SELECTED, REJECTED, ON_HOLD, WITHDRAWN)
   - appliedAt, stageEnteredAt, completedAt?, rejectionReason?, selectionNotes?
   - totalScore Decimal?, aiSummary?
   - @@unique([candidateId, hiringPlanId])

5. CandidateStageHistory:
   - id UUID, applicationId FK, stageId FK, enteredAt, exitedAt?, outcome Enum(PASSED, REJECTED, SKIPPED)?

Run migration: npx prisma migrate dev --name add-pipeline-candidates
```

### Phase 4B: Backend — Pipeline, Candidates, Applications Modules

```
Claude Code Instruction:

Create three NestJS modules for the interview pipeline:

1. PipelineModule (src/modules/pipeline/):
   - createStage(): With interviewers in transaction, auto-reorder on conflicts
   - getStages(): List with interviewer details and skill names (joined)
   - updateStage(): Update config, reassign interviewers
   - deleteStage(): Only if no active candidates in stage
   - reorderStages(): Bulk update stageOrder in transaction
   Controller: /api/v1/hiring-plans/:planId/stages

2. CandidatesModule (src/modules/candidates/):
   - CRUD: POST, GET (search name/email, filter by source), GET by id (with applications), PATCH
   Controller: /api/v1/candidates

3. ApplicationsModule (src/modules/applications/):
   - addToPipeline(candidateId, hiringPlanId): Create with currentStageId = first stage, status=ACTIVE, record first StageHistory
   - getKanbanBoard(hiringPlanId): Returns stages with candidates, counts, avgDaysInStage, per-candidate daysInStage/score/feedbackCount
   - moveCandidate(applicationId, targetStageId): Validate same plan, update StageHistory, update currentStageId + stageEnteredAt in transaction
   - updateStatus(applicationId, status, reason?): SELECTED increments filledRoles, REJECTED records reason
   - getDetail(applicationId): Full with candidate info, stage history timeline
   Controller: /api/v1/applications, /api/v1/hiring-plans/:planId/pipeline

4. WebSocket Gateway (pipeline.gateway.ts):
   - Namespace: /pipeline
   - Rooms per hiringPlanId: socket.join(`plan:${planId}`)
   - Events: candidate:moved, candidate:statusChanged, candidate:added
   - ApplicationsService emits events via gateway after mutations
```

### Phase 4C: Frontend — Pipeline Configuration UI

```
Claude Code Instruction:

Build Pipeline Configuration UI (sub-tab "Setup" inside hiring plan Pipeline tab):

- Vertical list of stages, drag to reorder with @dnd-kit/sortable
- Each row: drag handle | stage name | type badge | max duration | interviewer count | edit/delete icons
- "Add Stage" button → dialog: Name, Type (SCREENING/TECHNICAL/HR/LEADERSHIP/CULTURAL/OFFER/CUSTOM), Max Duration (days), Description
- Edit stage dialog: same fields + "Assign Interviewers" multi-select (async user search, role INTERVIEWER or HIRING_MANAGER) + "Skills to Evaluate" (select from plan's skills)
- "Use Default Template" button → creates: Screening → Technical Round 1 → Technical Round 2 → HR Round → Leadership → Offer
```

### Phase 4D: Frontend — Kanban Board

```
Claude Code Instruction:

Build the KANBAN BOARD at /hiring-plans/[id] Pipeline tab (main view):

Use @dnd-kit/core with DndContext, useSortable, DragOverlay.

Layout: horizontal scroll container with columns.

Column per stage:
- Header: Stage name, candidate count badge, stage type icon, avg days badge (yellow if > SLA)
- Body: scrollable list of candidate cards

Candidate Card (draggable):
- Name (bold), current role @ company
- Experience badge, days-in-stage badge (green < 50% SLA, yellow 50-100%, red > 100%)
- Score badge (color-coded: green >75, yellow 50-75, red <50)
- Feedback indicator: "2/3 feedback submitted"
- Click → opens candidate detail side sheet

Drag behavior: drag card between columns → calls moveCandidate API → optimistic UI → confirmed by WebSocket

Top action bar:
- "Add Candidate" button → dialog: search existing candidates OR create new (Name, Email, Phone, Resume Upload, Source, Company, Role, Experience, Expected CTC, Notice Period). Adds to first stage.
- Filters: Status dropdown, Name search

WebSocket: Connect to /pipeline namespace, join plan room, on events → TanStack Query invalidation.

Pipeline stats bar: Total Candidates | Per-Stage Counts | Avg Time in Pipeline | Rejection Rate
```

### Phase 4E: Frontend — Candidate Detail Side Sheet

```
Claude Code Instruction:

Build Candidate Detail Side Sheet (shadcn Sheet, triggered by clicking a Kanban card):

- Header: name, email, phone, source badge
- Info: Current Role, Company, Experience, Expected CTC, Notice Period
- Stage History Timeline: vertical timeline with stage transitions, dates, durations
- Tabs: Info | Feedback (placeholder) | Score (placeholder)
- Action buttons: "Move to Next Stage" (auto-picks next), "Reject" (reason dialog), "Put on Hold", "Select" (if final stage)
```

### Sprint 4 Deliverables
- [ ] NestJS modules for pipeline, candidates, applications
- [ ] Kanban board with @dnd-kit drag-and-drop
- [ ] Candidate management (create, search, add to pipeline)
- [ ] WebSocket gateway for real-time updates
- [ ] Stage history tracking
- [ ] Candidate detail side sheet

---

## Sprint 5: Feedback Collection & AI Scoring (Weeks 9-10)

**Goal:** Structured feedback forms, skill ratings, AI summarization, candidate scoring.

### Phase 5A: Database & Backend — Feedback Module

```
Claude Code Instruction:

Build Feedback module for NestJS:

1. Prisma models:
   - InterviewFeedback: id UUID, applicationId FK, stageId FK, interviewerId FK→User, overallRating Int, recommendation Enum(STRONG_YES, YES, NEUTRAL, NO, STRONG_NO), qualitativeNotes?, strengths?, concerns?, durationMinutes Int?, isSubmitted Boolean @default(false), submittedAt?, createdAt, updatedAt
     @@unique([applicationId, stageId, interviewerId])
   - FeedbackSkillRating: id UUID, feedbackId FK, skillId FK, rating Int, notes?
     @@unique([feedbackId, skillId])
   - Run migration: npx prisma migrate dev --name add-feedback

2. FeedbackModule service:
   - createOrUpdateDraft(applicationId, userId, dto): Validate interviewer assignment, upsert feedback + bulk upsert skill ratings in transaction
   - submit(feedbackId, userId): Set isSubmitted=true, submittedAt=now(), emit notification. Check if ALL mandatory interviewers submitted → emit 'stage_feedback_complete'
   - getAllForApplication(applicationId, requestingUser): RBAC — ADMIN/HR/HM see all; INTERVIEWER sees own only. Grouped by stage.
   - getSkillMatrix(applicationId): Matrix of skills × interviewers with ratings
   - triggerAiSummary(applicationId): Collect feedback → POST /ai/summarize-feedback → store in application.aiSummary
   - triggerAiScoring(applicationId): Collect feedback → POST /ai/score-candidate with scoring weights → store in application.totalScore

   Controller:
   - POST /api/v1/applications/:appId/feedback
   - POST /api/v1/feedback/:feedbackId/submit
   - GET /api/v1/applications/:appId/feedback
   - GET /api/v1/applications/:appId/feedback/matrix
   - POST /api/v1/applications/:appId/feedback/summarize
   - POST /api/v1/applications/:appId/score
```

### Phase 5B: Python AI — Feedback Summarizer & Scorer Agents

```
Claude Code Instruction:

Build two AI agents in the Python service:

1. FeedbackSummarizerAgent (app/agents/feedback_summarizer.py):
   - POST /ai/summarize-feedback
   - Input: applicationContext (role, company, department) + all feedback per stage per interviewer with skill ratings
   - Prompt template (app/prompts/feedback_summary.j2):
     Generate: Overall Assessment, Key Strengths (evidence-backed), Areas of Concern, Skill-by-Skill Analysis, Recommendation (hire/conditional_hire/do_not_hire + confidence), Risk Factors
   - Response: FeedbackSummaryResponse (Pydantic)

2. CandidateScorerAgent (app/agents/candidate_scorer.py):
   - POST /ai/score-candidate
   - Input: feedback data + scoringWeights
   - Logic:
     a. Calculate raw weighted score (0-100): group ratings by category, average within category, apply weights (default: technical=40%, leadership=25%, behavioural=20%, communication=15%)
     b. Send to Claude for qualitative adjustment (±5 points based on strong signals in notes)
   - Response: { score, breakdown{technical,leadership,behavioural,communication}, confidence, keyFactors[] }
```

### Phase 5C: Frontend — Feedback Form

```
Claude Code Instruction:

Build Feedback Form at /feedback/[applicationId]/[stageId]:

- Header card: Candidate name, role, stage, interviewer name
- Section 1 — Skill Ratings: For each skill in stage's skillsToEvaluate:
  - Skill name + category badge (Technical=blue, Leadership=purple, Behavioural=green)
  - Rating: 1-5 selector with labels (Poor/Below Avg/Average/Good/Excellent)
  - Per-skill notes textarea (collapsible)
- Section 2 — Overall Assessment:
  - Overall Rating (1-5 stars)
  - Recommendation: radio group (Strong Yes/Yes/Neutral/No/Strong No) with colored backgrounds
  - Strengths textarea, Concerns textarea, General Notes, Duration (minutes)
- Footer: "Save Draft" (secondary), "Submit Feedback" (primary, confirmation dialog)
- Auto-save draft every 30 seconds with debounced useMutation
```

### Phase 5D: Frontend — Feedback Display & AI Score UI

```
Claude Code Instruction:

Build Feedback views in Candidate Detail Sheet (replace placeholder tabs):

1. Feedback tab:
   - Per-stage accordion sections with feedback cards per interviewer
   - Each card: name, rating stars, recommendation badge (green/yellow/red), notes preview, expandable
   - Skill Rating Matrix: table (rows=skills grouped by category, columns=interviewer@stage, cells=colored rating numbers)

2. AI Summary section:
   - No summary: "Generate AI Summary" button
   - Summary exists: card with Overall Assessment, Strengths list, Concerns list, Recommendation badge, Confidence badge, Risk Factors
   - "Regenerate" button

3. Score section:
   - No score: "Generate AI Score" button
   - Scored: large score number (color-coded), category breakdown horizontal bar chart (Recharts), confidence badge, key factors tags

4. Kanban card feedback indicators:
   - "2/3" icon showing submitted/total interviewers for current stage
   - Color: green (all submitted), yellow (partial), gray (none)
```

### Sprint 5 Deliverables
- [ ] NestJS feedback module with draft/submit workflow
- [ ] Python AI agents for summarization and scoring
- [ ] Structured feedback forms with per-skill ratings
- [ ] Skill rating matrix visualization
- [ ] AI-generated summaries and scores
- [ ] Feedback indicators on Kanban cards

---

## Sprint 6: Selection/Rejection & Communication (Weeks 11-12)

**Goal:** Decision workflow, AI communications, training module, offer management.

### Phase 6A: Backend — Decisions & Training Modules

```
Claude Code Instruction:

Add Prisma models and build two NestJS modules:

1. Models:
   - SelectionDecision: id UUID, applicationId FK @unique, decision Enum(SELECTED, REJECTED), decidedBy FK→User, decisionNotes?, approvedBy FK?, approvedAt?, offerCtc Decimal?, offerDesignation?, joiningDate?, communicationDraft?, communicationSent Boolean @default(false), communicationSentAt?, createdAt
   - TrainingModule: id UUID, orgId FK, title, contentMarkdown, category Enum(JD_FORMAT, INTERVIEWING_SKILLS, FEEDBACK_GUIDELINES, HIRING_PROCESS), isDefault Boolean, estimatedMinutes Int?, createdAt, updatedAt
   - TrainingCompletion: id UUID, userId FK, moduleId FK, completedAt, @@unique([userId, moduleId])
   - Run migration

2. DecisionsModule (src/modules/decisions/):
   - makeDecision(applicationId, userId, dto):
     Validate all stages have feedback → create decision → update application status/completedAt → if SELECTED: increment filledRoles → call POST /ai/draft-communication → store draft → emit notification
   - approveDecision, updateCommunication, markCommunicationSent
   - getTimeline(applicationId): Full timeline (applied, stage transitions, feedback events, decision, communication)
   - getTimeMetrics(hiringPlanId): Aggregate time metrics
   Controller: /api/v1/applications/:appId/decision

3. TrainingModule (src/modules/training/):
   - Seed 4 default training modules in prisma/seed.ts:
     a. "Understanding Job Descriptions"
     b. "Effective Interviewing Skills" (STAR method, bias awareness)
     c. "How to Give and Record Feedback"
     d. "Work Nucleus Hiring Process Overview"
   - CRUD for modules (admin/HR), list for users, markComplete, getProgress
   Controller: /api/v1/training-modules
```

### Phase 6B: Python AI — Communication Drafter Agent

```
Claude Code Instruction:

Build CommunicationDrafterAgent at app/agents/communication_drafter.py:

- POST /ai/draft-communication
- Input: candidate{name, email}, role, company, decision, stageReached, feedbackTone (positive/mixed/negative), offerDetails?{ctc, designation, joiningDate}
- SELECTION: congratulatory email with role details, CTC, joining date, next steps, warm professional tone
- REJECTION: respectful email, thanks for time, encourages future applications, no specific negative feedback shared
- Response: { subject: string, body: string }
```

### Phase 6C: Frontend — Decision Flow & Training

```
Claude Code Instruction:

Build decision and training UIs:

1. Decision Flow (in Candidate Detail Side Sheet):
   - "Make Decision" button when candidate is in final stage (or any stage for early rejection)
   - Modal dialog: Select (green) / Reject (red) toggle
   - If Select: Offer CTC, Designation, Joining Date
   - Decision Notes textarea
   - "Generate Communication Preview" → shows loading → renders email preview card (Subject + Body, editable)
   - "Confirm Decision" button
   - Post-decision: decision card replaces actions, "Mark as Sent" button

2. Kanban integration: virtual "Selected" (green) and "Rejected" (red) columns at end

3. Candidate Timeline component (reusable):
   - Vertical timeline: application → stage transitions → feedback events → decision → communication
   - Color-coded: green=progress, red=rejection, blue=feedback
   - Total elapsed time badge

4. Training at /(protected)/training:
   - Card grid of modules: title, category badge, estimated time, completion status
   - /training/[id]: render markdown (react-markdown + remark-gfm), "Mark as Complete" button
   - Progress bar: "X of Y modules completed"

5. "Decisions" tab in hiring plan detail:
   - Table: Candidate, Decision, Decided By, Date, Offer CTC, Communication Status
   - Filled roles progress bar in header: "{filled}/{total} roles filled"
```

### Sprint 6 Deliverables
- [ ] Decision module with approval chain
- [ ] AI communication drafter agent
- [ ] Training modules with markdown content and completion tracking
- [ ] Candidate timeline visualization
- [ ] Virtual Kanban columns for outcomes
- [ ] Time-to-hire tracking

---

## Sprint 7: Dashboard & Analytics (Weeks 13-14)

**Goal:** Comprehensive analytics dashboard, reporting, AI insights.

### Phase 7A: Backend — Analytics Module

```
Claude Code Instruction:

Create AnalyticsModule (src/modules/analytics/) with Redis-cached endpoints (TTL: 5 min):

All methods org-scoped via JWT. Use Prisma raw queries for complex aggregations.

Endpoints at /api/v1/analytics/:
1. getOverview(): active plans, open roles, filled roles, fill rate, pipeline candidates, selected/rejected counts, avg time-to-hire, 6-month trend
2. getPipelineFunnel(hiringPlanId?): per stage — entered, passed, rejected, pass-through rate, avg days
3. getTimeToHire(groupBy: role|department|quarter): avg/median/min/max days, per-stage breakdown, 12-month trend
4. getCostTracking(): per plan — budget range, avg offer CTC, total spent, remaining budget
5. getInterviewerStats(): per interviewer — total interviews, avg rating given, completion rate, avg feedback time, recommendation distribution
6. getHiringProgress(): per plan — title, roles total/filled/inPipeline, progress %, grouped by quarter
7. getSourceEffectiveness(): per source — candidates, selected, selection rate, avg score, avg time-to-hire

@Roles('ADMIN', 'HR', 'HIRING_MANAGER', 'VIEWER')

AI Insights:
- POST /api/v1/analytics/insights: fetch all analytics → send to POST /ai/dashboard-insights → return insights
```

### Phase 7B: Python AI — Insights Agent

```
Claude Code Instruction:

Create InsightsAgent at app/agents/insights_agent.py:

- POST /ai/dashboard-insights
- Input: companyName + all analytics data (overview, funnel, timeToHire, cost, interviewerStats, sourceEffectiveness)
- Prompt: "Analyze hiring analytics for {company}. Generate 5-8 actionable insights: bottleneck identification, budget efficiency, interviewer calibration, source ROI, velocity trends, process improvements. Return JSON: { insights: [{ title, description, severity: info|warning|critical, category, recommendation }] }"
- Response: InsightsResponse Pydantic model
```

### Phase 7C: Frontend — Dashboard & Charts

```
Claude Code Instruction:

Complete rebuild of /dashboard/page.tsx using Recharts:

1. Filters bar: Date Range picker, Department filter, Quarter filter — all charts respond

2. Row 1 — KPI Cards (4):
   - Active Plans (with trend), Open Roles (with fill rate %), Avg Time to Hire (trend arrow), Pipeline Candidates

3. Row 2 — Two charts:
   - Left: Pipeline Funnel — horizontal BarChart (stages × candidate counts, entered vs passed, pass-through rate labels)
   - Right: Hiring Progress — StackedBarChart per plan (filled green + remaining gray)

4. Row 3 — Two charts:
   - Left: Time to Hire Trend — LineChart (12 months, avg days, area fill)
   - Right: Budget Utilization — grouped BarChart (budget vs actual per plan, utilization % labels)

5. Row 4 — Two tables:
   - Left: Top Interviewers — Name, Interviews, Avg Response Time, Completion Rate, Avg Rating
   - Right: Source Effectiveness — Source, Candidates, Selected, Selection Rate, Avg Score

6. Row 5 — AI Insights:
   - "Generate Insights" button (sparkle icon)
   - Grid of insight cards: severity icon (blue/yellow/red), title, description, recommendation, category badge

7. Per-plan Analytics (replace placeholder Analytics tab in /hiring-plans/[id]):
   - Plan funnel chart, stage metrics table, score distribution histogram, feedback heatmap

8. CSV Export: "Export CSV" button on each section, client-side CSV generation via Blob URL

All charts responsive. Consistent shadcn theme colors. Loading skeletons.
```

### Sprint 7 Deliverables
- [ ] NestJS analytics with Redis caching and Prisma raw queries
- [ ] Executive dashboard with KPIs, funnel, progress, budget, time-to-hire charts
- [ ] Interviewer stats and source effectiveness
- [ ] AI insights agent
- [ ] Per-plan analytics
- [ ] CSV export
- [ ] Filterable, responsive dashboard

---

## Sprint 8: Admin Panel, Polish & Launch Prep (Weeks 15-16)

**Goal:** Admin panel, notifications, performance, testing, deployment.

### Phase 8A: Backend — Notifications & Audit

```
Claude Code Instruction:

Build notification and audit systems for NestJS:

1. Notifications (src/modules/notifications/):
   - Prisma model: Notification (id UUID, userId FK, orgId FK, type String, title, body, read @default(false), entityType?, entityId?, actionUrl?, createdAt)
   - Types: feedback_submitted, feedback_pending, decision_made, candidate_added, jd_approved, stage_sla_warning, plan_completed
   - Service: create, findAll (pagination, filter read/unread), getUnreadCount, markAsRead (bulk), markAllRead
   - Controller: /api/v1/notifications
   - WebSocket: emit 'notification:new' to user:{userId} room
   - Event-driven triggers via NestJS EventEmitter:
     - FeedbackService.submit → notify hiring manager
     - ApplicationsService.move → notify relevant users
     - DecisionsService.makeDecision → notify HR
   - Cron: daily SLA breach check → create stage_sla_warning notifications

2. Audit Log (src/modules/audit/):
   - Prisma model: AuditLog (id UUID, orgId FK, userId FK, action, entityType, entityId?, changes Json?, ipAddress?, userAgent?, createdAt)
   - AuditInterceptor: auto-logs all POST/PATCH/DELETE to main entities
   - Controller: GET /api/v1/admin/audit-log (admin only, paginated, filterable)

3. Org Settings (src/modules/settings/):
   - Prisma model: OrgSettings (id UUID, orgId FK @unique, settings Json)
   - Settings: scoringWeights, defaultPipelineStages, notificationPreferences, approvalWorkflowEnabled, maxInterviewRounds
   - CRUD: GET/PATCH /api/v1/admin/settings (admin only)
   - Seed defaults on org creation
```

### Phase 8B: Backend — Search, Performance, Error Handling

```
Claude Code Instruction:

Add cross-cutting concerns to NestJS backend:

1. Global Search:
   - GET /api/v1/search?q= — searches Candidates (name, email), HiringPlans (title, department), JobDescriptions (content JSON)
   - Returns max 5 results per category

2. Performance:
   - Prisma indexes: @@index on orgId (all org-scoped models), (hiringPlanId, status) on applications, (applicationId, stageId) on feedback, (createdAt) on audit/notifications
   - Migration: npx prisma migrate dev --name add-indexes
   - Redis caching: pipeline board (30s TTL, invalidate on mutation), skills taxonomy (1hr TTL)
   - ThrottlerModule: 100 req/min per user globally, 10 req/min for AI endpoints
   - Cursor-based pagination helper utility

3. Error Handling:
   - Global ExceptionFilter: { error: { code, message, details? } }
   - Handle: Prisma errors (unique→409, not found→404), validation (400), auth (401/403), throttle (429 with retry-after)
```

### Phase 8C: Admin Panel (react-admin)

```
Claude Code Instruction:

Build the Admin Panel at /admin using React + react-admin:

1. Setup: custom REST DataProvider → /api/v1/admin/*, AuthProvider using Auth0 (same Auth0 tenant, admin role required)

2. Resources:
   - Users: List (datagrid), Create (invite form), Edit (role, active toggle)
   - Skills: List (category filter, search), Create, Edit, Delete. "Bulk Import" CSV button.
   - Industries: Simple CRUD
   - Training Modules: List, Create/Edit with markdown editor + preview
   - Audit Log: Read-only list with filters (user, action, entity, date range), expandable changes JSON
   - AI Agent Logs: Read-only list (agent_type, model, tokens, latency), expandable input/output
   - Org Settings: Single-record edit form (scoring weights summing to 100, approval toggle, max rounds)
```

### Phase 8D: Frontend — Final Polish

```
Claude Code Instruction:

Polish the frontend for MVP launch:

1. Notification Center:
   - Bell icon in top bar with unread count badge
   - Popover dropdown: "Notifications" header + "Mark All Read", list with type icon/title/body/time/read status
   - Click → navigate to actionUrl
   - WebSocket: personal room, update count + prepend on new

2. Global Search:
   - shadcn Command component with Cmd+K shortcut
   - Debounced search (300ms) → /api/v1/search
   - Categorized results dropdown, click → navigate

3. Responsive Design:
   - All pages work at 1024px+
   - Kanban: horizontal scroll with indicators
   - Dashboard: cards stack 2-col tablet, 1-col mobile
   - Sidebar: collapsible to icon-only, hamburger on mobile
   - Tables: horizontal scroll on overflow

4. Loading & Error States:
   - Skeleton loaders on all data pages
   - Toast notifications for success/error/info
   - Empty states with icons + CTA text
   - React Query error boundary with retry

5. Onboarding:
   - First-time welcome dialog: platform intro
   - Quick feature highlights (5 steps)
   - Link to /training
   - localStorage flag to show once
```

### Phase 8E: Deployment

```
Claude Code Instruction:

Create production deployment setup:

1. Dockerfiles:
   - backend/Dockerfile: Node 20 alpine, npm ci, prisma generate, build, CMD node dist/main
   - ai-service/Dockerfile: Python 3.12 slim, pip install, CMD uvicorn app.main:app --host 0.0.0.0 --port 8000
   - frontend/Dockerfile: Node 20, build, next start on 3001
   - admin/Dockerfile: Node 20, build, serve static with nginx

2. docker-compose.prod.yml:
   - All services with restart: unless-stopped
   - Nginx reverse proxy: /api → backend, /ai → ai-service, /admin → admin, / → frontend. SSL termination.
   - PostgreSQL with volume, connection pool settings
   - Redis with appendonly persistence
   - Health checks on all services

3. Create .env.example with full variable reference
4. README with: prerequisites, setup steps, database migration, backup commands, monitoring/health URLs
```

### Sprint 8 Deliverables
- [ ] Admin panel with react-admin
- [ ] Real-time notification system
- [ ] Audit logging
- [ ] Global search
- [ ] Performance: caching, indexing, rate limiting, pagination
- [ ] Responsive design, loading/error/empty states
- [ ] Onboarding flow
- [ ] Production Docker deployment
- [ ] Deployment documentation

---

## RBAC Reference Matrix

| Feature | Admin | HR | Hiring Manager | Interviewer | Viewer |
|---------|-------|----|----------------|-------------|--------|
| Manage Users/Settings | Yes | No | No | No | No |
| Create Hiring Plan | Yes | Yes | Yes | No | No |
| Approve JD | Yes | Yes | Yes | No | No |
| View Kanban Board | Yes | Yes | Yes | Assigned only | Yes |
| Move Candidates | Yes | Yes | Yes | No | No |
| Submit Feedback | Yes | Yes | Yes | Own only | No |
| View All Feedback | Yes | Yes | Yes | No | No |
| View Dashboard | Yes | Yes | Yes | No | Yes |
| Trigger AI Agents | Yes | Yes | Yes | No | No |
| Select/Reject Candidate | Yes | Yes | Yes | No | No |

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API Response Time | < 200ms (p95) for CRUD, < 10s for AI |
| Concurrent Users | 100 (MVP) |
| Data Retention | Indefinite (soft deletes) |
| Uptime | 99.5% |
| Browser Support | Chrome, Firefox, Safari, Edge (latest 2) |
| Security | OWASP Top 10, encrypted at rest, HTTPS only |
| Accessibility | WCAG 2.1 AA core workflows |

---

## Execution Notes

1. **Each phase** within a sprint is designed to be a single Claude Code session/instruction
2. **Dependencies:** Phases within a sprint are sequential (A before B before C). Sprints are sequential.
3. **Testing:** After each phase, verify the feature works end-to-end before moving to the next
4. **Git:** Commit after each phase completion with descriptive messages
5. **AI Service Communication:** NestJS → Python via HTTP REST (internal Docker network). Shared API key auth.
6. **Database:** Single PostgreSQL instance shared by NestJS (Prisma) and Python (SQLAlchemy for ai_agent_logs only)
7. **Auth0 Architecture:**
   - Auth0 is the **sole** authority for: authentication, login/signup UI, password management, session management, refresh tokens, MFA, OAuth/OIDC flows
   - Our backend **never** stores passwords, issues tokens, or manages sessions
   - Backend validates Auth0-issued JWTs using JWKS (RS256) and maps `sub` claim to local User record
   - Local PostgreSQL stores: user profile (name, role, org, preferences) — linked to Auth0 via `auth0Sub` field
   - User invites: Admin creates user in Auth0 (Management API) + local DB simultaneously
   - Frontend uses `@auth0/nextjs-auth0` — Auth0 SDK handles all token lifecycle automatically

---

*Generated from mvp.md v1.1 — March 24, 2026*
