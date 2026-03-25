# HireFlow — HR Tech Platform (MVP)

## Technical & Project Documentation

**Version:** 1.1 · **Date:** March 24, 2026 · **Status:** MVP Planning

---

## 1. Executive Summary

HireFlow is an AI-powered hiring management platform that enables organizations to create structured hiring plans, generate job descriptions with AI, manage interview pipelines via Kanban boards, collect and score candidate feedback with AI agents, and visualize recruitment performance through comprehensive dashboards.

The platform targets mid-to-large organizations that need end-to-end recruitment workflow management across multiple positions, industries, and quarters — with AI automation at every step.

---

## 2. Product Requirements

### 2.1 Core Modules

| Module | Description |
|--------|-------------|
| **Hiring Plan Builder** | Create hiring plans per position and industry — define roles, target quarter, budget (CTC), benefits, hiring manager, skills, team structure |
| **AI Job Description Generator** | Generate JDs from hiring manager inputs with fitment mapping — role, designation, CTC range, skills, reporting manager, HOD, team size/levels, leadership and technical parameters |
| **Hiring Panel & Interview Pipeline** | Kanban board tracking each candidate through configurable interview rounds; assign interviewers per round; define Knowledge, Skills, and Attitude/Behavioural skills to assess per round |
| **AI Feedback Collection & Scoring** | Structured feedback capture per skill type per round; AI-generated scores from feedback; HR and hiring team visibility into all feedback |
| **Training Module** | Interviewer training content — JD format guidelines, interviewing skills, how to give and record feedback |
| **Dashboard & Analytics** | Comprehensive analytics — pipeline health, time-to-hire, cost-per-hire, pass-through rates, interviewer performance, selection/rejection analytics |
| **Admin Panel** | User management, roles & permissions, system configuration, industry/skill taxonomy management |

### 2.2 Functional Requirements

**Hiring Plan**
- Create plans scoped by position and industry
- Define: total roles, hiring quarter (Q1–Q4), budget/CTC range, benefits package, hiring manager, required skills (technical, leadership, behavioural)
- Specify: reporting manager, HOD, team size, levels, designation
- Clone and template support for repeated hiring patterns

**AI Job Description Generator**
- Accepts structured inputs from hiring manager (role, designation, CTC range, skills, team info)
- Generates professional JD with fitment mapping parameters
- Separates parameters into: Leadership Skills, Technical Skills, Behavioural/Attitude Skills
- Editable output with version history
- Industry-aware language and terminology

**Kanban Interview Pipeline**
- Configurable phases/rounds per hiring plan (e.g., Screening → Technical Round 1 → Technical Round 2 → HR → Leadership → Offer)
- Drag-and-drop candidate cards across stages
- Assign specific interviewers to each round
- Define which Knowledge, Skills, and Attitude parameters to evaluate per round
- Time-bound selection process with SLA tracking per stage
- Bulk actions (move, reject, hold)

**Feedback Collection**
- Per-round, per-skill structured feedback forms (auto-generated from JD parameters)
- Skill-type categorization: Technical, Leadership, Communication, Cultural Fit, Domain Knowledge
- Rating scale (1–5) plus qualitative notes per parameter
- AI agent summarizes feedback across rounds into candidate profile
- AI generates composite score with confidence level
- HR and hiring panel members can view all feedback with role-based visibility

**Selection & Rejection**
- Final decision workflow with approval chain
- Automated rejection/selection email drafts (AI-generated)
- Offer letter parameter pre-fill from hiring plan data
- Total time-for-recruitment tracked per candidate and per role

**Dashboard & Analytics**
- Pipeline funnel visualization (candidates per stage)
- Time-to-hire by role, department, quarter
- Cost-per-hire vs. budget tracking
- Interviewer workload and feedback completion rates
- Pass-through rates per round
- Diversity metrics (optional/configurable)
- Hiring plan progress (filled vs. open vs. in-pipeline)
- Exportable reports

### 2.3 AI Agent Automation Points

| Workflow | AI Automation |
|----------|--------------|
| JD Creation | Generate full JD from structured inputs; suggest skills based on role/industry |
| Feedback Summarization | Aggregate multi-round feedback into candidate summary |
| Candidate Scoring | Generate weighted score from feedback across all parameters |
| Interview Scheduling Suggestions | Suggest optimal panel based on availability and expertise |
| Rejection/Selection Comms | Draft personalized emails based on feedback and stage |
| Dashboard Insights | Generate natural-language insights from analytics data |
| Skill Taxonomy | Suggest relevant skills when creating hiring plans based on role + industry |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Web App      │  │  Admin Panel │  │  Mobile (Future)   │    │
│  │  (Next.js)    │  │  (React)     │  │                    │    │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘    │
└─────────┼─────────────────┼────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                API GATEWAY (Nginx)                               │
│          Auth · Rate Limiting · Routing · CORS                   │
└──────────┬────────────────────────────────┬─────────────────────┘
           │                                │
┌──────────▼──────────────────┐  ┌──────────▼──────────────────┐
│   BACKEND API (NestJS)       │  │   AI AGENT SERVICE (Python) │
│   TypeScript · Prisma ORM    │  │   FastAPI · Anthropic SDK    │
│                              │  │                              │
│  ┌──────────┐ ┌──────────┐  │  │  ┌──────────┐ ┌──────────┐ │
│  │ Hiring   │ │ Interview│  │  │  │ JD Gen   │ │ Feedback │ │
│  │ Plan     │ │ Pipeline │  │  │  │ Agent    │ │ Scoring  │ │
│  │ Module   │ │ Module   │  │  │  │          │ │ Agent    │ │
│  ├──────────┤ ├──────────┤  │  │  ├──────────┤ ├──────────┤ │
│  │ Feedback │ │ Decision │  │  │  │ Comms    │ │ Insights │ │
│  │ Module   │ │ Module   │  │  │  │ Agent    │ │ Agent    │ │
│  └──────────┘ └──────────┘  │  │  └──────────┘ └──────────┘ │
│                              │  │                              │
│  Auth · Guards · Validation  │  │  Prompt Templates · Logging  │
│  WebSockets · Event Emitter  │  │  Rate Limiting · Retry       │
└──────────┬──────────────────┘  └──────────┬──────────────────┘
           │                                │
┌──────────▼────────────────────────────────▼─────────────────────┐
│                       DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  PostgreSQL   │  │    Redis     │  │  S3 / MinIO        │    │
│  │  (Primary DB) │  │  (Cache +    │  │  (File Storage)    │    │
│  │  + pgvector   │  │   Sessions + │  │                    │    │
│  │               │  │   Pub/Sub)   │  │                    │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui | SSR for dashboard performance, great DX, component library |
| **Kanban** | @dnd-kit/core (drag-and-drop) | Accessible, performant, React-native DnD |
| **State Management** | Zustand + TanStack Query (React Query) | Lightweight global state + server state caching |
| **Backend API** | NestJS 10 (TypeScript), Prisma ORM, class-validator | Modular architecture, decorators, DI, type-safe DB queries |
| **AI Agent Service** | Python 3.12, FastAPI, Anthropic Python SDK, Pydantic | Best AI/ML ecosystem, native Claude SDK, fast async API |
| **Database** | PostgreSQL 16 + pgvector | Relational data + vector embeddings for AI features |
| **Cache** | Redis 7 | Session management, rate limiting, real-time pub/sub |
| **AI Model** | Anthropic Claude API (claude-sonnet-4-20250514) | JD generation, feedback analysis, scoring, insights |
| **Auth** | Passport.js (JWT strategy) + CASL (RBAC) | NestJS-native auth with fine-grained permissions |
| **File Storage** | AWS S3 / MinIO (local dev) | Resumes, JD exports, reports |
| **Inter-Service Comm** | HTTP (REST) via NestJS HttpModule | Simple sync calls from NestJS → Python AI service |
| **Real-time** | NestJS WebSocket Gateway (Socket.IO) | Kanban live updates, notifications |
| **Deployment** | Docker + Docker Compose (MVP) | Simple deployment for MVP; Kubernetes later |
| **Admin Panel** | React + react-admin | Rapid admin CRUD UI |

### 3.3 Service Communication

```
NestJS Backend (port 3000)  ──HTTP──▶  Python AI Service (port 8000)
       │                                        │
       │  POST /ai/generate-jd                  │  Calls Claude API
       │  POST /ai/summarize-feedback            │  Returns structured JSON
       │  POST /ai/score-candidate               │  Logs to ai_agent_logs
       │  POST /ai/draft-communication           │
       │  POST /ai/dashboard-insights            │
       │  POST /ai/suggest-skills                │
       │                                        │
       ▼                                        ▼
   PostgreSQL (shared database — Prisma from NestJS, SQLAlchemy from Python)
```

The NestJS backend owns all business logic and CRUD operations. When AI is needed, it sends a request to the Python AI service with the relevant data. The Python service calls Claude, processes the response, logs the interaction, and returns structured results.

### 3.4 Database Schema (Core Tables)

```sql
-- Organizations & Users
organizations (id, name, industry, created_at)
users (id, org_id, email, name, role, avatar_url, created_at)
-- role ENUM: 'admin', 'hr', 'hiring_manager', 'interviewer', 'viewer'

-- Hiring Plans
hiring_plans (
  id, org_id, title, industry, department, quarter, year,
  total_roles, filled_roles, status, -- 'draft','active','completed','cancelled'
  budget_min, budget_max, currency, benefits_json,
  hiring_manager_id, reporting_manager_name, hod_name,
  team_size, team_levels, designation,
  created_by, created_at, updated_at
)

-- Skills Taxonomy
skills (id, name, category, industry, created_at)
-- category ENUM: 'technical', 'leadership', 'behavioural', 'communication', 'domain'

hiring_plan_skills (id, hiring_plan_id, skill_id, priority, min_proficiency)

-- Job Descriptions
job_descriptions (
  id, hiring_plan_id, version, content_json, -- structured JD
  fitment_mapping_json, -- role, designation, CTC, skills matrix
  parameters_json, -- leadership, tech, behavioural params for evaluation
  generated_by_ai, ai_prompt_used,
  status, -- 'draft', 'approved', 'published'
  created_by, approved_by, created_at
)

-- Interview Pipeline Configuration
pipeline_stages (
  id, hiring_plan_id, name, stage_order, stage_type,
  -- stage_type: 'screening','technical','hr','leadership','offer'
  max_duration_days, -- SLA for this stage
  skills_to_evaluate_json, -- which skills/params to check this round
  created_at
)

pipeline_stage_interviewers (id, stage_id, user_id, is_mandatory)

-- Candidates
candidates (
  id, org_id, name, email, phone, resume_url,
  source, -- 'referral','job_board','direct','agency'
  current_company, current_role, experience_years,
  expected_ctc, notice_period_days,
  created_at
)

-- Candidate Pipeline (Kanban state)
candidate_applications (
  id, candidate_id, hiring_plan_id, current_stage_id,
  status, -- 'active','selected','rejected','on_hold','withdrawn'
  applied_at, stage_entered_at, completed_at,
  rejection_reason, selection_notes,
  total_score, ai_summary,
  created_at, updated_at
)

-- Feedback
interview_feedback (
  id, application_id, stage_id, interviewer_id,
  overall_rating, -- 1-5
  recommendation, -- 'strong_yes','yes','neutral','no','strong_no'
  qualitative_notes,
  duration_minutes,
  submitted_at
)

feedback_skill_ratings (
  id, feedback_id, skill_id, rating, -- 1-5
  notes
)

-- AI Agent Logs
ai_agent_logs (
  id, org_id, agent_type, -- 'jd_generation','feedback_summary','scoring','comms'
  input_json, output_json, model_used,
  tokens_used, latency_ms,
  created_at
)

-- Notifications
notifications (
  id, user_id, type, title, body, read, entity_type, entity_id, created_at
)
```

---

## 4. API Design (Key Endpoints)

### 4.1 Hiring Plans (NestJS)

```
POST   /api/v1/hiring-plans                    Create hiring plan
GET    /api/v1/hiring-plans                    List plans (filters: quarter, status, department)
GET    /api/v1/hiring-plans/:id                Get plan details
PATCH  /api/v1/hiring-plans/:id                Update plan
DELETE /api/v1/hiring-plans/:id                Soft delete
POST   /api/v1/hiring-plans/:id/clone          Clone plan as template
```

### 4.2 Job Descriptions (NestJS → Python AI)

```
POST   /api/v1/hiring-plans/:id/jd/generate    AI-generate JD (proxied to Python service)
GET    /api/v1/hiring-plans/:id/jd              Get current JD (latest version)
PATCH  /api/v1/hiring-plans/:id/jd              Update/edit JD
POST   /api/v1/hiring-plans/:id/jd/approve      Approve JD
GET    /api/v1/hiring-plans/:id/jd/versions     Version history
```

### 4.3 Pipeline & Kanban (NestJS)

```
GET    /api/v1/hiring-plans/:id/pipeline        Get Kanban board (all stages + candidates)
POST   /api/v1/hiring-plans/:id/pipeline/stages Configure stages
PATCH  /api/v1/pipeline/stages/:id              Update stage config
POST   /api/v1/applications                     Add candidate to pipeline
PATCH  /api/v1/applications/:id/move            Move candidate to stage (Kanban drag)
PATCH  /api/v1/applications/:id/status          Update status (select/reject/hold)
GET    /api/v1/applications/:id                 Candidate application detail
```

### 4.4 Feedback (NestJS → Python AI for summaries)

```
POST   /api/v1/applications/:id/feedback         Submit feedback for a round
GET    /api/v1/applications/:id/feedback          Get all feedback for candidate
GET    /api/v1/applications/:id/feedback/summary  AI-generated feedback summary
POST   /api/v1/applications/:id/score             Trigger AI scoring
```

### 4.5 AI Agent Service (Python FastAPI — internal, called by NestJS)

```
POST   /ai/generate-jd                   Generate JD from hiring plan data
POST   /ai/summarize-feedback             Summarize candidate feedback
POST   /ai/score-candidate                Score candidate from feedback
POST   /ai/suggest-skills                 Suggest skills for role+industry
POST   /ai/draft-communication            Draft selection/rejection email
POST   /ai/dashboard-insights             Generate insights from analytics
GET    /ai/health                         Health check
```

### 4.6 Dashboard & Analytics (NestJS)

```
GET    /api/v1/analytics/pipeline-funnel         Pipeline funnel by plan
GET    /api/v1/analytics/time-to-hire            Time metrics
GET    /api/v1/analytics/cost-tracking           Budget vs actuals
GET    /api/v1/analytics/interviewer-stats        Interviewer performance
GET    /api/v1/analytics/hiring-progress          Plan completion tracking
GET    /api/v1/analytics/overview                 Executive summary
```

### 4.7 Admin (NestJS)

```
GET/POST/PATCH/DELETE  /api/v1/admin/users          User CRUD
GET/POST/PATCH/DELETE  /api/v1/admin/skills          Skill taxonomy CRUD
GET/POST/PATCH/DELETE  /api/v1/admin/industries       Industry management
GET                    /api/v1/admin/audit-log        Audit trail
PATCH                  /api/v1/admin/settings          System settings
```

---

## 5. AI Agent Architecture (Python Service)

### 5.1 Service Structure

```
/ai-service
├── app/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Settings (Pydantic BaseSettings)
│   ├── models/                  # Pydantic request/response models
│   │   ├── jd.py
│   │   ├── feedback.py
│   │   ├── scoring.py
│   │   └── communication.py
│   ├── agents/                  # AI agent implementations
│   │   ├── base_agent.py        # Base class with Claude client, retry, logging
│   │   ├── jd_generator.py      # JD generation agent
│   │   ├── feedback_summarizer.py
│   │   ├── candidate_scorer.py
│   │   ├── communication_drafter.py
│   │   ├── insights_agent.py
│   │   └── skill_suggester.py
│   ├── prompts/                 # Prompt templates (Jinja2)
│   │   ├── jd_system.j2
│   │   ├── feedback_summary.j2
│   │   ├── scoring.j2
│   │   └── communication.j2
│   ├── services/
│   │   └── db.py                # SQLAlchemy async for ai_agent_logs
│   └── middleware/
│       ├── rate_limiter.py
│       └── api_key_auth.py      # Internal API key auth (NestJS → Python)
├── requirements.txt
├── Dockerfile
└── tests/
```

Each agent inherits from `BaseAgent` which handles: Claude API client initialization via the Anthropic Python SDK, retry with exponential backoff (3 attempts), structured JSON parsing from responses, token tracking, latency measurement, and logging to `ai_agent_logs` table.

### 5.2 Agent: JD Generator

**Input:** Hiring plan fields (role, designation, industry, skills, CTC range, team info, reporting structure)

**System Prompt Structure:**
```
You are an expert HR Job Description writer. Generate a professional job description
for the following position. The JD must include:

1. Job Title and Designation
2. Department and Reporting Structure
3. Role Summary (2-3 paragraphs)
4. Key Responsibilities (8-12 bullet points)
5. Required Qualifications
6. Fitment Mapping:
   - Technical Skills (with proficiency levels)
   - Leadership Skills (with expected indicators)
   - Behavioural/Attitude Skills (with assessment criteria)
7. Compensation Range and Benefits
8. Team Structure Context

Industry: {industry}
Role: {role}
...

Respond ONLY in the following JSON structure: { ... }
```

**Output:** Structured JSON with all JD sections + evaluation parameter matrix.

### 5.3 Agent: Feedback Summarizer & Scorer

**Input:** All feedback records for a candidate application across all rounds.

**Scoring Logic:**
- Weighted average across skill categories (weights configurable per hiring plan)
- Technical Skills: 40% (default)
- Leadership Skills: 25%
- Behavioural Skills: 20%
- Communication: 15%
- AI generates composite score (0–100) with confidence rating
- Flags any red flags or standout strengths from qualitative notes

### 5.4 Agent: Communication Drafter

**Input:** Candidate data, final decision, feedback summary, hiring plan context.

**Output:** Personalized email draft for selection or rejection, appropriate to the stage and context.

---

## 6. Role-Based Access Control (RBAC)

Implemented using **CASL** in NestJS with Passport.js JWT guards.

| Feature | Admin | HR | Hiring Manager | Interviewer | Viewer |
|---------|-------|----|----------------|-------------|--------|
| Manage Users/Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Hiring Plan | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve JD | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Kanban Board | ✅ | ✅ | ✅ | ✅ (assigned) | ✅ |
| Move Candidates | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit Feedback | ✅ | ✅ | ✅ | ✅ (own) | ❌ |
| View All Feedback | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ❌ | ✅ |
| Trigger AI Agents | ✅ | ✅ | ✅ | ❌ | ❌ |
| Select/Reject Candidate | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 7. Implementation Phases — Sprint Plan

Each sprint is **2 weeks**. Total MVP: **8 sprints (16 weeks)**.

---

### Sprint 1: Project Foundation & Auth (Weeks 1–2)

**Goal:** Monorepo setup, database, authentication, user management, basic CI.

**Claude Code Instruction:**

```
Set up a full-stack monorepo for an HR tech platform called "HireFlow" with the following structure:

/hireflow
├── /backend           # NestJS 10 backend (TypeScript)
├── /ai-service        # Python FastAPI AI agent service
├── /frontend          # Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
├── /admin             # React admin panel (react-admin)
├── /shared            # Shared TypeScript types, constants
├── /infra             # Docker Compose, nginx config
└── /docs              # Documentation

BACKEND (NestJS):
1. Initialize NestJS project with: nest new backend --strict
2. Install and configure:
   - Prisma ORM: npx prisma init. Set provider to "postgresql" in schema.prisma.
   - Passport.js + @nestjs/passport + passport-jwt for JWT authentication
   - @nestjs/config for environment variables
   - class-validator + class-transformer for DTO validation
   - @nestjs/swagger for auto-generated API docs
   - @nestjs/cache-manager + cache-manager-redis-store for Redis caching
   - @nestjs/websockets + @nestjs/platform-socket.io for real-time
3. Create Prisma schema with these models:
   - Organization (id UUID @default(uuid()), name String, industry String, createdAt DateTime, updatedAt DateTime)
   - User (id UUID, orgId FK→Organization, email String @unique, passwordHash String, name String, role Enum(ADMIN, HR, HIRING_MANAGER, INTERVIEWER, VIEWER), avatarUrl String?, isActive Boolean @default(true), createdAt, updatedAt)
   - Run: npx prisma migrate dev --name init
4. Create NestJS modules:
   - AuthModule:
     - POST /api/v1/auth/register — Creates org + first admin user. Accepts: orgName, industry, name, email, password. Hash password with bcrypt. Return JWT.
     - POST /api/v1/auth/login — Validate credentials, return JWT with payload: { sub: userId, orgId, role, email }
     - POST /api/v1/auth/refresh — Refresh token
     - GET /api/v1/auth/me — Return current user profile
     - Implement JwtStrategy (passport-jwt) that validates token and attaches user to request
     - Implement JwtAuthGuard as global guard
     - Implement RolesGuard decorator: @Roles('admin', 'hr') that checks req.user.role
   - UsersModule (admin-only):
     - CRUD /api/v1/admin/users — List (with pagination, filter by role), Create (invite user to org), Update (change role, toggle isActive), Delete (soft: set isActive=false)
     - Use Prisma for all queries
5. Add global pipes: ValidationPipe (whitelist, transform), LoggingInterceptor
6. Add CORS configuration, health check endpoint: GET /api/v1/health
7. Swagger setup at /api/docs

AI SERVICE (Python FastAPI):
1. Initialize Python project with FastAPI:
   - Create app/main.py with FastAPI app
   - Create app/config.py using pydantic-settings BaseSettings (reads ANTHROPIC_API_KEY, DATABASE_URL, INTERNAL_API_KEY, PORT from env)
   - Create app/middleware/api_key_auth.py — dependency that checks X-Internal-API-Key header (shared secret between NestJS and Python)
   - Create app/agents/base_agent.py:
     - Initialize Anthropic client using anthropic Python SDK
     - Method: async call_claude(system_prompt, user_prompt, max_tokens=4096) → dict
     - Includes retry (3 attempts, exponential backoff), timeout (30s)
     - Logs every call to ai_agent_logs table via SQLAlchemy
     - Tracks: input_json, output_json, model_used, tokens_input, tokens_output, latency_ms
   - Create app/services/db.py — async SQLAlchemy engine + session for ai_agent_logs table
   - GET /ai/health endpoint
2. requirements.txt: fastapi, uvicorn, anthropic, pydantic, pydantic-settings, sqlalchemy[asyncio], asyncpg, jinja2, tenacity

FRONTEND (Next.js 14):
1. Initialize: npx create-next-app@latest frontend --typescript --tailwind --app --src-dir
2. Install shadcn/ui: npx shadcn-ui@latest init. Add components: button, input, card, table, badge, dropdown-menu, dialog, toast, avatar, tabs, form, select
3. Create auth pages: /login, /register with forms using react-hook-form + zod
4. Create AuthProvider context: stores JWT in httpOnly cookie (via API route handler), provides user object, login/logout/refresh methods
5. Create ProtectedLayout wrapper in /app/(protected)/layout.tsx — redirects to /login if no valid session
6. Create app shell layout inside protected area:
   - Sidebar: Logo, navigation links (Dashboard, Hiring Plans, Candidates, Training, Admin), user role-based visibility for menu items
   - Top bar: global search placeholder, notification bell placeholder, user avatar + dropdown (Profile, Settings, Logout)
7. Create /admin/users page: data table with columns (Name, Email, Role, Status, Actions), create/edit user dialogs

DOCKER COMPOSE (docker-compose.yml):
1. postgres:16 with volume mount, POSTGRES_DB=hireflow, POSTGRES_USER, POSTGRES_PASSWORD
2. redis:7 with volume mount
3. backend service: build from ./backend, port 3000, depends_on postgres+redis, env vars for DB, Redis, JWT_SECRET, AI_SERVICE_URL=http://ai-service:8000
4. ai-service: build from ./ai-service, port 8000, depends_on postgres, env vars for ANTHROPIC_API_KEY, DATABASE_URL, INTERNAL_API_KEY
5. frontend: build from ./frontend, port 3001, env NEXT_PUBLIC_API_URL=http://localhost:3000

Create .env.example with all required variables.
Create Makefile with targets: dev (docker-compose up), build, prisma-migrate, prisma-studio, test-backend, test-ai, lint.
```

**Deliverables:**
- Running monorepo with NestJS backend, Python AI service, Next.js frontend, Docker Compose
- JWT authentication with role-based guards
- User management (Admin panel)
- Database with Prisma migrations
- Basic app shell with protected routing
- Python AI service skeleton with Claude client

---

### Sprint 2: Hiring Plan Builder (Weeks 3–4)

**Goal:** Full hiring plan CRUD, skills taxonomy, plan templates.

**Claude Code Instruction:**

```
Build the Hiring Plan module for HireFlow. This is the core entity that everything else connects to.

BACKEND (NestJS — src/modules/hiring-plans/):
1. Add Prisma schema models:
   - Skill (id UUID, name String, category Enum(TECHNICAL, LEADERSHIP, BEHAVIOURAL, COMMUNICATION, DOMAIN), industry String?, isGlobal Boolean @default(false), createdAt)
   - HiringPlan (id UUID, orgId FK→Organization, title String, industry String, department String, quarter Int, year Int, totalRoles Int, filledRoles Int @default(0), status Enum(DRAFT, ACTIVE, COMPLETED, CANCELLED), budgetMin Decimal, budgetMax Decimal, currency String @default("INR"), benefits Json, hiringManagerId FK→User, reportingManagerName String, hodName String, teamSize Int?, teamLevels String?, designation String, notes String?, createdBy FK→User, createdAt, updatedAt)
   - HiringPlanSkill (id UUID, hiringPlanId FK, skillId FK, priority Enum(MUST_HAVE, NICE_TO_HAVE), minProficiency Int, @@unique([hiringPlanId, skillId]))
   - Run migration: npx prisma migrate dev --name add-hiring-plans
   - Create a seed script (prisma/seed.ts) that inserts 100+ skills across categories and industries (software engineering, finance, healthcare, manufacturing, retail, marketing). Run with: npx prisma db seed

2. Create HiringPlansModule with:
   - DTOs (class-validator):
     - CreateHiringPlanDto: title (IsString, MinLength 3), industry (IsString), department (IsString), quarter (IsInt, Min 1, Max 4), year (IsInt), totalRoles (IsInt, Min 1), budgetMin (IsNumber), budgetMax (IsNumber), currency (IsString, default 'INR'), benefits (IsArray of strings), hiringManagerId (IsUUID), reportingManagerName, hodName, teamSize (IsInt, optional), teamLevels (optional), designation (IsString), skills (IsArray of { skillId: UUID, priority: MUST_HAVE|NICE_TO_HAVE, minProficiency: 1-5 })
     - UpdateHiringPlanDto: PartialType(CreateHiringPlanDto)
     - QueryHiringPlansDto: status?, quarter?, year?, department?, hiringManagerId?, page, limit, sortBy, sortOrder
   - Service (HiringPlansService):
     - create(): Creates hiring plan + bulk creates HiringPlanSkill records in a Prisma transaction
     - findAll(): List with filters, pagination, includes skill names and hiring manager name via Prisma includes
     - findOne(): Full detail with skills, hiring manager, creator info
     - update(): Updates plan + upserts skills. Cannot change orgId. Uses Prisma transaction.
     - remove(): Soft delete (status = CANCELLED)
     - clone(): Deep copies plan with skills, resets filledRoles to 0, status to DRAFT, appends "(Copy)" to title
   - Controller: All endpoints under /api/v1/hiring-plans, protected by JwtAuthGuard, role-checked with @Roles('ADMIN', 'HR', 'HIRING_MANAGER')

3. Create SkillsModule:
   - Admin CRUD: /api/v1/admin/skills (admin only)
   - Search endpoint: GET /api/v1/skills/search?q=&category=&industry= — available to all authenticated users. Uses Prisma `contains` for search.

FRONTEND:
1. Create Hiring Plans list page at /(protected)/hiring-plans/page.tsx:
   - Use TanStack Query for data fetching (useQuery with /api/v1/hiring-plans)
   - Data table (shadcn DataTable) with columns: Title, Industry, Department, Quarter+Year, Roles (filledRoles/totalRoles with progress bar), Budget Range (formatted currency), Status (colored badge), Hiring Manager name, Actions dropdown (View, Edit, Clone, Delete)
   - Filter bar above table: Status dropdown (shadcn Select), Quarter dropdown, Department text input. Filters update query params and refetch.
   - "Create New Plan" button (top right) → navigates to /hiring-plans/new
   - Empty state: illustration + "Create your first hiring plan" CTA

2. Create Hiring Plan form at /hiring-plans/new/page.tsx and /hiring-plans/[id]/edit/page.tsx:
   - Multi-step form using react-hook-form + zod schema validation:
     Step 1 - Basic Info: Title, Industry (select from predefined list), Department, Designation, Quarter (Q1-Q4 select), Year (number input, default current)
     Step 2 - Team Structure: Total Roles (number), Reporting Manager Name, HOD Name, Team Size, Team Levels (textarea), Hiring Manager (async select that searches /api/v1/admin/users with role filter)
     Step 3 - Compensation: Budget Min, Budget Max, Currency (select: INR, USD, EUR, GBP), Benefits (tag input — type and press Enter to add, click X to remove)
     Step 4 - Skills: Searchable skill picker — search bar calls /api/v1/skills/search, click to add skill. For each added skill, show: name, category badge, Priority toggle (Must Have / Nice to Have), Proficiency slider (1-5 with labels). Remove button per skill.
     Step 5 - Review & Submit: Read-only summary of all steps. "Create Plan" / "Update Plan" button.
   - Step navigation: Previous / Next buttons, step indicator at top, validation per step before allowing next.
   - Use useMutation (TanStack Query) for create/update with optimistic updates.

3. Create Hiring Plan detail page at /hiring-plans/[id]/page.tsx:
   - Header: Plan title, status badge (color-coded), "Quarter Q{n} {year}", budget range, "Edit" button
   - Tab component (shadcn Tabs): Overview | Job Description | Pipeline | Feedback | Analytics
   - Overview tab: Card sections — Basic Info, Team Structure, Compensation & Benefits, Required Skills (grouped by category with proficiency badges)
   - Other tabs: placeholder "Coming Soon" state (will be built in later sprints)
   - Back button to /hiring-plans

4. Add to main dashboard (/dashboard):
   - Stats row: 4 cards using shadcn Card — Total Active Plans, Total Open Roles, Roles Filled This Quarter, Avg Budget Range
   - Fetch from a new lightweight GET /api/v1/hiring-plans/stats endpoint (returns aggregated counts)
```

**Deliverables:**
- Complete hiring plan CRUD with NestJS modules, DTOs, Prisma queries
- Skills taxonomy with 100+ seed data entries
- Multi-step creation form with validation
- Plan list, detail, edit, clone functionality
- Dashboard summary cards

---

### Sprint 3: AI Job Description Generator (Weeks 5–6)

**Goal:** AI-powered JD generation, JD versioning, approval workflow.

**Claude Code Instruction:**

```
Build the AI Job Description Generator module for HireFlow. NestJS handles the API; Python service generates JDs via Claude.

BACKEND (NestJS — src/modules/job-descriptions/):
1. Add Prisma schema models:
   - JobDescription (id UUID, hiringPlanId FK→HiringPlan, version Int @default(1), content Json, fitmentMapping Json, evaluationParameters Json, generatedByAi Boolean @default(false), aiPromptUsed String?, status Enum(DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED), createdBy FK→User, approvedBy FK→User?, approvedAt DateTime?, createdAt, updatedAt)
   - content Json structure: { title, summary, responsibilities: string[], qualifications: { required: string[], preferred: string[] }, aboutCompany, workMode }
   - fitmentMapping Json: { role, designation, ctcRange: {min, max, currency}, reportingTo, hod, teamSize, teamLevels, industry }
   - evaluationParameters Json: { technicalSkills: [{name, proficiencyExpected, assessmentCriteria}], leadershipSkills: [{name, indicators}], behaviouralSkills: [{name, assessmentCriteria}] }
   - Run migration: npx prisma migrate dev --name add-job-descriptions

2. Create JobDescriptionsModule:
   - DTOs:
     - GenerateJdDto: additionalContext? (IsString, optional)
     - UpdateJdDto: content?, fitmentMapping?, evaluationParameters? (partial updates)
   - Service (JobDescriptionsService):
     - generate(hiringPlanId, userId, additionalContext?):
       1. Fetch hiring plan with all skills and relations from Prisma
       2. Call Python AI service via NestJS HttpModule: POST http://ai-service:8000/ai/generate-jd with body: { hiringPlan: serialized plan data, skills: categorized skills, additionalContext }
       3. Parse response, create new JobDescription record with version incremented, generatedByAi=true
       4. Return the created JD
     - findLatest(hiringPlanId): Get latest version (prefer approved, fallback to latest draft)
     - update(jdId, dto): Manual edit, sets generatedByAi=false
     - approve(jdId, userId): Set status=APPROVED, approvedBy, approvedAt
     - listVersions(hiringPlanId): All versions ordered by version desc
   - Controller: Under /api/v1/hiring-plans/:planId/jd/*, guarded by @Roles('ADMIN','HR','HIRING_MANAGER')
   - Register HttpModule in the module for calling Python service. Use ConfigService to get AI_SERVICE_URL.

AI SERVICE (Python — app/agents/jd_generator.py):
1. Create JD generation endpoint in app/main.py:
   - POST /ai/generate-jd
   - Request model (Pydantic): GenerateJdRequest with hiringPlan (dict), skills (list), additionalContext (str|None)
   - Response model: GenerateJdResponse with content, fitmentMapping, evaluationParameters

2. Create JdGeneratorAgent (extends BaseAgent):
   - Load system prompt from app/prompts/jd_system.j2 (Jinja2 template)
   - Template includes: industry context, role details, skill categories, team structure, CTC range
   - System prompt instructs Claude to return ONLY valid JSON matching the JD schema
   - Model: claude-sonnet-4-20250514, max_tokens=4096
   - Parse JSON response, validate against Pydantic response model
   - If parsing fails, retry once with a "fix your JSON" follow-up message
   - Log to ai_agent_logs: agent_type='jd_generation', input/output, tokens, latency

3. Create the Jinja2 prompt template (app/prompts/jd_system.j2):
   - Detailed instructions for generating a professional JD
   - Includes all hiring plan fields as template variables
   - Specifies exact JSON output schema with examples
   - Instructs to generate evaluation parameters categorized by: Technical, Leadership, Behavioural

FRONTEND:
1. Build JD tab inside /hiring-plans/[id] detail page (replace the placeholder):
   - State: "no JD exists" → Show hero section with "Generate Job Description with AI" button + optional "Additional context or instructions" textarea
   - Loading state: Animated skeleton with pulsing sections while AI generates (show "AI is crafting your job description..." message)
   - JD Display view (when JD exists):
     - Job title as large heading
     - Status badge (Draft/Pending/Approved/Published) top-right
     - "Summary" section: rendered paragraph
     - "Key Responsibilities" section: styled ordered list
     - "Required Qualifications" and "Preferred Qualifications" as separate card sections
     - "Fitment Mapping" card: grid displaying Role, Designation, CTC Range, Reporting To, HOD, Team Size — using shadcn description lists
     - "Evaluation Parameters" section with 3 columns using shadcn cards:
       Column 1: Technical Skills — each as a card with name, proficiency level bar (1-5), assessment criteria text
       Column 2: Leadership Skills — name + indicators list
       Column 3: Behavioural Skills — name + assessment criteria
   - Edit Mode: Toggle button "Edit JD" → all sections become editable (use controlled inputs/textareas). "Save" and "Cancel" buttons.
   - Version dropdown (top-right): Select from previous versions, shows version number + date + "AI Generated"/"Manually Edited" badge. Selecting loads that version in read-only mode with "Restore This Version" button.
   - Actions bar: "Approve" button (for HR/hiring_manager, shows only if status=DRAFT), "Regenerate with AI" (creates new version), "Export as PDF" (stretch)
   - After approval: shows "Approved by {name} on {date}" banner

2. Add JD status badge to hiring plan list view (new column) and detail page header.
```

**Deliverables:**
- NestJS module calling Python AI service for JD generation
- Python agent with Jinja2 prompt templates and Claude SDK integration
- Structured JD with fitment mapping and evaluation parameters
- JD versioning and approval workflow
- Beautiful JD display with edit capability
- AI agent logging

---

### Sprint 4: Kanban Interview Pipeline (Weeks 7–8)

**Goal:** Configurable interview stages, candidate management, drag-and-drop Kanban board.

**Claude Code Instruction:**

```
Build the Kanban Interview Pipeline for HireFlow. This is the central workflow tracking system.

BACKEND (NestJS):
1. Add Prisma schema models:
   - PipelineStage (id UUID, hiringPlanId FK, name String, stageOrder Int, stageType Enum(SCREENING, TECHNICAL, HR, LEADERSHIP, CULTURAL, OFFER, CUSTOM), maxDurationDays Int?, skillsToEvaluate Json — array of skill IDs, description String?, createdAt, updatedAt)
   - PipelineStageInterviewer (id UUID, stageId FK→PipelineStage, userId FK→User, isMandatory Boolean @default(false), @@unique([stageId, userId]))
   - Candidate (id UUID, orgId FK, name String, email String, phone String?, resumeUrl String?, source Enum(REFERRAL, JOB_BOARD, DIRECT, AGENCY, INTERNAL), currentCompany String?, currentRole String?, experienceYears Decimal?, expectedCtc Decimal?, noticePeriodDays Int?, notes String?, createdAt, updatedAt, @@unique([orgId, email]))
   - CandidateApplication (id UUID, candidateId FK, hiringPlanId FK, currentStageId FK→PipelineStage?, status Enum(ACTIVE, SELECTED, REJECTED, ON_HOLD, WITHDRAWN), appliedAt DateTime, stageEnteredAt DateTime, completedAt DateTime?, rejectionReason String?, selectionNotes String?, totalScore Decimal?, aiSummary String?, createdAt, updatedAt, @@unique([candidateId, hiringPlanId]))
   - CandidateStageHistory (id UUID, applicationId FK, stageId FK, enteredAt DateTime, exitedAt DateTime?, outcome Enum(PASSED, REJECTED, SKIPPED)?)
   - Run migration: npx prisma migrate dev --name add-pipeline-candidates

2. Create PipelineModule (src/modules/pipeline/):
   - DTOs: CreateStageDto, UpdateStageDto, ReorderStagesDto (array of {stageId, newOrder}), AssignInterviewerDto
   - Service (PipelineService):
     - createStage(): Create with interviewers in transaction. Auto-reorder if order conflicts.
     - getStages(): List all stages with interviewer details (User name, email) and skill names (joined from Skill table)
     - updateStage(): Update config, reassign interviewers
     - deleteStage(): Only if no active candidates in this stage (check CandidateApplication.currentStageId)
     - reorderStages(): Bulk update stageOrder in transaction
   - Controller: /api/v1/hiring-plans/:planId/stages

3. Create CandidatesModule (src/modules/candidates/):
   - CRUD: POST, GET (search with Prisma `contains` on name/email, filter by source), GET by id (with all applications), PATCH
   - Controller: /api/v1/candidates

4. Create ApplicationsModule (src/modules/applications/):
   - Service (ApplicationsService):
     - addToPipeline(candidateId, hiringPlanId): Creates application with currentStageId = first stage (lowest stageOrder), status=ACTIVE, records first CandidateStageHistory entry
     - getKanbanBoard(hiringPlanId): THE KANBAN QUERY. Returns:
       { stages: [{ id, name, stageOrder, stageType, candidateCount, avgDaysInStage, candidates: [{ applicationId, candidateName, candidateEmail, currentRole, experienceYears, status, stageEnteredAt, daysInStage (computed), totalScore, feedbackCount (count of submitted feedback for this stage) }] }] }
       Use Prisma raw query or nested includes. Sort candidates within stage by stageEnteredAt.
     - moveCandidate(applicationId, targetStageId): In a transaction: validate target stage belongs to same plan, update CandidateStageHistory (set exitedAt on current, create new entry for target), update application.currentStageId and stageEnteredAt. Return updated application.
     - updateStatus(applicationId, status, reason?): If SELECTED → increment HiringPlan.filledRoles. If REJECTED → record rejectionReason.
     - getDetail(applicationId): Full application with candidate info, current stage, all stage history timeline
   - Controller: /api/v1/applications, /api/v1/hiring-plans/:planId/pipeline, /api/v1/hiring-plans/:planId/applications

5. Create WebSocket Gateway (src/modules/pipeline/pipeline.gateway.ts):
   - @WebSocketGateway with namespace '/pipeline'
   - Clients join a room per hiringPlanId: socket.join(`plan:${planId}`)
   - Emit events on: candidate moved (candidate:moved), status changed (candidate:statusChanged), candidate added (candidate:added)
   - ApplicationsService emits events via gateway after mutations

FRONTEND:
1. Pipeline Configuration UI (new sub-tab "Setup" inside hiring plan Pipeline tab):
   - Vertical list of stages, drag to reorder (use @dnd-kit/sortable)
   - Each stage row: drag handle | stage name | type badge | max duration | interviewer count | edit/delete icons
   - "Add Stage" button: opens dialog with form — Name, Type (dropdown of SCREENING/TECHNICAL/HR/LEADERSHIP/CULTURAL/OFFER/CUSTOM), Max Duration (days), Description
   - Edit stage dialog: same fields + "Assign Interviewers" multi-select (async search users with role INTERVIEWER or HIRING_MANAGER) + "Skills to Evaluate" (select from hiring plan's skills)
   - Default template button: "Use Default Template" → creates standard stages: Screening → Technical Round 1 → Technical Round 2 → HR Round → Leadership → Offer

2. KANBAN BOARD (/hiring-plans/[id] Pipeline tab — main view):
   - Use @dnd-kit/core with DndContext, useSortable, DragOverlay
   - Layout: horizontal scroll container with columns
   - Column per stage:
     - Header: Stage name, candidate count badge, stage type icon, avg days badge (yellow if > SLA)
     - Body: scrollable list of candidate cards
   - Candidate Card (draggable):
     - Candidate name (bold), current role @ company
     - Experience badge, days-in-stage badge (green < 50% SLA, yellow 50-100%, red > 100% SLA)
     - Score badge (if scored, color-coded: green >75, yellow 50-75, red <50)
     - Small feedback indicator icon: "2/3 feedback submitted"
     - Click → opens candidate detail side sheet
   - Drag behavior: drag card from one column to another → calls moveCandidate API → optimistic UI update → confirmed by WebSocket event
   - Top action bar:
     - "Add Candidate" button → opens dialog: search existing candidates (typeahead from /api/v1/candidates?search=) or "Create New" form (Name, Email, Phone, Resume Upload to S3, Source, Current Company, Role, Experience, Expected CTC, Notice Period). After creating/selecting, adds to first pipeline stage.
     - Filter: Status dropdown (Active/On Hold/All), Search by name input
   - WebSocket: Connect to /pipeline namespace, join plan room. On events, update local state via TanStack Query invalidation.

3. Candidate Detail Side Sheet (shadcn Sheet, triggered by clicking a card):
   - Header: Candidate name, email, phone, source badge
   - Info: Current Role, Company, Experience, Expected CTC, Notice Period
   - Stage History Timeline: vertical timeline showing each stage transition with dates and duration
   - Tabs inside sheet: Info | Feedback (placeholder) | Score (placeholder)
   - Action buttons at bottom: "Move to Next Stage" (auto-picks next by order), "Reject" (opens reason dialog), "Put on Hold", "Select" (if in final stage)

4. Pipeline stats bar above Kanban: Total Candidates | Per-Stage Counts | Avg Time in Pipeline | Rejection Rate — use lightweight computed values from kanban data
```

**Deliverables:**
- NestJS modules for pipeline stages, candidates, applications with Prisma
- Full Kanban board with @dnd-kit drag-and-drop
- Candidate management (create, search, add to pipeline)
- WebSocket gateway for real-time Kanban updates
- Stage history tracking
- Candidate detail side sheet

---

### Sprint 5: Feedback Collection & AI Scoring (Weeks 9–10)

**Goal:** Structured feedback forms, skill-based ratings, AI feedback summarization, candidate scoring.

**Claude Code Instruction:**

```
Build the Feedback Collection and AI Scoring system for HireFlow.

BACKEND (NestJS — src/modules/feedback/):
1. Add Prisma schema models:
   - InterviewFeedback (id UUID, applicationId FK, stageId FK, interviewerId FK→User, overallRating Int, recommendation Enum(STRONG_YES, YES, NEUTRAL, NO, STRONG_NO), qualitativeNotes String?, strengths String?, concerns String?, durationMinutes Int?, isSubmitted Boolean @default(false), submittedAt DateTime?, createdAt, updatedAt, @@unique([applicationId, stageId, interviewerId]))
   - FeedbackSkillRating (id UUID, feedbackId FK→InterviewFeedback, skillId FK→Skill, rating Int, notes String?, @@unique([feedbackId, skillId]))
   - Run migration: npx prisma migrate dev --name add-feedback

2. Create FeedbackModule:
   - DTOs:
     - CreateFeedbackDto: stageId (UUID), overallRating (Int 1-5), recommendation (enum), qualitativeNotes?, strengths?, concerns?, durationMinutes?, skillRatings: array of { skillId: UUID, rating: Int 1-5, notes?: string }
     - SubmitFeedbackDto: (empty — just triggers submission)
   - Service (FeedbackService):
     - createOrUpdateDraft(applicationId, userId, dto):
       - Validate: user must be assigned as interviewer for this stage (check PipelineStageInterviewer)
       - Validate: stage belongs to the application's hiring plan
       - Upsert InterviewFeedback (applicationId+stageId+interviewerId unique)
       - Bulk upsert FeedbackSkillRating records in transaction
       - Return feedback with skill ratings
     - submit(feedbackId, userId):
       - Validate: feedback belongs to userId
       - Set isSubmitted=true, submittedAt=now()
       - After submit, emit notification event (to hiring manager)
       - Check if ALL mandatory interviewers for this stage have submitted → if yes, emit 'stage_feedback_complete' event
     - getAllForApplication(applicationId, requestingUser):
       - RBAC: ADMIN/HR/HIRING_MANAGER see all; INTERVIEWER sees only own feedback
       - Return grouped by stage: { stageId, stageName, feedback: [{ interviewer, ratings, recommendation, ... }] }
     - getSkillMatrix(applicationId):
       - Returns matrix: rows=skills, columns=interviewers (across all stages), cells=rating values
       - Format: { skills: [{ skillId, skillName, category, ratings: [{ interviewerName, stageName, rating, notes }] }] }
     - triggerAiSummary(applicationId):
       - Collect all submitted feedback via getAllForApplication
       - Call Python AI service: POST /ai/summarize-feedback with all feedback data
       - Store returned summary in CandidateApplication.aiSummary
       - Return summary
     - triggerAiScoring(applicationId):
       - Collect all submitted feedback
       - Call Python AI service: POST /ai/score-candidate with feedback data + scoring weights (from org settings or defaults: technical=40, leadership=25, behavioural=20, communication=15)
       - Store returned score in CandidateApplication.totalScore
       - Return: { score, breakdown, confidence, keyFactors }
   - Controller:
     - POST /api/v1/applications/:appId/feedback — create/update draft
     - POST /api/v1/feedback/:feedbackId/submit — submit
     - GET /api/v1/applications/:appId/feedback — list all
     - GET /api/v1/applications/:appId/feedback/matrix — skill matrix
     - POST /api/v1/applications/:appId/feedback/summarize — trigger AI summary
     - POST /api/v1/applications/:appId/score — trigger AI scoring

AI SERVICE (Python):
1. Create FeedbackSummarizerAgent (app/agents/feedback_summarizer.py):
   - POST /ai/summarize-feedback
   - Input: { applicationContext: {role, company, department}, feedback: [{ stage, interviewer, overallRating, recommendation, strengths, concerns, notes, skillRatings: [{skill, category, rating, notes}] }] }
   - Prompt template (app/prompts/feedback_summary.j2):
     "Analyze interview feedback for a candidate applying for {role}. Generate:
      1. Overall Assessment (2-3 sentences)
      2. Key Strengths (evidence-backed bullet points)
      3. Areas of Concern (evidence-backed)
      4. Skill-by-Skill Analysis: per skill, aggregate rating, consensus level, observations
      5. Recommendation: hire / conditional_hire / do_not_hire with confidence (high/medium/low)
      6. Risk Factors
      Return as JSON."
   - Response model: FeedbackSummaryResponse (Pydantic)

2. Create CandidateScorerAgent (app/agents/candidate_scorer.py):
   - POST /ai/score-candidate
   - Input: feedback data + scoringWeights dict
   - Logic:
     a. Calculate raw weighted score (0-100) from ratings:
        - Group all skill ratings by category
        - Average within each category
        - Apply weights, normalize to 0-100
     b. Send to Claude for qualitative adjustment:
        "Given these raw scores and the qualitative feedback, adjust the score by up to ±5 points based on strong signals in notes. Return adjusted score, breakdown, confidence, and key factors."
   - Response: { score: float, breakdown: { technical: x, leadership: y, behavioural: z, communication: w }, confidence: 'high'|'medium'|'low', keyFactors: string[] }

FRONTEND:
1. Feedback Form page at /feedback/[applicationId]/[stageId]/page.tsx:
   - Accessed by interviewers. Also accessible from candidate detail sheet "Give Feedback" button.
   - Header card: Candidate name, applying for (role), current stage name, interviewer name
   - Section 1 — Skill Ratings: For each skill in the stage's skillsToEvaluate config:
     - Skill name with category badge (colored: Technical=blue, Leadership=purple, Behavioural=green)
     - Rating: 5-star component OR number selector (1-5) with labels (1=Poor, 2=Below Avg, 3=Average, 4=Good, 5=Excellent)
     - Per-skill notes textarea (collapsible, optional)
   - Section 2 — Overall Assessment:
     - Overall Rating (1-5 star component)
     - Recommendation: radio group (Strong Yes / Yes / Neutral / No / Strong No) with colored backgrounds
     - Strengths (textarea, placeholder: "What stood out positively?")
     - Concerns (textarea, placeholder: "Any concerns or areas for improvement?")
     - General Notes (textarea)
     - Interview Duration (number input, minutes)
   - Footer: "Save Draft" button (subtle/secondary), "Submit Feedback" button (primary, shows confirmation dialog: "Once submitted, you cannot edit this feedback. Continue?")
   - Auto-save draft every 30 seconds using useMutation with debounce

2. Feedback View in Candidate Detail Sheet (replace placeholder Feedback tab):
   - Per-stage collapsible accordion sections
   - Each stage section shows feedback cards per interviewer: name, overall rating stars, recommendation badge (green=Strong Yes/Yes, yellow=Neutral, red=No/Strong No), notes preview (truncated), expand for full detail
   - Skill Rating Matrix view: table where rows=skills (grouped by category), columns=interviewer@stage, cells=colored number (green ≥4, yellow 3, red ≤2). Use shadcn Table with sticky first column.
   - AI Summary section:
     - If no summary: "Generate AI Summary" button
     - If summary exists: formatted card with Overall Assessment, Strengths list, Concerns list, Recommendation badge, Confidence badge, Risk Factors
     - "Regenerate" button
   - Score section:
     - If no score: "Generate AI Score" button
     - If scored: large score number (color-coded), category breakdown as horizontal bar chart (using Recharts BarChart), confidence badge, key factors tags

3. Feedback status indicators on Kanban cards:
   - Small icon: "2/3" (feedback submitted / total interviewers for current stage)
   - Color: green (all submitted), yellow (partial), gray (none)

4. Feedback tracking in Pipeline tab:
   - New sub-section or overlay: "Feedback Status" table showing per-candidate, per-stage: interviewer name, submitted yes/no, date. "Send Reminder" button for incomplete (stub action for MVP).
```

**Deliverables:**
- NestJS feedback module with draft/submit workflow
- Python AI agents for feedback summarization and candidate scoring
- Structured feedback forms with per-skill ratings
- Skill rating matrix visualization
- AI-generated candidate summaries and scores
- Feedback completion tracking on Kanban cards

---

### Sprint 6: Selection/Rejection & Communication (Weeks 11–12)

**Goal:** Final decision workflow, AI-drafted communications, training module, offer management.

**Claude Code Instruction:**

```
Build the Selection/Rejection workflow, AI Communication drafting, and Interviewer Training module for HireFlow.

BACKEND (NestJS):
1. Add Prisma schema models:
   - SelectionDecision (id UUID, applicationId FK @unique→CandidateApplication, decision Enum(SELECTED, REJECTED), decidedBy FK→User, decisionNotes String?, approvedBy FK→User?, approvedAt DateTime?, offerCtc Decimal?, offerDesignation String?, joiningDate DateTime?, communicationDraft String?, communicationSent Boolean @default(false), communicationSentAt DateTime?, createdAt)
   - TrainingModule (id UUID, orgId FK, title String, contentMarkdown String, category Enum(JD_FORMAT, INTERVIEWING_SKILLS, FEEDBACK_GUIDELINES, HIRING_PROCESS), isDefault Boolean @default(false), estimatedMinutes Int?, createdAt, updatedAt)
   - TrainingCompletion (id UUID, userId FK→User, moduleId FK→TrainingModule, completedAt DateTime, @@unique([userId, moduleId]))
   - Run migration: npx prisma migrate dev --name add-decisions-training

2. Create DecisionsModule (src/modules/decisions/):
   - Service (DecisionsService):
     - makeDecision(applicationId, userId, dto: { decision, decisionNotes, offerCtc?, offerDesignation?, joiningDate? }):
       1. Validate: all stages have submitted feedback (or explicitly skipped)
       2. Create SelectionDecision record
       3. Update CandidateApplication.status to SELECTED or REJECTED, set completedAt
       4. If SELECTED: increment HiringPlan.filledRoles
       5. Call Python AI: POST /ai/draft-communication with candidate data, decision, feedback summary, plan context
       6. Store draft in communicationDraft
       7. Emit notification to HR
       8. Return decision with draft
     - approveDecision(decisionId, userId): Set approvedBy, approvedAt
     - updateCommunication(decisionId, draft): Manual edit of AI draft
     - markCommunicationSent(decisionId): Set communicationSent=true, communicationSentAt=now()
     - getTimeline(applicationId): Returns full timeline: appliedAt, each stage enter/exit with duration, feedbackSubmitted events, decisionDate, communicationSentDate, totalDays
     - getTimeMetrics(hiringPlanId): Aggregate: avgTimePerStage, avgTotalTime, minDays, maxDays
   - Controller: /api/v1/applications/:appId/decision

3. Create TrainingModule (src/modules/training/):
   - Seed default training modules in prisma/seed.ts:
     1. "Understanding Job Descriptions" — How to read JD fitment mapping, using evaluation parameters
     2. "Effective Interviewing Skills" — STAR method, structured questioning, bias awareness
     3. "How to Give and Record Feedback" — Using the feedback form, rating calibration, writing actionable notes
     4. "HireFlow Hiring Process Overview" — Platform walkthrough, roles, workflow stages
   - Service: CRUD for modules (admin/HR), list available for current user, markComplete, getProgress
   - Controller: /api/v1/training-modules

AI SERVICE (Python — app/agents/communication_drafter.py):
1. Create CommunicationDrafterAgent:
   - POST /ai/draft-communication
   - Input: { candidate: {name, email}, role, company, decision, stageReached, feedbackTone (positive/mixed/negative), offerDetails?: {ctc, designation, joiningDate} }
   - For SELECTION: generates congratulatory email with role details, CTC, joining date, next steps, warm professional tone
   - For REJECTION: generates respectful email thanking for time, encouraging future applications. No specific negative feedback shared.
   - Returns: { subject: string, body: string }

FRONTEND:
1. Decision Flow UI (in Candidate Detail Side Sheet):
   - "Make Decision" button visible when candidate is in final stage (or any stage for early rejection)
   - Clicking opens a modal dialog:
     - Decision toggle: Select (green) / Reject (red) — large toggle buttons
     - If Select: Offer CTC (number input), Designation (text), Joining Date (date picker)
     - Decision Notes (textarea)
     - "Generate Communication Preview" button → calls API, shows loading, then renders email preview
     - Email preview: styled card showing Subject and Body, with "Edit" toggle to make it editable (textarea)
     - "Confirm Decision" primary button
   - Post-decision: Decision card replaces the action buttons. Shows: decision badge, decided by, date, communication status. If not sent: "Mark as Sent" button.

2. Kanban board integration:
   - After selection/rejection, candidate card moves to virtual column at the end:
     - "Selected" column (green border) — shows selected candidates
     - "Rejected" column (red border) — shows rejected candidates
   - These virtual columns appear at the end of the Kanban board

3. Candidate Timeline component (reusable, used in detail sheet):
   - Vertical timeline (shadcn-inspired custom component):
     - Application received (date)
     - Stage transitions: "Moved to {stage}" with duration between transitions
     - Feedback events: "Feedback submitted by {name}"
     - Decision: "Selected by {name}" or "Rejected by {name}"
     - Communication: "Communication sent"
   - Total elapsed time badge at the top
   - Color-code: green for progress, red for rejection, blue for feedback

4. Training section at /(protected)/training/page.tsx:
   - Card grid (responsive, 2 cols on desktop) of training modules
   - Each card: title, category badge (colored), estimated read time, completion status (checkmark or "Start")
   - Click card → /training/[id] page: renders markdown content (use react-markdown with remark-gfm) in clean typography. "Mark as Complete" button at bottom.
   - Progress bar at top of /training page: "X of Y modules completed"

5. Add "Decisions" tab to hiring plan detail page:
   - Table: Candidate Name, Decision, Decided By, Date, Offer CTC, Communication Status
   - Filled roles progress bar in hiring plan header: "{filled}/{total} roles filled"

6. Add time-to-hire display:
   - In hiring plan Analytics tab (placeholder → partial implementation now): "Avg Time to Hire: X days" stat card using getTimeMetrics endpoint
```

**Deliverables:**
- NestJS decision module with approval chain
- Python AI agent for drafting selection/rejection communications
- Training modules with markdown content and completion tracking
- Candidate timeline visualization
- Virtual Kanban columns for final outcomes
- Time-to-hire tracking

---

### Sprint 7: Dashboard & Analytics (Weeks 13–14)

**Goal:** Comprehensive analytics dashboard, reporting, AI insights.

**Claude Code Instruction:**

```
Build the comprehensive Analytics Dashboard for HireFlow.

BACKEND (NestJS — src/modules/analytics/):
1. Create AnalyticsModule with AnalyticsService:
   - All methods are org-scoped (from JWT), results cached in Redis (TTL: 5 minutes) using NestJS CacheModule.
   - Use Prisma raw queries (prisma.$queryRaw) for complex aggregations where needed.

   getOverview():
   - total_active_plans (status=ACTIVE), total_open_roles (sum totalRoles - filledRoles for active plans)
   - total_filled_roles, fill_rate_percentage
   - total_candidates_in_pipeline (status=ACTIVE), total_selected, total_rejected
   - avg_time_to_hire_days (avg of completedAt - appliedAt for completed applications)
   - month_over_month_trend: last 6 months, count of selections per month

   getPipelineFunnel(hiringPlanId?):
   - Per stage (or aggregated): candidates_entered (count of stage history entries), candidates_passed (outcome=PASSED), candidates_rejected (outcome=REJECTED), pass_through_rate, avg_days_in_stage
   - If no hiringPlanId, aggregate across all active plans

   getTimeToHire(groupBy: 'role'|'department'|'quarter'):
   - Group by the specified dimension
   - Per group: avg_days, median_days, min_days, max_days
   - Per-stage breakdown: avg days per stage name
   - Monthly trend line (last 12 months)

   getCostTracking():
   - Per plan: budgetMin, budgetMax, avgOfferCtc (from selections), totalSpent (sum of offerCtc), remainingBudget
   - Aggregate: totalBudget (sum of budgetMax), totalSpent, utilization_percentage

   getInterviewerStats():
   - Per interviewer (User): total_interviews (feedback count), avg_rating_given (avg of overallRating), feedback_completion_rate (submitted/total assigned), avg_feedback_time (submittedAt - stageEnteredAt), recommendation_distribution (% strong_yes, yes, neutral, no, strong_no)
   - Sorted by avg_feedback_time ascending (fastest first)

   getHiringProgress():
   - Per plan: title, totalRoles, filledRoles, inPipeline (active candidates count), progress_percentage, status
   - Grouped by quarter

   getSourceEffectiveness():
   - Per candidate source: total_candidates, selected_count, selection_rate, avg_score, avg_time_to_hire

   Controller: All under /api/v1/analytics/*, @Roles('ADMIN', 'HR', 'HIRING_MANAGER', 'VIEWER')

2. AI Insights endpoint:
   - POST /api/v1/analytics/insights (NestJS):
     - Fetches all analytics data snapshots (calls getOverview, getFunnel, getTimeToHire, etc.)
     - Sends combined data to Python: POST /ai/dashboard-insights
     - Returns insights array

AI SERVICE (Python — app/agents/insights_agent.py):
1. Create InsightsAgent:
   - POST /ai/dashboard-insights
   - Input: { companyName: str, analytics: { overview, funnel, timeToHire, cost, interviewerStats, sourceEffectiveness } }
   - Prompt: "Analyze hiring analytics for {company}. Generate 5-8 actionable insights: bottleneck identification, budget efficiency, interviewer calibration issues, source ROI, velocity trends, process improvement recommendations. Return JSON: { insights: [{ title, description, severity: 'info'|'warning'|'critical', category, recommendation }] }"
   - Response: InsightsResponse Pydantic model

FRONTEND — /dashboard/page.tsx (complete rebuild):
1. Dashboard filters bar at top:
   - Date Range picker (shadcn DatePickerWithRange), Department filter (select), Quarter filter (select)
   - All charts respond to filters (pass as query params to analytics endpoints)

2. Row 1 — KPI Cards (4 cards in a grid):
   - "Active Plans" — count + small trend indicator vs last quarter
   - "Open Roles" — count + fill rate percentage in subtitle
   - "Avg Time to Hire" — X days + up/down trend arrow (color-coded green=improving, red=worsening)
   - "Pipeline Candidates" — count
   - Use shadcn Card with subtle gradient backgrounds

3. Row 2 — Two charts side by side (use Recharts):
   - Left: Pipeline Funnel — horizontal BarChart. Y-axis: stage names. X-axis: candidate counts. Bars show entered (light) vs passed (dark). Add pass-through rate as label on each bar.
   - Right: Hiring Progress — StackedBarChart per plan. Each bar split into filled (green) and remaining (gray). Plan name on X-axis.

4. Row 3 — Two charts:
   - Left: Time to Hire Trend — LineChart. X-axis: months (last 12). Y-axis: avg days. Single line with area fill. Overlay per-stage area chart if data available.
   - Right: Budget Utilization — grouped BarChart. Per plan: budget bar (blue) vs actual spend bar (green). Show utilization % label.

5. Row 4 — Two data tables:
   - Left: "Top Interviewers" — shadcn Table: Name, Interviews Done, Avg Response Time, Completion Rate %, Avg Rating Given. Sorted by response time.
   - Right: "Source Effectiveness" — Table: Source, Candidates, Selected, Selection Rate %, Avg Score. Sorted by selection rate.

6. Row 5 — AI Insights section:
   - "Generate Insights" button (with sparkle icon)
   - Loading: skeleton cards
   - Results: Grid of insight cards. Each card: severity icon (info=blue circle, warning=yellow triangle, critical=red diamond), title (bold), description paragraph, recommendation in italicized text, category badge.
   - Store in local state (no persistence for MVP). Regenerate on demand.

7. Per-plan Analytics (replace the placeholder Analytics tab in /hiring-plans/[id]):
   - Plan-specific funnel chart
   - Stage metrics table: Stage Name | Avg Days | Pass Rate | Candidates Entered
   - Score distribution: Histogram (Recharts BarChart) of candidate scores
   - Feedback heatmap: grid of interviewers × stages, cells colored by avg rating given

8. CSV Export:
   - Add "Export CSV" button to each analytics section
   - Use client-side CSV generation: convert data table to CSV string, trigger download via Blob URL
   - Export available for: overview stats, funnel data, time metrics, interviewer stats, source effectiveness

Make all chart components responsive. Use consistent color scheme from shadcn theme. Add proper loading skeletons for each section.
```

**Deliverables:**
- NestJS analytics module with Redis caching and complex Prisma queries
- Executive dashboard with KPIs, funnel, progress, budget, time-to-hire charts
- Interviewer stats and source effectiveness tables
- Python AI agent for generating insights
- Per-plan analytics tab
- CSV export
- Filterable, responsive dashboard

---

### Sprint 8: Admin Panel, Polish & Launch Prep (Weeks 15–16)

**Goal:** Admin panel, notifications, performance optimization, testing, deployment.

**Claude Code Instruction:**

```
Build the Admin Panel, notification system, and finalize HireFlow for MVP launch.

BACKEND (NestJS):
1. Notification System (src/modules/notifications/):
   - Add Prisma model:
     - Notification (id UUID, userId FK, orgId FK, type String, title String, body String, read Boolean @default(false), entityType String?, entityId UUID?, actionUrl String?, createdAt)
     - Run migration: npx prisma migrate dev --name add-notifications
   - Notification types: 'feedback_submitted', 'feedback_pending', 'decision_made', 'candidate_added', 'jd_approved', 'stage_sla_warning', 'plan_completed'
   - Service (NotificationsService):
     - create(userId, orgId, type, title, body, entityType?, entityId?, actionUrl?)
     - findAll(userId, pagination, filter: read/unread)
     - getUnreadCount(userId)
     - markAsRead(ids: UUID[]) — bulk
     - markAllRead(userId)
   - Controller: /api/v1/notifications
   - WebSocket: Add to existing gateway — emit 'notification:new' to user's personal room (user:{userId})
   - Add notification triggers throughout existing services using NestJS EventEmitter:
     - FeedbackService.submit → emit 'feedback.submitted' → NotificationListener creates notification for hiring manager
     - ApplicationsService.move → emit 'candidate.moved'
     - DecisionsService.makeDecision → emit 'decision.made' → notify HR
     - Cron job (NestJS @Cron): daily check for SLA breaches (candidates in stage > maxDurationDays) → create 'stage_sla_warning' notifications

2. Audit Log (src/modules/audit/):
   - Add Prisma model:
     - AuditLog (id UUID, orgId FK, userId FK, action String, entityType String, entityId UUID?, changes Json?, ipAddress String?, userAgent String?, createdAt)
   - Create AuditInterceptor (NestJS interceptor) that automatically logs:
     - All POST, PATCH, DELETE requests to main entities (hiring plans, JDs, applications, feedback, decisions, users)
     - Records: action (HTTP method + path), entityType, entityId (from params), changes (request body), user from JWT
   - Controller: GET /api/v1/admin/audit-log — paginated, filterable by user, action, entityType, date range. Admin only.

3. Org Settings (src/modules/settings/):
   - Add Prisma model:
     - OrgSettings (id UUID, orgId FK @unique→Organization, settings Json, updatedAt)
     - Settings JSON: { scoringWeights: { technical, leadership, behavioural, communication }, defaultPipelineStages: array, notificationPreferences: {}, approvalWorkflowEnabled: boolean, maxInterviewRounds: number }
   - CRUD: GET/PATCH /api/v1/admin/settings — Admin only
   - Seed defaults on org creation

4. Global Search:
   - GET /api/v1/search?q= — searches across:
     - Candidates: name, email (Prisma contains, case-insensitive)
     - HiringPlans: title, department
     - JobDescriptions: search within content JSON
   - Returns: { candidates: [...], hiringPlans: [...], jobDescriptions: [...] } with max 5 results per category

5. Performance Optimization:
   - Add Prisma indexes via schema: @@index on (orgId) for all org-scoped models, (hiringPlanId, status) on applications, (applicationId, stageId) on feedback, (createdAt) for audit/notifications
   - Run migration for indexes: npx prisma migrate dev --name add-indexes
   - Redis caching (already in analytics, extend): cache pipeline board (30s TTL, invalidate on mutation), skills taxonomy (1 hour TTL)
   - Add NestJS ThrottlerModule: 100 req/min per user globally, 10 req/min for AI endpoints (custom decorator)
   - Add cursor-based pagination helper utility for all list endpoints

6. Standardized error handling:
   - Create global ExceptionFilter (NestJS) that returns: { error: { code: string, message: string, details?: any } }
   - Handle: Prisma errors (unique constraint → 409, not found → 404), validation errors (400 with field details), auth errors (401/403), throttle errors (429 with retry-after header)

ADMIN PANEL (/admin — React + react-admin):
1. Set up react-admin project in /admin directory:
   - DataProvider: custom REST data provider pointing to /api/v1/admin/* endpoints
   - AuthProvider: uses same JWT auth as main frontend
2. Resources:
   - Users: List (datagrid: name, email, role, active status), Create (form: name, email, role, send invite), Edit (change role, toggle active)
   - Skills: List (with category filter, search), Create, Edit, Delete. Add "Bulk Import" button that accepts CSV (name, category, industry columns).
   - Industries: Simple CRUD list
   - Training Modules: List, Create/Edit with markdown editor (use react-markdown for preview)
   - Audit Log: List with filters (user, action, entity type, date range). Read-only. Show changes JSON in expandable row.
   - AI Agent Logs: List showing agent_type, model, tokens used, latency, timestamp. Expandable row shows full input/output JSON. Read-only.
   - Org Settings: Single-record edit form — scoring weights (4 number inputs summing to 100), approval workflow toggle, max interview rounds number

FRONTEND FINAL POLISH:
1. Notification Center:
   - Bell icon in top bar with unread count badge (red circle with number)
   - Click opens a dropdown panel (shadcn Popover):
     - Header: "Notifications" + "Mark All Read" link
     - List of notifications: type icon | title | body preview | time ago | read/unread dot
     - Click notification → navigate to actionUrl (e.g., /hiring-plans/x/pipeline for candidate movement)
     - "View All" link at bottom (future: full notifications page)
   - WebSocket: connect to personal room, on 'notification:new' → update count + prepend to list

2. Global Search:
   - Search input in top navigation bar (shadcn Command component with Cmd+K shortcut)
   - On type (debounced 300ms): call /api/v1/search?q=
   - Results dropdown categorized: "Candidates" section, "Hiring Plans" section
   - Click result → navigate to detail page
   - Empty state: "No results found"

3. Responsive Design:
   - All pages work at 1024px+ (tablet)
   - Kanban: horizontal scroll with visible overflow indicators
   - Dashboard: cards stack 2-col at tablet, 1-col at mobile
   - Sidebar: collapsible to icon-only mode; hamburger menu on mobile
   - Tables: horizontal scroll on overflow

4. Loading & Error States:
   - Skeleton loaders (shadcn Skeleton) on all data-fetching pages
   - Toast notifications (shadcn toast) for: success (create, update, submit), error (API failures), info (AI generation started)
   - Empty states: custom illustrations/icons + CTA text for: no hiring plans, no candidates, no feedback, no analytics data
   - React Query error boundary with retry button

5. Onboarding:
   - First-time user: welcome dialog (shadcn AlertDialog) with platform intro
   - Quick feature highlights: "Here's how to get started: 1. Create a Hiring Plan, 2. Generate JD with AI, 3. Set up Pipeline, 4. Collect Feedback, 5. Make Decisions"
   - Link to /training for detailed modules
   - Set flag in localStorage to show only once

DEPLOYMENT:
1. Docker setup:
   - backend/Dockerfile: Node 20 alpine, npm ci, npx prisma generate, npm run build, CMD ["node", "dist/main"]
   - ai-service/Dockerfile: Python 3.12 slim, pip install -r requirements.txt, CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   - frontend/Dockerfile: Node 20, npm run build, next start on port 3001
   - admin/Dockerfile: Node 20, npm run build, serve static files with nginx

2. docker-compose.prod.yml:
   - All services with restart: unless-stopped
   - Nginx reverse proxy service: routes /api → backend:3000, /ai → ai-service:8000, /admin → admin:80, / → frontend:3001. SSL termination (certbot/self-signed for MVP).
   - PostgreSQL with volume persistence, connection pool settings
   - Redis with persistence (appendonly yes)
   - Health checks on all services

3. Deployment docs (README.md):
   - Prerequisites: Docker, Docker Compose, domain name (optional)
   - Environment variable reference (all vars with descriptions)
   - Setup: clone, cp .env.example .env, fill vars, docker-compose up -d
   - Database: npx prisma migrate deploy, npx prisma db seed
   - Backup: pg_dump command, Redis RDB backup
   - Monitoring: health check URLs, log viewing
```

**Deliverables:**
- Full admin panel with react-admin
- Real-time notification system with WebSocket delivery
- Audit logging with automatic interceptor
- Global search across entities
- Performance: caching, indexing, rate limiting, pagination
- Responsive design, loading states, empty states, toasts
- Onboarding flow
- Production Docker deployment with Nginx reverse proxy
- Deployment documentation

---

## 8. Sprint Summary

| Sprint | Weeks | Focus | Key Outputs |
|--------|-------|-------|-------------|
| 1 | 1–2 | Foundation & Auth | Monorepo, NestJS + Prisma, Python AI service, JWT auth, app shell |
| 2 | 3–4 | Hiring Plan Builder | Plan CRUD, skills taxonomy, multi-step form |
| 3 | 5–6 | AI JD Generator | NestJS→Python AI integration, JD generation/versioning/approval |
| 4 | 7–8 | Kanban Pipeline | Interview stages, Kanban board with DnD, WebSocket real-time |
| 5 | 9–10 | Feedback & Scoring | Feedback forms, AI summarization, candidate scoring |
| 6 | 11–12 | Decisions & Comms | Select/reject workflow, AI emails, training modules |
| 7 | 13–14 | Dashboard & Analytics | Analytics dashboard, AI insights, CSV export |
| 8 | 15–16 | Admin & Launch | Admin panel, notifications, polish, deployment |

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API Response Time | < 200ms (p95) for CRUD, < 10s for AI endpoints |
| Concurrent Users | 100 (MVP) |
| Data Retention | Indefinite (soft deletes) |
| Uptime | 99.5% (MVP) |
| Browser Support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Security | OWASP Top 10 compliance, encrypted at rest, HTTPS only |
| Accessibility | WCAG 2.1 AA for core workflows |

---

## 10. Future Roadmap (Post-MVP)

- Calendar integration for interview scheduling (Google Calendar, Outlook)
- Email integration for automated communication sending (SendGrid, SES)
- Resume parsing with AI (extract skills, experience from uploaded resumes)
- Candidate self-service portal (application status tracking)
- Mobile app (React Native)
- Advanced reporting with scheduled email reports
- Multi-language JD generation
- Integration with job boards (LinkedIn, Indeed, Naukri) for posting
- AI-powered candidate sourcing recommendations
- Video interview integration (Zoom, Teams)
- Offer letter template builder and digital signature
- Employee referral management module
- Diversity and inclusion analytics
- Kubernetes deployment with auto-scaling
- GraphQL API layer for flexible frontend queries

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI response quality varies | Medium | Structured Pydantic validation, human review step, prompt iteration |
| Kanban performance with many candidates | Medium | Virtual scrolling, pagination, Redis caching |
| Scope creep | High | Strict MVP scope, features frozen after Sprint 2 planning |
| Claude API rate limits | Low | Python retry with backoff, request queue, prompt caching |
| Data privacy (candidate PII) | High | Encryption, RBAC, audit logging, data retention policies |
| NestJS ↔ Python service latency | Low | Internal network (Docker), timeout handling, async where possible |

---

*Document Version: 1.1 · Last Updated: March 24, 2026*
