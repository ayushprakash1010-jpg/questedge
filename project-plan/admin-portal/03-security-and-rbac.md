# 03 — Security and RBAC

**Project:** Work Nucleus / QuestEdge Admin Portal  
**Version:** 1.0 — Phase 0 Planning

---

## 1. Threat Model

### Assets

| Asset | Sensitivity | Location |
|-------|-------------|----------|
| All customer PII (names, emails, phones) | HIGH | `users`, `candidates`, `candidate_profiles` |
| Candidate financial data (CTC, comp revisions) | HIGH | `compensations`, `comp_revisions` |
| BGV reports and consent data | VERY HIGH | `bgv_profiles`, `bgv_checks` |
| Auth0 credentials and session tokens | CRITICAL | Auth0 tenant |
| Organization data and settings | MEDIUM | `organizations`, `org_settings` |
| Recruiter profiles and earnings | HIGH | `recruiter_profiles`, `reward_tracking` |
| Audit logs and security logs | HIGH | `audit_logs`, `security_logs` |
| AI usage and cost data | MEDIUM | `ai_call_logs` |
| Support session recordings | HIGH | `support_sessions` |
| Internal API key | CRITICAL | Env vars |
| Database credentials | CRITICAL | Env vars / Neon |

### Trust Boundaries

```
[Public Internet]
       │
       ▼ HTTPS
[Vercel Edge — support-admin Next.js]
       │
       │ HTTPS + Auth0 JWT (Bearer token, support connection only)
       ▼
[Render — NestJS Backend]  ←──X──── [Public Internet cannot reach directly]
       │
       ├── [PostgreSQL / Neon]
       ├── [Redis / Upstash]  
       ├── [AI Service FastAPI — internal network only]
       └── [Auth0 Management API]
```

### Attacker Profiles

| Attacker | Capability | Target |
|---------|------------|--------|
| Unauthenticated internet attacker | HTTP only | Public endpoints, auth bypass |
| Authenticated customer user | Valid JWT, customer App connection | Escalate to support role, cross-org data |
| Compromised support agent account | Valid support JWT | Abuse shadow/impersonate, data extraction |
| Internal bad actor | Direct DB access, internal network | Tamper with audit log, extract PII |
| Supply chain attacker | npm/pip compromise | Code injection |

### Attack Scenarios and Mitigations

| Scenario | Mitigation |
|----------|-----------|
| Customer JWT used to call support endpoints | Auth0 connection isolation — support tokens issued from separate connection; backend verifies `@Roles(SUPPORT_REP, SUPPORT_ADMIN)` |
| Support agent escalates own role via API | `PATCH /api/v1/users` is org-scoped; support agent cannot modify their own `Role` column without ADMIN in the same org |
| SSRF via shadow session | Shadow sessions only create a SupportSession record — they do not proxy requests; no server-side fetch of internal org URLs |
| Audit log tampering | `SecurityLog` is hash-chained; hash equality check (once fixed per P1-1) will detect insertions/modifications |
| Fake AI cost log injection | `POST /api/v2/ai-cost/internal/log` is `@Public()`; must add rate limiting and/or IP allowlist (P0-1) |
| Bulk export of all candidate PII | GDPR export requires SUPPORT_ADMIN role; export writes to AuditLog; pagination prevents unbounded dumps |
| Impersonation abuse | Requires SUPPORT_ADMIN role; creates SupportSession with actor, target, reason, IP; endedAt logged |

---

## 2. Role-Permission Matrix

### Existing Roles (Backend Prisma enum)

```
Role: ADMIN | HR | HIRING_MANAGER | INTERVIEWER | VIEWER | SUPPORT_REP | SUPPORT_ADMIN
UserType: CANDIDATE | RECRUITER | COMPANY_ADMIN | COMPANY_USER | PLATFORM_ADMIN
```

For the admin portal we map to:

| Portal Role | Backend Role Used | Description |
|-------------|-----------------|-------------|
| Platform Super Admin | SUPPORT_ADMIN + UserType.PLATFORM_ADMIN (new) | Full control |
| Platform Operations Admin | SUPPORT_ADMIN | Cross-org read + recruiter verify + feature flags |
| Support Agent | SUPPORT_REP | Read-only cross-org + ticket mgmt + shadow session |
| Read-Only Analyst | SUPPORT_REP (restricted actions in FE) | KPIs only |

**Note:** `PLATFORM_ADMIN` UserType exists in the schema but is not enforced by any guard. For MVP, we treat `SUPPORT_ADMIN` as equivalent. When `PLATFORM_ADMIN` is formally needed, a new guard check can be added to the specific endpoints.

### Permission Matrix

| Resource / Action | SUPPORT_REP | SUPPORT_ADMIN | Notes |
|------------------|-------------|---------------|-------|
| View dashboard KPIs | ✅ | ✅ | |
| List organizations | ✅ | ✅ | |
| View org detail | ✅ | ✅ | |
| View org users | ✅ | ✅ | Read-only |
| View org hiring plans | ✅ | ✅ | Read-only |
| View org health | ✅ | ✅ | |
| Update org feature flags | ❌ | ✅ | SUPPORT_ADMIN only |
| Export org data (GDPR) | ❌ | ✅ | SUPPORT_ADMIN only |
| Suspend/reactivate org | ❌ | ✅ | Phase 3+ |
| View all users (cross-org) | ✅ | ✅ | New endpoint needed |
| View user detail | ✅ | ✅ | |
| Deactivate user | ❌ | ✅ | With reason + AuditLog |
| View all tickets | ✅ | ✅ | |
| Create ticket | ✅ | ✅ | |
| Update ticket | ✅ | ✅ | |
| Assign ticket | ✅ | ✅ | |
| Escalate ticket | ✅ | ✅ | |
| Close/resolve ticket | ✅ | ✅ | |
| Start shadow session | ✅ | ✅ | Both roles |
| Start impersonation session | ❌ | ✅ | SUPPORT_ADMIN only |
| View session history | ✅ | ✅ | |
| View all mandates | ✅ | ✅ | Read-only, new endpoint |
| View mandate detail | ✅ | ✅ | Read-only |
| View all recruiters | ✅ | ✅ | |
| Verify recruiter | ❌ | ✅ | With AuditLog |
| Unverify recruiter | ❌ | ✅ | With AuditLog |
| Deactivate recruiter | ❌ | ✅ | With AuditLog |
| View reward tracking | ✅ | ✅ | |
| Approve reward payout | ❌ | ❌ | Deferred (Finance Operator) |
| View platform audit log | ❌ | ✅ | New endpoint needed |
| View security log | ❌ | ✅ | New endpoint needed |
| Verify security chain | ❌ | ✅ | |
| View platform AI cost | ❌ | ✅ | New endpoint needed |
| View AI call log | ❌ | ✅ | |
| View system health | ✅ | ✅ | |
| Execute bulk operations | ❌ | ✅ | |
| Bulk action: close old tickets | ❌ | ✅ | Existing |
| Bulk action: deactivate inactive users | ❌ | ✅ | Existing |
| Support analytics | ✅ | ✅ | |

---

## 3. Tenant Isolation for Admin Portal

### Principle
Support-admin staff must not become de facto org administrators. They can:
- **Read** cross-org data (verified by SUPPORT_REP role gate)
- **Diagnose** via shadow sessions (no mutations to org data during shadow)
- **Modify** org-level feature flags (scoped: only the org's settings JSON is updated)
- **Deactivate** users (modifies `User.isActive`, not org policies)

They must NOT:
- Issue JWTs on behalf of org users
- Modify org financial records directly
- Change org RBAC within the org's own admin panel
- Access private candidate documents (BGV reports) without a justified session

### Insecure Direct Object References
- New admin endpoints must use `orgId` from an internal lookup, not from path/query params where possible
- For user deactivation: backend fetches user by ID, verifies the calling user is SUPPORT_ADMIN before proceeding

---

## 4. Session Management

| Aspect | Current State | Required for Admin |
|--------|--------------|-------------------|
| Session duration | Auth0 default (varies) | Short-lived tokens (1h access token) |
| Refresh | Auth0 refresh token | Configured via Auth0 application settings |
| Support app session | Separate Auth0 connection | Already isolated |
| Shadow session audit | `SupportSession` model, all fields logged | Sufficient |
| Impersonation audit | `SupportSession` with IMPERSONATE type | Sufficient |

---

## 5. Sensitive Operations — Additional Safeguards

| Operation | Safeguards Required |
|-----------|-------------------|
| User deactivation | Confirm dialog with required reason, AuditLog write, Auth0 block via Management API |
| Recruiter verify/unverify | Confirm dialog, AuditLog write |
| Recruiter deactivation | Confirm dialog with reason, AuditLog write |
| Feature flag change | Confirm dialog (show current + new values), AuditLog write |
| Bulk user deactivation | Multi-step confirm (count shown), AuditLog write with full user list |
| GDPR data export | SUPPORT_ADMIN role, AuditLog write, rate limit (1 export/org/hour) |
| Impersonation | SUPPORT_ADMIN only, mandatory reason, SupportSession created, max 1 hour duration |
| Security chain verify | Read-only, no mutation needed |

---

## 6. Audit Strategy

### What must be audited

Every action that mutates data from the admin portal must write an `AuditLog` entry with:
- `orgId` — the affected org (or "platform" for cross-org actions)
- `userId` — the acting support user
- `action` — e.g., `ADMIN_USER_DEACTIVATED`, `RECRUITER_VERIFIED`, `FEATURE_FLAG_UPDATED`
- `entityType` — e.g., `USER`, `RECRUITER_PROFILE`, `ORG_SETTINGS`
- `entityId` — UUID of the affected record
- `changes` — JSON diff (before/after for key fields)
- `ipAddress` — from request

### Security events that trigger SecurityLog

- `ROLE_CHANGED` — when support admin changes a user role
- `SECRET_ACCESSED` — if any sensitive credential surface is accessed
- `DATA_EXPORTED` — on GDPR export
- `CONFIG_CHANGED` — on feature flag change

### Audit log retention

Current `AuditLog` model has no `deletedAt` or retention policy. For MVP, retain indefinitely. Add retention policy in Phase 5.

---

## 7. Security Acceptance Criteria

Before the admin portal can be launched:

- [ ] All new admin backend endpoints enforce `@Roles(SUPPORT_REP)` or `@Roles(SUPPORT_ADMIN)` — never `@Public()`
- [ ] Debug endpoints removed: `GET /mandates/test-ai`, `GET /mandates/test-whatsapp`
- [ ] SecurityLog hash equality check implemented (not just chain pointer check)
- [ ] `POST /api/v2/ai-cost/internal/log` protected by rate limiting or IP restriction
- [ ] All mutating admin actions write AuditLog entries
- [ ] Impersonation sessions time-limited (endedAt set after max 1 hour)
- [ ] CORS production origins configured in `main.ts`
- [ ] Auth0 claim namespace verified consistent between Login Action and `auth0-jwt.strategy.ts`
- [ ] No sensitive data (API keys, tokens, passwords) appears in any admin UI or API response
- [ ] Password/token fields not returned in user list or detail endpoints
