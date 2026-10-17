# 01 — Product Requirements

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Product Context

Work Nucleus is a multi-tenant AI-first HR platform. The hiring module (recruitment marketplace) is the primary live vertical. Appraisal, BGV, compensation, training, and reporting are also implemented.

Two existing administration surfaces:
1. **Org-level admin** (frontend `/admin/*`) — company administrators manage their org users, settings, audit, AI cost.
2. **Support-admin app** (port 3002) — internal support staff view cross-org data, manage tickets, inspect org health, start shadow/impersonate sessions.

**Gap:** No unified platform console for: cross-org governance, marketplace oversight (mandates/recruiter verification/reward disputes), platform-wide AI cost, platform security audit.

---

## 2. Admin Personas

| Persona | Role | Frequency | Key Actions |
|---------|------|-----------|-------------|
| Platform Super Admin | CEO/CTO/Founder | Occasional | Full control, security audit, platform config |
| Platform Operations Admin | Ops/CS lead | Daily | Org health, incident investigation, recruiter verification |
| Support Agent | Support rep | Multiple/day | Read org data, manage tickets, shadow sessions |
| Read-Only Analyst | Data/reporting | Weekly | KPIs, aggregate reports |
| Finance Operator | Finance/accounting | Monthly (deferred) | Reward payout reconciliation |

---

## 3. Capability Matrix (Evidence-Based)

| Capability | Status | Evidence |
|-----------|--------|----------|
| Cross-org org listing | ✅ Implemented | `SupportController.getOrganizations` |
| Cross-org org detail | ✅ Implemented | `SupportController.getOrganizationDetail` |
| Cross-org user listing (read-only) | ✅ Implemented | `SupportController.getOrgUsers` |
| Org health metrics | ✅ Implemented | `OrgHealthMetric` model + analytics |
| Support ticket management | ✅ Implemented | Full ticket lifecycle |
| Shadow/impersonate sessions | ✅ Implemented | `SupportSession` model, logged |
| Support analytics (SLA, volume) | ✅ Implemented | `SupportAnalyticsController` |
| Feature flag management | ✅ Implemented | `ToolsService` |
| GDPR data export | ✅ Implemented | `ToolsService.exportData` |
| Platform-wide AI cost | ❌ Missing | `AiCostController` is org-scoped |
| Platform-wide audit log | ❌ Missing | `AuditController` is org-scoped |
| Mandate marketplace overview | ❌ Missing | No admin mandate view |
| Recruiter verification management | ❌ Missing | `RecruiterProfile.isVerified` exists, no admin UI |
| Reward dispute management | ❌ Missing | `RewardTracking` exists, no admin view |
| Security chain verification (cross-org) | ❌ Missing | `SecurityController` requires caller orgId |
| Candidate ownership investigation | ❌ Missing | `ClaimScope` model exists, no admin view |

---

## 4. Functional Requirements — MVP

### FR-01: Executive Overview Dashboard
- Platform-wide KPIs: total orgs, total users, active candidates, verified recruiters, active mandates, open tickets, AI cost (7/30 days)
- Data from verified existing models
- No invented or estimated metrics

### FR-02: Organization Management (EXISTING — EXTEND)
- Currently: search, detail, users, health in support-admin
- Extend: org suspension/reactivation capability (PLATFORM_ADMIN only)

### FR-03: User Management (EXTEND)
- Cross-org user search
- View user profile, role, userType, isActive, auth0Sub
- Activate/deactivate users (with reason, audit log)

### FR-04: Marketplace Operations (NEW)
- All mandates with status filter (read-only)
- All recruiters: profile, verification status, referral count
- Verify/unverify recruiter (PLATFORM_ADMIN, with audit)
- Reward tracking: status, amounts, recruiter, org (read-only)
- ClaimScope / ownership disputes (read-only)

### FR-05: Support Operations (EXISTING — no major changes)
- Already well-implemented in support-admin

### FR-06: Security and Audit (NEW)
- Platform-wide audit log (across all orgs, with org filter, action filter)
- SecurityLog viewer with chain integrity check button
- Admin session history

### FR-07: AI Operations (NEW)
- Platform-wide AiCallLog: total tokens, cost, cost by agent, cost by org, error rate
- Failed AI calls with error messages
- Per-org breakdown

### FR-08: System Health (NEW)
- Backend /health status
- AI service /ai/health status  
- pg-boss job queue link (existing dashboard at :3003)
- Recent notification delivery failures

---

## 5. Non-Functional Requirements

| Requirement | Specification |
|-------------|--------------|
| Security | Backend-enforced RBAC on all endpoints — no frontend-only guards |
| Cost | ₹0 incremental — all existing infrastructure |
| Performance | Dashboard < 3 seconds on Render free tier; paginate at 20 items/page |
| Accessibility | WCAG 2.1 AA, keyboard navigable |
| Auditability | Every state-changing action writes AuditLog entry |

---

## 6. MVP Scope

### Included in MVP (Phases 1 & 2)
- Extend support-admin with: platform-wide AI cost, audit log, recruiter mgmt, reward tracking (read-only), mandate overview, security chain check
- New backend endpoints (6-8 new controller methods)
- Security fixes: remove debug endpoints, fix SecurityLog hash equality check

### Deferred (Phase 3+)
- Finance Operator persona and payout approval
- Candidate PII right-to-erasure
- BGV override tools
- HR module admin override
- Billing/subscription management (not yet implemented in product)

---

## 7. User Journeys

### Journey 1: New org health check
Support agent → Dashboard → Recently Added Orgs → Org detail → Check health score → Create ticket if needed

### Journey 2: Recruiter verification
Ops admin → Recruiters section → Filter unverified → Review profile → Click Verify → AuditLog written

### Journey 3: Reward dispute investigation
Support agent → Rewards section → Find reward by recruiter/org → View timeline → Check ClaimScope → Escalate via ticket

### Journey 4: AI cost spike investigation
Ops admin → AI Operations → Filter by date + agent → Identify org with spike → Navigate to org → Toggle AI feature flags
