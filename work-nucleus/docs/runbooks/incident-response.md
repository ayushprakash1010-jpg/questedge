# Incident Response Runbook

> SOC 2 Type 1 control IR-1 / IR-4. Owners must update this runbook after every incident.

## Severity matrix

| Severity | Definition | Initial response time | Escalation |
|---|---|---|---|
| **SEV-1** | Customer-facing outage; data loss; security breach (active) | 15 min | PagerDuty → on-call → CTO |
| **SEV-2** | Degraded service for one tenant; failed integration affecting hiring | 1 hour | PagerDuty → on-call |
| **SEV-3** | Internal tooling broken; non-critical bug | 1 business day | Slack #incidents |

## Roles

- **Incident commander (IC)**: drives the response; the only one who declares mitigation
- **Communications lead**: customer + internal updates; runs the status page
- **Subject-matter expert (SME)**: deep on the affected system

## Detection sources

- PagerDuty (CloudWatch + Sentry)
- `/api/health`, `/api/v2/security/verify-chain`
- AI cost anomaly alert (Phase 5E dashboard)
- Customer-reported via support portal

## Standard response loop (every 15 min until resolved)

1. **Acknowledge** in PagerDuty / Slack within SLA
2. **Open incident channel** `#inc-<short-name>` and pin a status post
3. **Assess scope**:
   - What's broken? Single org or multi-tenant?
   - Is customer data at risk? (If yes — invoke breach protocol below)
   - Are background workers (pg-boss) backing up?
4. **Mitigate first** (rollback / feature flag) **before** root-causing
5. **Document timeline** in the channel — every action with timestamp
6. **Communicate** — customer comms via support portal templates; internal via #engineering

## Common mitigations

| Symptom | First mitigation |
|---|---|
| AI service down | Toggle `AI_FALLBACK_MODE=true`; existing fallbacks return rule-based output |
| MSG91 webhook failures | Disable WhatsApp notification channel via OrgSettings; SMS continues |
| pg-boss queue depth growing | Increase worker concurrency; check Postgres connection pool |
| Auth0 latency spike | Cache JWKS keys longer (default 10m → 1h); confirm with security |

## Breach protocol (suspected unauthorized access)

1. **Freeze** the affected user / token immediately (Auth0 admin)
2. **Snapshot** the SecurityLog hash chain — `GET /api/v2/security/verify-chain` per affected org
3. **Notify** legal + DPO within 1 hour (DPDP-mandated 72h notification clock starts)
4. **Preserve evidence** — copy relevant logs to the immutable audit bucket
5. **Do not** modify or delete production data until forensics has cleared

## Post-incident

- **Within 24h**: 5-bullet summary in #engineering
- **Within 5 business days**: blameless post-mortem doc with action items
- **Within 30 days**: action items completed or carried with explicit owner

## Contact list (kept up to date in 1Password)

- On-call rotation: PagerDuty schedule "Engineering Primary"
- Auth0 enterprise support: from 1Password vault entry "Auth0 Enterprise"
- Anthropic incident contact: `support@anthropic.com`
- Cloud provider: AWS Enterprise Support
- Legal / DPO: `dpo@questedge.in`
