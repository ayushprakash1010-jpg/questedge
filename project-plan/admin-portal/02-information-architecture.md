# 02 — Information Architecture

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Architecture Decision

**Recommendation: Extend the existing support-admin application (Option B)**

The support-admin app at port 3002 already has:
- Separate Auth0 connection (isolation from customer users)
- Backend role enforcement (`SUPPORT_REP | SUPPORT_ADMIN`)
- Cross-org data access patterns established
- Sidebar, top-bar, layout, components
- Working API proxies to backend

**Why not alternatives:**

| Option | Verdict |
|--------|---------|
| A. Extend support-admin as-is | This IS Option B |
| B. Evolve support-admin into comprehensive console | ✅ RECOMMENDED |
| C. Separate platform-admin app | ❌ Adds new deployment, new Auth0 app, duplicates infrastructure |
| D. Inside customer frontend `/admin/` | ❌ Mixes customer and platform admin; same Auth0 connection |

**What "evolving" means:**
- Add new top-level nav sections (Marketplace, AI Operations, Security, System)
- Add new backend endpoints for cross-org data
- Introduce PLATFORM_ADMIN role concept (initially map to SUPPORT_ADMIN until explicit role is needed)
- Existing sections (Organizations, Tickets, Metrics, Tools) remain unchanged

---

## 2. Navigation Hierarchy

```
Support Admin Portal (port 3002)
│
├── 📊 Overview (/)
│   └── Platform dashboard — KPIs, recent orgs, open tickets, AI cost summary
│
├── 🏢 Organizations (/organizations)
│   ├── Organization list (search, filter by industry/health)
│   └── /organizations/[orgId]
│       ├── Overview tab
│       ├── Users tab
│       ├── Hiring Plans tab
│       ├── Health tab
│       └── Settings & Feature Flags tab (SUPPORT_ADMIN only)
│
├── 🎫 Tickets (/tickets)                    [EXISTING]
│   ├── Ticket list (filters: status, priority, org, assignee)
│   ├── /tickets/new
│   └── /tickets/[ticketId]
│       ├── Detail + timeline
│       ├── Notes tab
│       └── Escalations tab
│
├── 👥 Users (/users)                         [NEW]
│   ├── Cross-org user directory (search by email/name, filter by role/userType)
│   └── /users/[userId]
│       ├── Profile detail
│       ├── Activity (audit log scoped to user)
│       └── Actions: Activate/Deactivate (SUPPORT_ADMIN only)
│
├── 🏪 Marketplace (/marketplace)             [NEW]
│   ├── /marketplace/mandates
│   │   ├── All mandates (filter: status, org)
│   │   └── /marketplace/mandates/[mandateId] — detail + participation + referrals
│   ├── /marketplace/recruiters
│   │   ├── All recruiters (filter: verified, active)
│   │   └── /marketplace/recruiters/[recruiterId] — profile + rewards + referrals
│   └── /marketplace/rewards
│       ├── All reward tracking entries (filter: status, org, recruiter)
│       └── Ownership/claim disputes view
│
├── 🤖 AI Operations (/ai-operations)         [NEW]
│   ├── AI cost dashboard (platform-wide, org breakdown)
│   ├── AI call log (filterable by agent, org, status, date)
│   └── Failed calls (error messages, retry info)
│
├── 📈 Metrics (/metrics)                     [EXISTING — extend]
│   ├── Ticket volume
│   ├── SLA compliance
│   ├── Org health scores
│   └── Rep performance
│
├── 🔒 Security (/security)                   [NEW]
│   ├── Platform audit log (cross-org, with org/action/date filters)
│   ├── Security log (hash-chain viewer + integrity check button)
│   └── Admin sessions (shadow/impersonate history)
│
├── 🛠️ Tools (/tools)                         [EXISTING — extend]
│   ├── Feature flags per org
│   ├── Bulk operations
│   ├── GDPR data export
│   ├── Sessions (/tools/sessions)
│   └── Shadow viewer (/tools/shadow)
│
└── ❤️ System Health (/system-health)         [NEW]
    ├── Service status (backend /health, AI service /ai/health)
    ├── Job queue (link to pg-boss dashboard at :3003)
    └── Notification delivery failures
```

---

## 3. Route Map

| Route | Page | Auth Required | Notes |
|-------|------|--------------|-------|
| `/` | Platform Dashboard | SUPPORT_REP+ | KPI cards + quick actions |
| `/organizations` | Org Directory | SUPPORT_REP+ | Existing |
| `/organizations/[orgId]` | Org Detail | SUPPORT_REP+ | Existing — add Settings tab |
| `/tickets` | Ticket List | SUPPORT_REP+ | Existing |
| `/tickets/new` | New Ticket | SUPPORT_REP+ | Existing |
| `/tickets/[ticketId]` | Ticket Detail | SUPPORT_REP+ | Existing |
| `/users` | User Directory | SUPPORT_REP+ | New |
| `/users/[userId]` | User Detail | SUPPORT_REP+ | New |
| `/marketplace/mandates` | Mandate List | SUPPORT_REP+ | New |
| `/marketplace/mandates/[mandateId]` | Mandate Detail | SUPPORT_REP+ | New |
| `/marketplace/recruiters` | Recruiter List | SUPPORT_REP+ | New |
| `/marketplace/recruiters/[recruiterId]` | Recruiter Detail | SUPPORT_REP+ | New |
| `/marketplace/rewards` | Reward Tracking | SUPPORT_REP+ | New |
| `/ai-operations` | AI Dashboard | SUPPORT_ADMIN | New |
| `/ai-operations/logs` | AI Call Log | SUPPORT_ADMIN | New |
| `/metrics` | Support Metrics | SUPPORT_REP+ | Existing |
| `/security/audit-log` | Platform Audit Log | SUPPORT_ADMIN | New |
| `/security/security-log` | Security Chain Log | SUPPORT_ADMIN | New |
| `/security/sessions` | Admin Session History | SUPPORT_ADMIN | Moved from tools |
| `/tools` | Operations Tools | SUPPORT_ADMIN | Existing |
| `/system-health` | System Health | SUPPORT_ADMIN | New |
| `/login` | Login | Public | Existing |

---

## 4. Major Workflows

### Workflow A: Org Onboarding Audit

```
1. Dashboard → "Recently Added Organizations" card
2. Click org name → /organizations/[orgId] Overview tab
3. Check: user count, health score, open ticket count
4. If health < 60 or 0 active users → click "Create Ticket"
5. Fill ticket form (org pre-filled) → Submit
6. Ticket appears in /tickets list
```

### Workflow B: Recruiter Verification

```
1. /marketplace/recruiters → filter "Unverified"
2. Review: name, email, specializations, experienceYears, linkedinUrl
3. Click "Verify" button → confirmation modal
   - Shows: "This will mark [name] as a verified recruiter on the platform."
   - Confirm button → PATCH /api/v1/support/recruiters/:id/verify
4. Backend writes: RecruiterProfile.isVerified = true, AuditLog entry
5. Recruiter row updates to "Verified" badge
```

### Workflow C: Sensitive Action — User Deactivation

```
1. /users → search for user by email
2. Click user row → /users/[userId]
3. Review: org, role, last activity (audit log entries)
4. Click "Deactivate Account"
5. Modal appears:
   - Warning: "This will prevent [name] from accessing the platform."
   - Required reason field (min 10 chars)
   - Confirm button
6. Backend: User.isActive = false, Auth0 block via Management API, AuditLog entry
7. Success toast + user row updates to "Inactive" badge
```

### Workflow D: Reward Dispute Investigation

```
1. /marketplace/rewards → filter "DISPUTED"
2. View reward: recruiter, org, mandate, amount, status timeline
3. Click reward ID → detail view
4. Check: referral status history, consent timestamp, hire date, join date
5. Check: ClaimScope for ownership conflicts (did another recruiter refer same candidate?)
6. Click "Create Ticket" → ticket linked to reward ID in description
7. Escalate ticket to SUPPORT_ADMIN
```

### Workflow E: Incident Investigation

```
1. Alert or ticket about org issue
2. /organizations/[orgId] → check all tabs
3. If data issue: /security/audit-log → filter by orgId + date
4. If AI issue: /ai-operations/logs → filter by orgId
5. If session needed: /tools → Shadow Session → Enter orgId + reason
   - Session created: SupportSession record with type=SHADOW
   - Operator gets read-only view of org's data context
6. /security/sessions → confirm session was logged
```

---

## 5. Wireframes (Textual)

### Wireframe 1: Admin Navigation Sidebar

```
┌─────────────────────────────┐
│  ⚡ QuestEdge Admin         │
│  ────────────────────────── │
│  📊 Overview                │
│  ─── Organization ───────── │
│  🏢 Organizations           │
│  👥 Users                   │
│  ─── Operations ─────────── │
│  🎫 Tickets            (12) │
│  🏪 Marketplace             │
│  ─── Platform ───────────── │
│  🤖 AI Operations           │
│  📈 Metrics                 │
│  🔒 Security                │
│  🛠️ Tools                   │
│  ❤️ System Health            │
│  ────────────────────────── │
│  👤 Ayush (SUPPORT_ADMIN)   │
│  🔗 Back to Main App        │
└─────────────────────────────┘
```

### Wireframe 2: Executive Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│ Platform Overview                              Last 30 days ▾  │
├─────────────┬─────────────┬─────────────┬────────────────────┤
│ 47 Orgs     │ 312 Users   │ 28 Mandates │ 156 Recruiters      │
│ +3 this wk  │ 287 active  │ 14 active   │ 89 verified         │
├─────────────┴─────────────┴─────────────┴────────────────────┤
│ 23 Open Tickets │ 5 Orgs Need Attention │ ₹2,840 AI Cost (7d) │
├─────────────────────────────┬──────────────────────────────────┤
│ Recently Added Orgs         │ Open Critical/High Tickets        │
│  Acme Corp    (2 users)  →  │  #234 BGV data error    [Acme] → │
│  TechVenture  (0 users)  →  │  #231 Login fail        [Beta] → │
│  StartupX     (5 users)  →  │  #228 API timeout       [Gama] → │
│  Globex       (12 users) →  │                                   │
└─────────────────────────────┴──────────────────────────────────┘
```

### Wireframe 3: User Management

```
┌─────────────────────────────────────────────────────────────────┐
│ Users                                    [Search email/name...] │
│ Filters: Role ▾  UserType ▾  Status ▾  Org ▾                   │
├──────────────────────────────────────────────────────────────────┤
│ Name           Email                Role      Org         Status │
│ ─────────────────────────────────────────────────────────────── │
│ Priya Sharma   priya@acme.com       ADMIN     Acme Corp   ✅ Active│
│ Raj Mehta      raj@techv.com        HR        TechVenture ✅ Active│
│ Ankit Kumar    ankit@old.com        VIEWER    StartupX    ❌ Inactive│
├──────────────────────────────────────────────────────────────────┤
│ Page 1 of 16                    Showing 20 / 312    [← 1 2 → ] │
└─────────────────────────────────────────────────────────────────┘
```

### Wireframe 4: Sensitive Action — User Deactivation Confirmation

```
┌────────────────────────────────────────────────┐
│ ⚠️  Deactivate User Account                    │
│                                                │
│  User:  Raj Mehta (raj@techv.com)             │
│  Org:   TechVenture                           │
│  Role:  HR                                    │
│                                                │
│  This will:                                    │
│  • Prevent all logins immediately             │
│  • Block the Auth0 account                    │
│  • Write an audit log entry                   │
│                                                │
│  Reason (required):                           │
│  ┌──────────────────────────────────────────┐ │
│  │ Account inactive for 120+ days per ...   │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│        [Cancel]  [Deactivate Account]         │
└────────────────────────────────────────────────┘
```

### Wireframe 5: Incident Investigation Flow

```
Trigger: Customer reports cannot log in
    ↓
/organizations → find org → /organizations/[orgId]
    ↓
Users tab → find user → check isActive flag
    ↓ (active but issue persists)
/security/audit-log → filter: orgId + userId + last 24h
    ↓ (see AUTH_FAILED events in SecurityLog)
/security/security-log → verify chain integrity → OK
    ↓ (confirm no tampering)
/tools/shadow → start shadow session with reason
    ↓
Observe org data context (read-only)
    ↓
End session → session logged in /security/sessions
    ↓
Create ticket with findings
```
