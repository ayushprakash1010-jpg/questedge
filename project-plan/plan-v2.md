# Work Nucleus — Plan v2: Closing the Loop & New Modules

**Source:** `docs/build-cost-estimate.md` | **Created:** 2026-05-04 | **Total Duration:** 5 Phases (~14–16 Months)

This plan only covers what is **not yet implemented**. The existing codebase already provides:
hiring plans, AI-generated JDs, multi-channel publishing, candidate DB, AI resume scoring, multi-stage interview pipeline, structured feedback, AI-drafted selection/rejection emails, analytics, audit log, RBAC, and the L1–L3 support portal.

> **Skipped (already in place):** monorepo bootstrap, Auth0, NestJS + Prisma, Next.js 14 + Nova Design System, FastAPI AI service, Docker Compose dev/prod, pg-boss queue, MinIO/S3 storage, CI baseline, support-admin app.

---

## Architecture Recap

```
Frontend (Next.js 14 + Nova)  ──►  Nginx  ──►  NestJS Backend (3000)
Support Admin (Next.js)       ──►    │     ──►  AI Service FastAPI (8000)
Candidate / Employee Portal   ──►    │
                                     ▼
                  PostgreSQL 16 + Redis 7 + pg-boss + S3/MinIO + Auth0
```

**New external vendors introduced in v2:**
- **Digio** or **Leegality** (e-signature for India)
- **AuthBridge / OnGrid / IDfy / SpringVerify** (background verification)
- **MSG91** (SMS + WhatsApp Business API)
- **Postmark / AWS SES** (transactional email — if not already wired)

---

## Phase Map

| Phase | Months | Theme | Deliverable |
|---|---|---|---|
| 1 | 1–3 | Resume → Offer Letter | First paying customer-ready |
| 2 | 4–6 | Background Verification | Compliance + 1 vendor live |
| 3 | 7–10 | Appraisal Management | Mid + yearly cycles + 360 |
| 4 | 11–13 | Compensation Engine | Budget-aware hike & bonus |
| 5 | 14–16 | Mobile + BI + SOC 2 | Production hardening |

---

## Pre-Phase Checklist

Before starting Phase 1, ensure:
- [ ] Existing Prisma schema reviewed; new modules will extend it (no breaking renames)
- [ ] Vendor accounts opened in sandbox: Digio, AuthBridge (or chosen), MSG91, Postmark
- [ ] Anthropic Claude API key has higher rate limits provisioned for new agents
- [ ] Feature flags wired (use a simple `OrgSettings.featureFlags` JSON field — already in schema)
- [ ] All new modules behind `/api/v2/*` route prefix to avoid breaking existing v1 contracts

---

## Phase 1: Recruitment — Resume to Offer Letter (Months 1–3)

**Goal:** Close the loop from selection decision (already built) to signed offer letter and pre-onboarding.

**Modules to add in `backend/src/modules/`:** `offers`, `offer-templates`, `comp-builder`, `e-sign`, `joining`

### Phase 1A: Schema & Offer Letter Templates

```
Claude Code Instruction:

Extend the Prisma schema in /backend/prisma/schema.prisma with offer-letter domain models. Do NOT rename
existing models. Add a new feature flag `OFFER_LETTERS_ENABLED` checked from OrgSettings.featureFlags.

Add these models:

model OfferTemplate {
  id            String   @id @default(uuid())
  orgId         String
  name          String
  body          String   @db.Text  // Handlebars-style template with {{variables}}
  variables     Json     // schema definition: [{ key, label, type, required, default }]
  brandingJson  Json?    // logo URL, header/footer colors, font
  version       Int      @default(1)
  isActive      Boolean  @default(true)
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  org           Organization @relation(fields: [orgId], references: [id])
  createdBy     User         @relation(fields: [createdById], references: [id])
  offers        Offer[]
  @@index([orgId, isActive])
}

model Offer {
  id                String       @id @default(uuid())
  orgId             String
  applicationId     String       @unique  // FK to existing CandidateApplication
  templateId        String
  status            OfferStatus  @default(DRAFT)
  compensationId    String?      @unique
  generatedDocUrl   String?      // S3 path of rendered PDF
  signedDocUrl      String?      // S3 path of signed PDF (post e-sign)
  expiresAt         DateTime?
  acceptedAt        DateTime?
  declinedAt        DateTime?
  declineReason     String?
  approvalChain     Json         // [{ role, userId, status, actedAt, comment }]
  createdById       String
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  template          OfferTemplate @relation(fields: [templateId], references: [id])
  application       CandidateApplication @relation(fields: [applicationId], references: [id])
  compensation      Compensation? @relation(fields: [compensationId], references: [id])
  signatureRequest  ESignRequest?
  @@index([orgId, status])
}

enum OfferStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  SENT
  VIEWED
  ACCEPTED
  DECLINED
  EXPIRED
  REVOKED
}

model Compensation {
  id              String   @id @default(uuid())
  orgId           String
  fixedAnnual     Decimal  @db.Decimal(12, 2)
  variableAnnual  Decimal  @db.Decimal(12, 2) @default(0)
  joiningBonus    Decimal  @db.Decimal(12, 2) @default(0)
  retentionBonus  Decimal  @db.Decimal(12, 2) @default(0)
  esopUnits       Int?     @default(0)
  esopVesting     Json?    // { years, cliffMonths, schedule }
  breakup         Json     // { basic, hra, special, pf, gratuity, lta, ... }
  currency        String   @default("INR")
  createdAt       DateTime @default(now())
  offer           Offer?
}

Then create NestJS modules: OffersModule, OfferTemplatesModule, CompBuilderModule with full CRUD,
controllers under /api/v2/offers, /api/v2/offer-templates, /api/v2/compensation. Reuse existing
guards (Auth0JwtGuard, OrgGuard, RbacGuard) and follow the controller/service/DTO pattern from
backend/src/modules/job-descriptions. Add Swagger tags. Run `npx prisma migrate dev --name offer_letters_v2`.
```

### Phase 1B: PDF Rendering + AI Drafting

```
Claude Code Instruction:

Add server-side PDF generation for offer letters.

BACKEND (in /backend/src/modules/offers):
1. Install: handlebars, puppeteer-core, @sparticuz/chromium (works in Docker), pdf-lib
2. Create OfferRenderService:
   - render(offerId): fetch Offer + Compensation + CandidateApplication + Candidate + Org
   - merge into Handlebars template, inline org branding (logo from S3)
   - print to PDF via puppeteer-core, store at s3://offers/{orgId}/{offerId}/v{version}.pdf
   - return signed URL valid for 24h
3. Endpoint: POST /api/v2/offers/:id/render — returns { pdfUrl, version }
4. Store rendered version history in OfferDocVersion table (id, offerId, version, s3Key, renderedAt)

AI SERVICE (in /ai-service/app/agents):
1. Extend the existing communication_drafter agent (do not create a new one) — add a new prompt
   intent "OFFER_LETTER_BODY" that takes { candidate, role, comp, org, tone } and returns a body
   draft suitable for filling into a template's free-text section
2. Endpoint: POST /ai/v1/agents/communication-drafter with intent="OFFER_LETTER_BODY"
3. Cache: hash(input) → output for 7 days (Redis); offer letter inputs are stable

FRONTEND (in /frontend/src/app):
1. Add /offers/templates page — list, create, edit (use Nova FormField, Card, Button components)
2. Template editor: monaco-editor with Handlebars syntax, live preview pane (right side) using
   sample data, variable picker sidebar from template's variables JSON
3. /offers/[id] page: 4 tabs — Compensation Builder | Letter Preview | Approvals | Send & Sign
4. Compensation Builder: structured form with auto-CTC math, India tax slab hint helper
   (do NOT compute final tax — show estimate ranges only)
```

### Phase 1C: Approval Workflow + E-Sign

```
Claude Code Instruction:

Add multi-level approval and e-signature integration.

APPROVALS:
1. Reuse existing approval engine pattern from JobDescription approval flow
   (see backend/src/modules/job-descriptions/services/approval.service.ts)
2. Configurable per OrgSettings: offerApprovalChain = ["HIRING_MANAGER", "HR", "FINANCE", "FOUNDER"]
3. Each approver can: approve | request-changes | reject (with comment)
4. On final approval: status → APPROVED; trigger render + email-to-candidate
5. WebSocket event "offer.status.changed" pushed to listening clients

E-SIGN INTEGRATION (Digio — preferred for India):
1. Add ESignRequest model:
   model ESignRequest {
     id              String   @id @default(uuid())
     offerId         String   @unique
     provider        String   @default("digio")  // also support "leegality"
     providerReqId   String   @unique
     signerEmail     String
     signerPhone     String
     status          ESignStatus @default(PENDING)
     signedAt        DateTime?
     auditTrailUrl   String?
     webhookEvents   Json     @default("[]")
     offer           Offer    @relation(fields: [offerId], references: [id])
   }
   enum ESignStatus { PENDING SENT VIEWED SIGNED EXPIRED FAILED }
2. Create /backend/src/integrations/digio/digio.client.ts — wraps Digio Sign API:
   - createSignRequest(pdfBuffer, signers, expiry)
   - getStatus(reqId)
   - downloadSigned(reqId)
3. Webhook endpoint: POST /api/v2/webhooks/digio (verify HMAC signature, map events to ESignStatus)
4. Schedule pg-boss job `esign-poller` every 30 min as fallback for missed webhooks
5. Vault all Digio credentials in AWS Secrets Manager (env-injected, never logged)
6. Add provider abstraction interface IESignProvider so Leegality can be swapped in via OrgSettings.eSignProvider
```

### Phase 1D: Candidate Offer Portal + Joining Flow

```
Claude Code Instruction:

Build the candidate-facing offer view and pre-onboarding/joining checklist.

FRONTEND (public — extend /frontend/src/app/(public)):
1. /offer/[token] page — token is signed JWT (orgId, offerId, exp 14 days)
   - Hero section with org branding, role title, comp summary card
   - "View full letter" → embedded PDF.js viewer
   - Three actions: Accept | Negotiate | Decline (with reason form)
   - Accept → opens e-sign in new tab via Digio embedded SDK
2. Track view event: POST /api/v2/public/offers/:token/viewed (sets Offer.firstViewedAt)
3. Negotiate flow: candidate sends counter (compensation delta + comment) → email HR + create
   internal Note on the offer; status stays SENT, HR can revise & re-issue

JOINING MODULE (new module: backend/src/modules/joining):
1. Models:
   model JoiningChecklist {
     id          String   @id @default(uuid())
     orgId       String
     name        String
     items       Json     // [{ key, label, required, docTypes, owner: "CANDIDATE"|"HR" }]
     isDefault   Boolean  @default(false)
   }
   model CandidateJoining {
     id              String   @id @default(uuid())
     offerId         String   @unique
     checklistId     String
     joinDate        DateTime
     status          JoiningStatus @default(PENDING)
     submissions     Json     // { itemKey: { status, fileUrl, submittedAt, reviewedAt, notes } }
     buddyUserId     String?
     reportingMgrId  String?
   }
   enum JoiningStatus { PENDING IN_PROGRESS DOCUMENTS_PENDING READY_TO_JOIN JOINED CANCELLED }
2. Auto-create CandidateJoining when Offer.status → ACCEPTED
3. Candidate portal page /joining/[token] — checklist with file uploads (S3 presigned PUT)
4. HR view at /candidates/[id]/joining — review submissions, mark approved/needs-revision

NOTIFICATIONS:
- Reuse existing NotificationsModule. Add templates:
  OFFER_SENT, OFFER_VIEWED, OFFER_ACCEPTED, OFFER_DECLINED, OFFER_EXPIRING_SOON,
  JOINING_DOCS_REQUESTED, JOINING_DOCS_APPROVED, JOINING_REMINDER_T_MINUS_3
- All emails go via Postmark transport. SMS for OFFER_SENT and JOINING_REMINDER via MSG91
```

**Phase 1 exit criteria:**
- [ ] Generate, approve, sign, and accept an offer end-to-end on staging
- [ ] Joining checklist completed by a test candidate, all docs reviewed
- [ ] First external customer demo passed

---

## Phase 2: Background Verification Integration (Months 4–6)

**Goal:** Trigger BGV after offer acceptance, orchestrate multiple checks, surface results to HR with full DPDP-compliant consent and audit trail.

**New module:** `backend/src/modules/bgv` + `backend/src/integrations/{authbridge|ongrid|idfy}`

### Phase 2A: BGV Schema & Vendor Adapter

```
Claude Code Instruction:

Build the background verification module with a pluggable vendor adapter pattern.

PRISMA additions:

model BgvProfile {
  id            String   @id @default(uuid())
  orgId         String
  candidateId   String
  offerId       String?
  status        BgvProfileStatus @default(NOT_STARTED)
  consentedAt   DateTime?
  consentIpHash String?
  consentDocUrl String?  // signed consent form S3 key
  vendor        String   // "authbridge" | "ongrid" | "idfy" | "springverify"
  vendorRefId   String?
  startedAt     DateTime?
  completedAt   DateTime?
  finalReportUrl String?
  riskScore     String?  // "GREEN" | "AMBER" | "RED"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  candidate     Candidate @relation(fields: [candidateId], references: [id])
  checks        BgvCheck[]
  @@unique([orgId, candidateId, offerId])
}

enum BgvProfileStatus { NOT_STARTED CONSENT_PENDING IN_PROGRESS NEEDS_REVIEW COMPLETED CANCELLED }

model BgvCheck {
  id            String   @id @default(uuid())
  profileId     String
  type          BgvCheckType
  status        BgvCheckStatus @default(QUEUED)
  vendorRefId   String?
  request       Json     // input payload sent to vendor
  response      Json?    // raw vendor response
  finding       BgvFinding @default(PENDING)  // PENDING | CLEAR | DISCREPANCY | UNABLE_TO_VERIFY
  reportUrl     String?
  costInPaise   Int?     // tracks per-check cost
  retryCount    Int      @default(0)
  startedAt     DateTime?
  completedAt   DateTime?
  profile       BgvProfile @relation(fields: [profileId], references: [id])
}

enum BgvCheckType {
  PAN AADHAAR PASSPORT
  EDUCATION EMPLOYMENT_HISTORY
  ADDRESS_CURRENT ADDRESS_PERMANENT
  CRIMINAL_COURT POLICE_VERIFICATION
  CREDIT_CHECK GLOBAL_DATABASE DRUG_TEST REFERENCE
}

enum BgvCheckStatus { QUEUED IN_PROGRESS COMPLETED FAILED CANCELLED }
enum BgvFinding { PENDING CLEAR DISCREPANCY UNABLE_TO_VERIFY }

VENDOR ADAPTER (place in /backend/src/integrations/bgv):
1. Define IBgvProvider interface:
     initiateProfile(input): Promise<{ vendorRefId }>
     submitCheck(profileRefId, checkType, payload): Promise<{ vendorCheckRefId }>
     getCheckStatus(checkRefId): Promise<VendorStatus>
     downloadReport(checkRefId): Promise<Buffer>
     verifyWebhook(headers, body): boolean
2. Implement AuthBridgeProvider first (most common in India). Read API spec from sandbox docs.
3. Provider chosen per Org via OrgSettings.bgvProvider. Default to "authbridge".
4. All API calls go through axios with retry (axios-retry: 3 attempts, exponential backoff) and a
   structured logger that redacts PII (PAN, Aadhaar, DOB).

JOB QUEUE:
- pg-boss queue `bgv.poll` runs every 5 minutes for profiles in IN_PROGRESS — polls vendor
  status as fallback when webhooks miss; max age 7 days
```

### Phase 2B: Consent Capture + Orchestration

```
Claude Code Instruction:

Build candidate-facing consent capture and HR-facing orchestration UI.

CONSENT (DPDP Act 2023 compliant):
1. /bgv/consent/[token] page (public, JWT-signed token with profileId, exp 7 days)
2. Display the verification scope clearly:
   - Which checks will run (e.g. PAN, Education, Past Employment)
   - Which data will be collected
   - Retention period (default 90 days post-completion)
   - Candidate rights: withdraw consent, request data deletion
3. Multi-step consent form: read → digital sign (typed name + checkbox + IP capture) → OTP via MSG91
4. Generate signed consent PDF, upload to S3, set BgvProfile.consentDocUrl
5. After consent, candidate uploads supporting documents (PAN card image, certificates, employment
   letters) — store under s3://bgv/{orgId}/{profileId}/docs/

HR ORCHESTRATION DASHBOARD:
1. /bgv page — table of all BgvProfiles with filter by status, finding, candidate, age
2. /bgv/[id] page:
   - Header: candidate, role, offer link, status timeline
   - Checks tab: list of BgvCheck rows; each row shows status, finding, cost, vendor link
   - Documents tab: uploaded files with preview
   - Discrepancy tab: raised flags + resolution thread (HR comments + vendor re-runs)
   - Final Report tab: aggregated PDF (server-merged from individual check reports)
3. Manual actions:
   - Trigger missing check
   - Re-run failed check (max 3 retries auto, then manual)
   - Override finding with justification (audit logged) — requires HR_LEAD role
   - Cancel profile with reason

WEBHOOK HANDLER:
- POST /api/v2/webhooks/bgv/:provider — verify HMAC, parse event, update BgvCheck.status,
  download report on completion, run discrepancy detector
```

### Phase 2C: Discrepancy Workflow + AI Summarisation

```
Claude Code Instruction:

Add automated discrepancy detection and AI-powered report summarisation.

DISCREPANCY DETECTOR (in BgvService):
- Run on every BgvCheck completion. Rules:
  - PAN name mismatch with candidate.fullName (Levenshtein > 2 chars) → DISCREPANCY
  - Education degree dates not matching application → DISCREPANCY
  - Employment company name mismatch → DISCREPANCY
  - Criminal check non-empty → DISCREPANCY (always)
- Auto-create a SupportTicket (use existing SupportTicket model with category=BGV_DISCREPANCY)
  routed to the assigned HR with all context

AI AGENT (new agent in /ai-service/app/agents):
- Create bgv_summariser.py — accepts full BgvProfile + all checks + raw responses
- Output structure:
  {
    "overall_recommendation": "PROCEED" | "PROCEED_WITH_CAUTION" | "BLOCK",
    "key_findings": [ ... ],
    "discrepancies": [{ check, severity, recommended_action }],
    "executive_summary": "..."
  }
- Use Claude with low temperature (0.1) and structured output (Anthropic structured outputs)
- Endpoint: POST /ai/v1/agents/bgv-summariser
- IMPORTANT: AI output is advisory only, not auto-actioned. Always require human approval.

COST TRACKING:
- Each BgvCheck.costInPaise populated from vendor pricing config (per OrgSettings.bgvPricing)
- Add /bgv/cost-report page — monthly cost by org, by check type, by candidate
- Pass-through billing flag (default true): show cost in candidate-facing summary if false

EXIT TO ONBOARDING:
- When BgvProfile.status → COMPLETED with riskScore = GREEN, automatically advance
  CandidateJoining.status to READY_TO_JOIN
```

**Phase 2 exit criteria:**
- [ ] One BGV vendor (AuthBridge) live in production with at least 5 check types
- [ ] DPDP consent flow signed off by legal
- [ ] Mean check completion time < 4 days, webhook lag < 30s
- [ ] AI summariser accuracy validated against 50 sample profiles

---

## Phase 3: Appraisal Management (Months 7–10)

**Goal:** Run a complete mid-year and yearly appraisal cycle including goal setting, self-assessment, manager review, 360-degree feedback, and rating calibration.

**New modules:** `appraisal-cycles`, `goals`, `assessments`, `peer-feedback`, `calibration`

### Phase 3A: Cycle Configuration & Goal Setting

```
Claude Code Instruction:

Build the foundational appraisal cycle and goal/KRA management.

PRISMA additions:

model AppraisalCycle {
  id              String   @id @default(uuid())
  orgId           String
  name            String   // "FY26 Mid-Year", "FY26 Annual"
  type            CycleType
  startDate       DateTime
  endDate         DateTime
  goalSettingDeadline   DateTime
  selfAssessmentDeadline DateTime
  managerReviewDeadline  DateTime
  calibrationDeadline    DateTime
  ratingScale     Json     // [{ value: 5, label: "Outstanding" }, ...]
  weights         Json     // { goals: 60, competencies: 30, values: 10 }
  status          CycleStatus @default(DRAFT)
  eligibilityRules Json    // { minTenureMonths, departments, levels }
}

enum CycleType { MID_YEAR ANNUAL PROBATION SPECIAL }
enum CycleStatus { DRAFT GOAL_SETTING SELF_ASSESSMENT MANAGER_REVIEW PEER_FEEDBACK CALIBRATION COMMUNICATED CLOSED }

model Goal {
  id            String   @id @default(uuid())
  cycleId       String
  employeeId    String   // FK to User
  managerId     String
  type          GoalType
  title         String
  description   String   @db.Text
  metrics       String   @db.Text  // measurable success criteria
  weight        Int      // 0-100, sums to 100 across employee's goals
  status        GoalStatus @default(DRAFT)
  selfRating    Int?
  managerRating Int?
  managerComment String? @db.Text
  selfComment   String?  @db.Text
  alignedToOrgGoalId String?  // cascade alignment
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum GoalType { OKR KRA COMPETENCY VALUE STRETCH }
enum GoalStatus { DRAFT AGREED IN_PROGRESS COMPLETED PARTIAL NOT_MET ABANDONED }

model OrgGoal {
  id          String   @id @default(uuid())
  orgId       String
  cycleId     String
  parentId    String?  // tree of org goals
  ownerId     String?  // person responsible
  title       String
  description String   @db.Text
  metric      String
  target      String
}

NESTJS modules:
- AppraisalCyclesModule (admin-only CRUD, cycle lifecycle transitions)
- GoalsModule:
  - Employees create goals during GOAL_SETTING phase
  - Manager approves/edits → status AGREED
  - Org goal cascade view (tree)
  - Bulk operations: copy goals from previous cycle, distribute org goal to direct reports
- Use existing notification engine for stage transitions and deadline reminders
- Add Indian holiday calendar awareness for deadline scheduling
```

### Phase 3B: Self-Assessment + Manager Review

```
Claude Code Instruction:

Build self-assessment and manager review forms.

PRISMA additions:

model AppraisalAssessment {
  id            String   @id @default(uuid())
  cycleId       String
  employeeId    String
  managerId     String
  type          AssessmentType
  formData      Json     // structured answers per cycle's competency framework
  competencyRatings Json // { competencyKey: rating }
  goalsRollup   Json     // computed from Goal table: weighted goal score
  finalRating   Decimal? @db.Decimal(3, 2)
  ratingLabel   String?  // mirror of cycle ratingScale label
  managerSummary String? @db.Text
  selfSummary    String? @db.Text
  status        AssessmentStatus @default(DRAFT)
  submittedAt   DateTime?
  reviewedAt    DateTime?
  @@unique([cycleId, employeeId, type])
}

enum AssessmentType { SELF MANAGER SKIP_LEVEL }
enum AssessmentStatus { DRAFT SUBMITTED REVIEWED FINALISED REOPENED }

FORM ENGINE:
- Cycle defines a JSON form schema (competencies, free-text prompts, rating scales)
- Same renderer for SELF and MANAGER assessment, different field visibility
- Auto-save every 10s (debounced), draft preserved in localStorage as fallback
- Reuse Nova FormField, RatingControl (need a new component) under /frontend/src/components/appraisal

KEY FRONTEND PAGES:
1. /appraisal — employee's "my appraisal" home
   - Cards: My Goals, My Self-Assessment, Peer Feedback Requests, Status timeline
2. /appraisal/cycles/[cycleId]/assessment — combined form: goals rollup at top + competencies + free-text
3. /appraisal/team — manager's view (only visible to people-managers)
   - Table of direct reports + skip-team with their assessment status
   - Bulk reminder action
4. /appraisal/team/[employeeId]/review — manager reviews one report
   - Side-by-side: self-assessment | manager fields | peer feedback summary
   - AI suggestion panel (collapsible) — uses extended candidate-scorer agent
5. /admin/appraisal/cycles — admin cycle management
   - Step-by-step cycle creation wizard
   - Move cycle stage forward (with safety checks)
   - Reopen specific employee assessment for correction (audit logged)

AI ASSIST:
- Reuse the existing feedback_summariser agent from /ai-service
- Add new endpoint: POST /ai/v1/agents/feedback-summariser?intent=APPRAISAL_SUMMARY
  Input: self-assessment, manager-review, peer-feedback-array, goals-rollup
  Output: { strengths[], growth_areas[], suggested_rating_range, suggested_comment }
- AI suggestion is advisory; manager must review and finalise
```

### Phase 3C: 360-Degree Peer Feedback

```
Claude Code Instruction:

Add 360-degree peer feedback with anonymous response option.

PRISMA additions:

model PeerFeedbackRequest {
  id            String   @id @default(uuid())
  cycleId       String
  subjectUserId String   // person being reviewed
  reviewerUserId String  // person providing feedback
  relationship  PeerRelationship
  isAnonymous   Boolean  @default(true)
  status        FeedbackRequestStatus @default(REQUESTED)
  formData      Json?
  submittedAt   DateTime?
  declinedReason String?
  requestedById String   // who asked (subject themselves or manager)
  requestedAt   DateTime @default(now())
  @@unique([cycleId, subjectUserId, reviewerUserId])
}

enum PeerRelationship { PEER REPORT MANAGER SKIP_LEVEL CROSS_FUNCTIONAL EXTERNAL }
enum FeedbackRequestStatus { REQUESTED ACCEPTED DECLINED SUBMITTED EXPIRED }

WORKFLOW:
1. PEER_FEEDBACK cycle stage — employees nominate 3-5 peers
2. Manager approves nomination list (can add/remove)
3. System sends anonymous feedback request — reviewer hits a tokenised URL
4. Reviewer fills form (3-5 short questions max — keep friction low)
5. On SUBMITTED, store formData. UI never reveals reviewer identity to subject or manager
   when isAnonymous=true. Only the AI summariser sees reviewer names (for de-duping inputs).

AGGREGATION:
- Manager review form pulls a "Peer Feedback Summary" section
- For anonymous feedback, show only aggregated themes + verbatim quotes (no names)
- Run AI feedback_summariser to extract themes; minimum 3 responses required to show summary

GUARDRAILS:
- Reviewer cannot see subject's self-assessment or other reviewers' input
- Subject cannot see individual peer responses; only aggregated themes (after manager review locks)
- Add abuse detection: flag responses with toxic language (use Claude moderation prompt)
```

### Phase 3D: Calibration & Rating Distribution

```
Claude Code Instruction:

Build the calibration meeting tool — the most political and consequential UX in the product.

PRISMA additions:

model CalibrationSession {
  id              String   @id @default(uuid())
  cycleId         String
  groupName       String   // "Engineering - L4-L6"
  facilitatorId   String   // typically HRBP
  participantUserIds String[]  // managers attending
  scope           Json     // filters: { departments, levels, locations }
  targetDistribution Json  // { "5": 10, "4": 25, "3": 50, "2": 12, "1": 3 } as percentages
  actualDistribution Json  // computed from current ratings
  status          CalibrationStatus @default(SCHEDULED)
  scheduledAt     DateTime
  completedAt     DateTime?
  decisionLog     Json     // [{ employeeId, oldRating, newRating, reason, decidedById, decidedAt }]
}

enum CalibrationStatus { SCHEDULED IN_PROGRESS COMPLETED CANCELLED }

CALIBRATION UI (/appraisal/calibration/[sessionId]):
1. Live bell-curve chart on top — current vs target distribution
2. Drag-and-drop board grouped by rating column (5 columns: 1–5)
   - Each card: employee name, role, manager, current rating, key goal achievement %
   - Drag to a different rating column → opens "Reason for change" modal (required)
   - Real-time bell curve updates as cards move
3. Filter sidebar: by department, level, manager, gender (for equity check)
4. Alerts:
   - "Force-fit" warning if more than 10% of participants moved
   - "Equity flag" if any demographic slice deviates >2σ from cohort mean
5. Lock & Finalise button (facilitator only) — freezes ratings
6. Export decision log as audit-grade PDF

POST-CALIBRATION COMMUNICATION:
- After lock, transition cycle stage to COMMUNICATED
- Generate per-employee summary (rating + key feedback themes + goals for next cycle)
- Manager must conduct 1-on-1 before system reveals rating to employee
- Track "communication acknowledged" by both manager and employee
- Open Comp Engine (Phase 4) cycle once all employees in the cycle are COMMUNICATED
```

**Phase 3 exit criteria:**
- [ ] Run a full mid-year cycle on a 200-employee staging tenant
- [ ] 360 anonymous peer feedback completed without identity leak
- [ ] Calibration session reduces rating bias (validated by HR data analyst)
- [ ] All flows mobile-responsive (PWA from Phase 5 not required yet but design now)

---

## Phase 4: Compensation Engine — Hike & Bonus (Months 11–13)

**Goal:** Distribute a fixed appraisal budget into per-employee hike and bonus amounts based on rating, with manager override and multi-level approval.

**New module:** `backend/src/modules/compensation` (extend Compensation model from Phase 1)

### Phase 4A: Budget Configuration & Rating Matrix

```
Claude Code Instruction:

Build budget configuration and rating-to-hike matrix.

PRISMA additions:

model AppraisalBudget {
  id            String   @id @default(uuid())
  orgId         String
  cycleId       String   @unique
  hikePoolINR   Decimal  @db.Decimal(14, 2)
  bonusPoolINR  Decimal  @db.Decimal(14, 2)
  splits        Json     // [{ scope: { department, level }, hikeINR, bonusINR }]
  matrix        Json     // ratingToHikePercent: { "5": 15, "4": 10, "3": 6, "2": 2, "1": 0 }
  bonusMatrix   Json     // ratingToBonusMonths: { "5": 2, "4": 1, "3": 0.5, "2": 0, "1": 0 }
  marketCorrection Json  // [{ scope, adjustmentPercent, reason }]
  retentionRules Json    // [{ riskTier, additionalPercent }] — tag flight-risk employees
  status        BudgetStatus @default(DRAFT)
  approvedById  String?
  approvedAt    DateTime?
}

enum BudgetStatus { DRAFT IN_REVIEW APPROVED LOCKED DISTRIBUTED CLOSED }

model CompensationRevision {
  id              String   @id @default(uuid())
  cycleId         String
  employeeId      String
  currentFixed    Decimal  @db.Decimal(12, 2)
  currentVariable Decimal  @db.Decimal(12, 2)
  rating          Decimal  @db.Decimal(3, 2)
  computedHikePct Decimal  @db.Decimal(5, 2)
  computedHikeINR Decimal  @db.Decimal(12, 2)
  computedBonusINR Decimal @db.Decimal(12, 2)
  finalHikePct    Decimal  @db.Decimal(5, 2)
  finalHikeINR    Decimal  @db.Decimal(12, 2)
  finalBonusINR   Decimal  @db.Decimal(12, 2)
  newFixed        Decimal  @db.Decimal(12, 2)
  newVariable     Decimal  @db.Decimal(12, 2)
  effectiveDate   DateTime
  managerComment  String?  @db.Text
  overrideReason  String?  @db.Text
  approvalChain   Json
  status          RevisionStatus @default(DRAFT)
  letterUrl       String?
  letterIssuedAt  DateTime?
  @@unique([cycleId, employeeId])
}

enum RevisionStatus { DRAFT MANAGER_REVIEW DIRECTOR_APPROVAL CHRO_APPROVAL CEO_APPROVAL APPROVED LOCKED COMMUNICATED }

ADMIN UI (/admin/compensation/cycles/[cycleId]):
1. Budget setup wizard:
   - Step 1: Total pool (₹) for hike + bonus
   - Step 2: Split by department/level (drag-slider or table)
   - Step 3: Rating-to-hike matrix (default fills with industry benchmarks)
   - Step 4: Market correction overrides (specific bands needing top-up)
   - Step 5: Retention rules (flag-based bumps)
   - Step 6: Review & Lock
2. Validation: total splits must equal pool ± 1%; no negative percents; matrix monotonic
   (higher rating ≥ lower rating hike)
```

### Phase 4B: Auto-Allocation Algorithm

```
Claude Code Instruction:

Implement the constraint-aware auto-allocation. This is the highest-risk module — invest in tests.

ALGORITHM (in /backend/src/modules/compensation/services/allocator.service.ts):

Inputs:
- AppraisalBudget (pools, matrix, splits, market correction, retention rules)
- List of employees in cycle (with rating, department, level, current comp, retention flag)

Steps:
1. For each employee, compute "base_hike = currentFixed * matrix[rating] / 100"
2. Apply market correction: if employee's scope matches a correction rule, multiply by adjustment
3. Apply retention bump: if employee.retentionRiskTier is in retentionRules, add additionalPercent
4. Sum total computed hike per scope (department/level group); compute scope_overrun = sum - scope_budget
5. If scope_overrun > 0:
   - Proportionally trim hikes within the scope, weighted inverse to rating (top performers protected)
   - Use binary search to find the scaling factor that fits the budget within ±0.5%
6. Bonus computation: bonusMonths × (currentFixed/12), then same proportional fitting
7. Output CompensationRevision rows with computed* fields populated; final* equals computed* initially

WRITE THIS WITH:
- Full unit tests covering edge cases:
  * Underspend (allocations below budget) — leave unallocated, surface to admin
  * All-employees-rated-5 (forced compression)
  * Single department vs multi-scope budgets
  * Floor: never give negative or below-minimum-wage
  * Ceiling: never exceed 50% hike (configurable cap)
- Integration tests with snapshotted golden outputs
- Run allocator within a Postgres SERIALIZABLE transaction

API:
- POST /api/v2/compensation/cycles/:cycleId/allocate — runs allocator, creates revisions
- POST /api/v2/compensation/cycles/:cycleId/reallocate — re-runs with updated budget (only allowed
  while no revisions are LOCKED)
```

### Phase 4C: Manager Override + What-If Simulator

```
Claude Code Instruction:

Build the manager review UI with override and the what-if simulator (highest-value UX).

MANAGER OVERRIDE PAGE (/compensation/team):
1. Table of direct reports + skip-team with columns:
   Employee | Rating | Current CTC | System Hike | Override Hike | Bonus | New CTC | % Change
2. Editable cells for hike % or hike ₹ (auto-converts) and bonus ₹
3. Manager total budget bar at top — turns red if overspent
4. Each override requires reason text
5. AI suggestion: button "Why this hike?" — opens drawer explaining algorithm decision for that
   employee (rating × matrix × market_correction × retention)

WHAT-IF SIMULATOR (/admin/compensation/cycles/[cycleId]/simulator):
This is the killer feature. Build it carefully.

1. Three views: Bell Curve | Department Breakdown | Equity Lens
2. Live drag-drop:
   - Drag employee from one rating bucket to another → recompute their hike + adjust budget impact
   - Slide overall pool up/down → recompute everyone proportionally
   - Slide a department's split → recompute within that department
3. Real-time computation must finish < 200ms for 5,000-employee tenant
   - Implement allocator in WebAssembly (Rust compiled to wasm) for client-side compute, OR
   - Use a streaming SSE endpoint /api/v2/compensation/simulate that returns computed deltas
4. Diff view: side-by-side before/after with red/green highlights
5. Save Snapshot — saves a named simulation; up to 10 per cycle
6. Apply Snapshot — replaces current revisions with the snapshot's values (locked behind admin)

EQUITY LENS:
- For diversity-flagged tenants, compute pay-gap before/after by gender, location
- Surface a warning if the planned distribution widens the gap
- Show "what would close the gap" suggestion (informational only)
```

### Phase 4D: Approval Chain, Letters, Payroll Export

```
Claude Code Instruction:

Multi-level approval, letter generation, payroll export.

APPROVAL CHAIN:
- Configurable per OrgSettings.compApprovalChain (default: MANAGER → DIRECTOR → CHRO → CEO)
- Each level sees aggregated view of their org tree, can approve in bulk or per-employee
- Reject sends back to previous level with comment
- Once CEO_APPROVAL completes, status → APPROVED, then admin can LOCK

LETTER GENERATION:
- Reuse the OfferRenderService built in Phase 1 with new template type "COMP_REVISION"
- Variables: oldComp, newComp, hikePercent, bonus, effectiveDate, ratingLabel, managerName, ceoSignature
- Bulk render via pg-boss queue `comp.render` (10 concurrent workers, with retry)

COMMUNICATION:
- Manager-first: system blocks employee letter delivery until manager logs that 1-on-1 was conducted
- Employee receives notification + signed PDF (encrypted; password = last 4 of phone, communicated via SMS)
- Employee acknowledgement tracking: PDF has a tap-to-acknowledge button → records timestamp

PAYROLL EXPORT:
- Endpoint: GET /api/v2/compensation/cycles/:cycleId/export?format=keka|darwinbox|zinghr|generic-csv
- Format-specific column mapping configurable in /backend/src/integrations/payroll-formats/
- Always include: employeeId, oldFixed, newFixed, oldVariable, newVariable, oneTimeBonus, effectiveDate
- Ship downloadable XLSX with audit footer (cycle name, exported by, exported at, hash)

VARIANCE REPORTS (/admin/compensation/cycles/[cycleId]/reports):
- Planned vs Actual — sum of revisions vs original budget
- Distribution shift — pre-calibration vs post-revision
- Rating-to-hike conformance — % of employees whose hike is within ±0.5% of matrix expectation
- Cost growth projection — annualised wage bill increase
```

**Phase 4 exit criteria:**
- [ ] Allocator passes 100% of golden tests (50+ scenarios)
- [ ] What-if simulator handles 5K-employee tenant with sub-200ms recompute
- [ ] Full cycle: budget → allocate → manager override → approve → letters → payroll export
- [ ] Customer pilot completes one full cycle with positive NPS

---

## Phase 5: Mobile, BI, SOC 2 & Hardening (Months 14–16)

**Goal:** Production hardening — mobile experience, custom reporting, SOC 2 Type 1, performance.

### Phase 5A: PWA Mobile Experience

```
Claude Code Instruction:

Convert the existing Next.js frontend into an installable PWA. Defer native React Native to v3.

1. Install next-pwa, configure /frontend/next.config.js with workbox runtime caching strategies:
   - StaleWhileRevalidate for API GETs
   - NetworkFirst for HTML
   - CacheFirst for static assets
2. Add manifest.json with org-customisable icons (per-tenant theming via runtime config)
3. Audit the most-used flows for mobile (Lighthouse mobile score > 90):
   - /appraisal (employee home)
   - /appraisal/cycles/[id]/assessment (self-assessment)
   - /joining/[token] (joining checklist)
   - /offer/[token] (candidate offer view)
   Add bottom-nav for /appraisal flow on screens < 768px.
4. Push notifications via web-push:
   - Stage transition notifications, approval reminders, manager 1-on-1 reminders
   - Subscribe in-app, store endpoint+keys per User
5. Offline support: queue mutations in IndexedDB, replay on reconnect for self-assessment auto-save
6. Add "Add to Home Screen" prompt for /appraisal and /joining
```

### Phase 5B: Custom Report Builder

```
Claude Code Instruction:

Build a customer-configurable BI / report builder.

1. Define ReportDefinition model:
   model ReportDefinition {
     id           String   @id @default(uuid())
     orgId        String
     name         String
     dataSource   ReportSource
     filters      Json
     groupBy      String[]
     metrics      Json     // [{ field, agg: "sum"|"avg"|"count" }]
     visualization String   // "table" | "bar" | "line" | "funnel" | "heatmap"
     scheduleCron String?  // optional scheduled email
   }
   enum ReportSource { HIRING APPLICATIONS APPRAISAL COMPENSATION BGV ATTRITION }

2. Backend ReportRunnerService — translates ReportDefinition into a Prisma query within
   org-scoped, RBAC-filtered tables. NEVER allow raw SQL from user input.

3. Frontend (/admin/reports):
   - Drag-drop builder: pick fields → pick filters → pick chart
   - Library of templates: Hiring Funnel, Time-to-Hire, Cost-per-Hire, BGV Cost,
     Appraisal Distribution, Pay Equity, Attrition Forecast
   - Schedule: daily/weekly/monthly to email or Slack
   - Export: CSV, XLSX, PDF (server-rendered via the existing puppeteer pipeline)

4. AI assist: natural language → ReportDefinition
   - Endpoint: POST /ai/v1/agents/report-builder { prompt: "show me cost-per-hire by department for FY26" }
   - Returns a draft ReportDefinition; user reviews and saves
```

### Phase 5C: Notification Expansion (WhatsApp + SMS)

```
Claude Code Instruction:

Expand the existing NotificationsModule to support SMS and WhatsApp via MSG91.

1. Add NotificationChannel enum: EMAIL | SMS | WHATSAPP | IN_APP | PUSH
2. Add UserNotificationPref model — per-user, per-event-type, per-channel toggles
3. Build MSG91 transport in /backend/src/integrations/msg91:
   - SMS via DLT-registered templates (Indian regulatory requirement)
   - WhatsApp Business API via WhatsApp Cloud or MSG91 wrapper
4. Templates registered with DLT as part of org onboarding (provide a registration helper)
5. Webhook handler for delivery receipts → update NotificationLog.deliveredAt
6. Cost tracking: per-message cost stored in NotificationLog.costInPaise
7. Honour quiet hours (per-user timezone, default 22:00–07:00)
```

### Phase 5D: SOC 2 Type 1 Readiness

```
Claude Code Instruction:

Prepare the platform for SOC 2 Type 1 audit.

ENGINEERING CONTROLS (build):
1. Centralised logging:
   - All HTTP requests, all DB writes, all auth events to a structured log stream
   - Ship to a separate write-only S3 bucket with object lock (1-year retention)
   - Tamper-evident: hash chain (each log line includes hash of previous)
2. RBAC review:
   - Document every permission, every endpoint, every guard
   - Add periodic access review (quarterly): export of all users + their roles + last login
3. Secret management:
   - Audit: no secret in code, no secret in container env layers (use AWS Secrets Manager refs)
   - Rotation policy: 90 days for API keys, 180 days for service credentials
4. Encryption:
   - At rest: RDS + S3 encryption (AES-256, customer-managed keys for enterprise tier)
   - In transit: TLS 1.2+ enforced, internal services mTLS
   - Sensitive fields (PAN, Aadhaar) encrypted column-level via pgcrypto
5. Backup & DR:
   - Automated daily Postgres snapshots, retained 30 days
   - Cross-region replica for enterprise tenants
   - Documented RTO 4h, RPO 1h
   - Quarterly DR drills
6. Vulnerability management:
   - Snyk in CI for dep vulns
   - SAST: SonarQube on every PR
   - DAST: ZAP scan on staging weekly
7. Incident response:
   - Runbook in /docs/runbooks/incident-response.md
   - PagerDuty integration for critical alerts
   - Post-incident review template

PROCESS CONTROLS (document):
1. Access provisioning workflow (HR → IT → Manager approval)
2. Termination checklist (revoke in 24h)
3. Change management: PR template with security checklist
4. Vendor risk assessment (for Anthropic, Auth0, Digio, AuthBridge, MSG91)
5. Privacy policy + DPA template
```

### Phase 5E: Performance & Scale Hardening

```
Claude Code Instruction:

Load test and harden for 10K-employee tenants.

1. Load testing with k6 — scenarios:
   - 1000 concurrent users running self-assessment
   - 500 concurrent managers during calibration
   - 5000 employees opening compensation letters in 5-minute window
   - 200 concurrent BGV webhook arrivals
2. DB optimisations:
   - Add indices flagged by pg_stat_statements
   - Partition large tables (NotificationLog, AuditLog, AgentLog) by month
   - Read replicas for reporting/BI queries
3. Caching:
   - Redis cache for org settings, RBAC permissions, cycle metadata (TTL 5 min)
   - Frontend: SWR with 30s revalidate for dashboards
4. AI cost control:
   - Batch resume scoring: tier model selection (use Haiku for simple cases, Sonnet for complex)
   - Implement prompt caching for all agents (Anthropic prompt caching)
   - Daily cost dashboard with per-org breakdown; alerts on anomaly (>2x daily avg)
5. Front-end perf:
   - Code-split heavy routes (calibration board, simulator)
   - Defer Nova Design System chunks not needed on first paint
   - Image optimisation via next/image with S3+CloudFront
```

**Phase 5 exit criteria:**
- [ ] Lighthouse mobile score > 90 on /appraisal flows
- [ ] SOC 2 Type 1 audit kicked off
- [ ] k6 tests pass at 10K-employee scale
- [ ] AI cost per employee per cycle < ₹15

---

## Cross-Cutting Engineering Standards (apply throughout)

```
Claude Code Instruction (apply to every new module):

1. Folder structure mirrors existing /backend/src/modules pattern:
   - controllers/  (HTTP)
   - services/     (business logic)
   - dto/          (request/response DTOs with class-validator)
   - guards/       (route-level access)
   - events/       (domain events emitted to event bus)
   - tests/        (unit + integration; min 70% coverage)

2. Every controller endpoint:
   - Has Swagger annotations
   - Has at least one e2e test
   - Returns standard error envelope { code, message, details? }
   - Is org-scoped via OrgGuard (no cross-org data leak)

3. Every Prisma model:
   - Has orgId column with @@index for multi-tenancy
   - Soft-delete via deletedAt where data is meaningful to keep
   - Audit fields: createdAt, updatedAt, createdById, updatedById

4. Every AI agent:
   - Has structured input/output (Pydantic models in /ai-service)
   - Logs to AgentLog table with input hash, output, tokens, cost
   - Implements caching by input hash where deterministic
   - Has a fallback for vendor outage (returns last known good or empty + flag)

5. Every external integration:
   - Lives under /backend/src/integrations/{vendor}
   - Has a sandbox-mode toggle via env var
   - Has retry with exponential backoff (axios-retry)
   - Has webhook signature verification
   - Redacts PII in logs

6. Every new feature:
   - Behind a feature flag in OrgSettings.featureFlags
   - Documented in /docs/features/{feature-name}.md
   - Has a runbook in /docs/runbooks/ if it has external deps
```

---

## Suggested Sprint Cadence

- **Sprint length:** 2 weeks
- **Phase 1:** 6 sprints (12 weeks)
- **Phase 2:** 6 sprints (12 weeks)
- **Phase 3:** 8 sprints (16 weeks)
- **Phase 4:** 6 sprints (12 weeks)
- **Phase 5:** 6 sprints (12 weeks)

Each sprint:
- Day 1: Planning (refine PBIs from this plan)
- Day 1–9: Build with daily standup
- Day 10: Demo + retro
- Day 11–14: Buffer for stabilisation, polish, customer feedback

---

## Skip List (already implemented — DO NOT rebuild)

These are confirmed present in the current codebase. Any Claude Code work in v2 must extend, not duplicate, these:

- Auth0 integration, JWT verification middleware, Auth0Sub→User mapping
- Organization, User, Role enum, RBAC guards
- HiringPlan, JobDescription, JobPublishing models + APIs
- Public candidate apply portal at /jobs/[slug]
- Candidate, CandidateApplication, CandidateStageHistory
- AI resume scoring (nightly via pg-boss + on-demand)
- Multi-stage interview pipeline + stage interviewers
- InterviewFeedback + FeedbackSkillRating
- SelectionDecision + AI-drafted selection/rejection emails
- Skill master data (TECHNICAL, LEADERSHIP, BEHAVIOURAL, COMMUNICATION, DOMAIN)
- TrainingModule + TrainingCompletion
- DashboardInsight + analytics endpoints
- AuditLog (extend, don't replace)
- Notification engine (extend with new templates + channels in Phase 5C)
- Support portal (SupportTicket, SupportNote, SupportEscalation, SupportSession)
- Admin app (separate Next.js at port 3002)
- Nova Design System v3.28 components (use as-is)
- Docker Compose dev + prod, Nginx reverse proxy, MinIO/S3, Redis 7
- Existing 7 AI agents — extend or add new endpoints to them where noted

---

## References

- Source cost estimate: `docs/build-cost-estimate.md`
- Original architecture plan: `project-plan/plan.md`
- MVP scope: `project-plan/mvp.md`
- Auth strategy: `project-plan/auth-strategy.md`
- Branding: `project-plan/branding.md`
