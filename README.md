# QuestEdge — Referral-Based Hiring Marketplace

> **⚠️ Security Notice:** Never commit credentials or secrets anywhere in this repository. All credentials must be configured via environment variables or secret managers. See [`work-nucleus/DEPLOYMENT.md`](work-nucleus/DEPLOYMENT.md) for configuration instructions.

---

## 🌟 Overview

QuestEdge is an enterprise-grade, referral-driven hiring marketplace connecting companies, recruiters, and candidates with automated screening, talent pipelines, offer management, appraisal cycles, and background verification.

---

## 🏗️ Repository Architecture

The monorepo contains the following core services:

```
work-nucleus-ai/
├── .github/workflows/          # Continuous Integration pipeline (type-check, build, test)
├── work-nucleus/
│   ├── backend/                # NestJS 10 REST API (PostgreSQL + Prisma, Auth0, Redis, BullMQ)
│   ├── frontend/               # Next.js 14 Web Application (App Router, TailwindCSS, Lucide)
│   ├── support-admin/          # Platform Support Portal (Next.js 14, system administration)
│   ├── ai-service/             # Python FastAPI service for advanced AI screening & JD tasks
│   └── DEPLOYMENT.md           # Production deployment & environment variable runbook
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js `>= 20.x`
- PostgreSQL `>= 15.x`
- Redis (optional, for background job queues)

### 1. Backend Setup
```bash
cd work-nucleus/backend
npm install
npx prisma generate
npm run start:dev
```
The API starts on `http://localhost:3000`. Swagger docs available at `http://localhost:3000/api/docs`.

### 2. Frontend Setup
```bash
cd work-nucleus/frontend
npm install
npm run dev
```
The application opens at `http://localhost:3001`.

### 3. Support Admin Setup
```bash
cd work-nucleus/support-admin
npm install
npm run dev
```
The administration portal opens at `http://localhost:3002`.

---

## 🔒 Security & Architecture Highlights

- **Multi-Tenant Isolation:** All candidate pipelines, decisions, feedback, offers, and JDs are scoped by tenant organization ID (`orgId`).
- **Fail-Fast Environment Validation:** In production (`NODE_ENV=production`), the backend verifies required secrets and blocks insecure placeholder defaults at boot time.
- **Request Tracing & Redaction:** Every HTTP transaction is tracked with correlation IDs (`x-request-id`), and sensitive query parameters/tokens are redacted from stdout logs.
- **Security Headers:** Enforces `nosniff`, `DENY` framing, referrer policies, and HSTS.
- **File Upload Protection:** Direct resume uploads inspect magic bytes (PDF, DOC, DOCX) and sanitize object storage keys against path traversal.