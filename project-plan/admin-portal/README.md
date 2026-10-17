# Work Nucleus / QuestEdge — Admin Portal Planning Suite
# README

**Status:** Phase 0 COMPLETE — Ready for review before implementation

---

## Document Index

| # | Document | Purpose |
|---|---------|---------|
| 00 | `00-repository-audit.md` | Full codebase audit: modules, schema, findings (P0/P1/P2/P3) |
| 01 | `01-product-requirements.md` | Personas, capability matrix, functional requirements, MVP scope |
| 02 | `02-information-architecture.md` | Navigation hierarchy, route map, workflows, wireframes |
| 03 | `03-security-and-rbac.md` | Threat model, role-permission matrix, sensitive action safeguards, audit strategy |
| 04 | `04-technical-architecture.md` | App structure, new backend endpoints, data flow, ADRs |
| 05 | `05-ui-ux-specification.md` | Design tokens, component specs, page-level specs, accessibility |
| 06 | `06-implementation-roadmap.md` | Phased plan (4 phases), effort estimates, dependency map |
| 07 | `07-api-and-data-mapping.md` | All existing + new endpoints with Prisma queries, response shapes, data exclusions |
| 08 | `08-zero-cost-infrastructure-plan.md` | Free-tier analysis, upgrade triggers, keep-alive strategy |
| 09 | `09-risk-register-and-test-plan.md` | 14 risks, unit/integration/E2E/security/performance/a11y test plan |
| 10 | `10-mvp-acceptance-checklist.md` | Gate-by-gate acceptance criteria, sign-off table, post-MVP monitoring |

---

## Key Decisions

1. **Extend support-admin** — not a new app. Zero new deployment cost.
2. **SUPPORT_ADMIN ≈ Platform Ops Admin** — PLATFORM_ADMIN UserType exists but is not enforced; SUPPORT_ADMIN covers all MVP admin portal capabilities.
3. **₹0 incremental cost confirmed** — all features use existing Neon, Render, Vercel, Auth0 free tiers.
4. **Security hardening is Phase 1 gate** — three P0 findings must be resolved before any new features are added.
5. **AI service is Gemini, not Claude** — CLAUDE.md is outdated; the actual AI service uses GEMINI_API_KEY.

---

## Critical Findings Summary

### Must fix before implementation

| ID | Severity | Finding |
|----|---------|---------|
| P0-3 | CRITICAL | Two debug public endpoints in production (`test-ai`, `test-whatsapp` in mandates) |
| P0-1 | CRITICAL | AI cost internal log endpoint is `@Public()` with no rate limiting |
| P1-1 | HIGH | SecurityLog hash equality check is skipped (`void expected`) |
| P1-3 | HIGH | No rate limiting on any backend endpoint |
| P2-1 | MEDIUM | CORS production origins not configured |
| P2-2 | MEDIUM | Auth0 claim namespace inconsistency between CLAUDE.md and strategy code |

---

## Implementation Estimate

| Phase | Scope | Estimated Effort |
|-------|-------|----------------|
| Phase 1 | Security hardening | 1-2 days |
| Phase 2 | Core portal (Users + Marketplace) | 4-6 days |
| Phase 3 | Observability (AI + Audit + Security + Health) | 2-3 days |
| Phase 4 | Polish + QA | 1-2 days |
| **Total MVP** | | **~10-13 days** |

---

## Next Steps

1. Review this planning suite and approve (or raise concerns)
2. Execute Phase 1 security hardening
3. Begin Phase 2 backend implementation
4. Run integration tests before frontend work
5. Deploy Phase 2 frontend to staging
6. Complete Phases 3 & 4
7. Sign off on acceptance checklist
8. Launch

**DO NOT BEGIN IMPLEMENTATION until this planning suite is approved.**
