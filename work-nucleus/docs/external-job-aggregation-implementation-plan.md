# QuestEdge: External Job Aggregation & Candidate Job Discovery
## Comprehensive Implementation Plan

**Version:** 1.0  
**Date:** November 2026  
**Author:** Technical Architecture Team  
**Status:** Planning Phase — No Code Changes Yet

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Phase 1: Codebase Audit Results](#2-phase-1-codebase-audit-results)
3. [Phase 2: Job Data Source Research](#3-phase-2-job-data-source-research)
4. [Phase 3: System Architecture](#4-phase-3-system-architecture)
5. [Phase 4: Candidate-Side User Experience](#5-phase-4-candidate-side-user-experience)
6. [Phase 5: Application Workflow](#6-phase-5-application-workflow)
7. [Phase 6: Database & Backend Design](#7-phase-6-database--backend-design)
8. [Phase 7: Frontend Design](#8-phase-7-frontend-design)
9. [Phase 8: Implementation Roadmap](#9-phase-8-implementation-roadmap)
10. [Phase 9: Zero-Cost Strategy](#10-phase-9-zero-cost-strategy)
11. [Phase 10: Safety & Testing](#11-phase-10-safety--testing)

---

## 1. Executive Summary

### Objective
Integrate an **External Job Aggregation & Discovery** module into QuestEdge so candidates can discover jobs from multiple external platforms (LinkedIn, Naukri, Indeed, Greenhouse, Lever, etc.) directly within the QuestEdge candidate portal — without visiting multiple job portals.

### Strategy
Build a **legally compliant, zero-cost MVP** using:
1. **Keyless ATS Public APIs** (Greenhouse, Lever, Ashby) — 100% free, no authentication
2. **Careerjet India Publisher API** — free publisher tier covering domestic Indian jobs
3. **JSearch API via RapidAPI** — 200 free calls/month accessing Google for Jobs index
4. **Remote Job APIs** (Jobicy, Remotive, RemoteOK) — 100% free, keyless
5. **Google for Jobs Indexing API** — free inbound traffic generation via Schema.org structured data

### Key Constraints
- **Zero additional cost** for MVP
- **No unauthorized scraping** — only official APIs and public endpoints
- **Additive changes only** — existing functionality must not break
- **Existing design system** — no new UI frameworks
- **Indian market priority** — primary focus on Indian tech jobs

---

## 2. Phase 1: Codebase Audit Results

### 2.1 Architecture Overview

| Layer | Technology |
|---|---|
| Backend Framework | NestJS 10 (TypeScript) |
| ORM & Database | Prisma ORM 5+ with PostgreSQL |
| Authentication | Auth0 RS256 JWT with JWKS verification |
| Background Jobs | pg-boss (Postgres-native queue with cron) |
| Caching | In-memory LRU (HotCacheService) + Redis-ready |
| AI/ML | Google Gemini (`gemini-flash-latest`) direct + Python FastAPI microservice |
| File Storage | AWS S3 / MinIO |
| Email | Resend SDK |
| Frontend | Next.js 14 App Router, React 18, Tailwind CSS |
| Auth (Frontend) | @auth0/nextjs-auth0 |

### 2.2 Backend Module Inventory (49 Modules)

Key modules relevant to job aggregation:

| Module | Purpose | Reusability for Job Aggregation |
|---|---|---|
| `candidate-portal` | Candidate profiles, resume upload, job discovery, saved jobs, applications | **HIGH** — Core candidate infrastructure to extend |
| `mandates` | Public job postings, marketplace openings, recruiter pools | **HIGH** — Reference for job data model |
| `ai-matching` | Heuristic + Gemini AI fit scoring between candidates and mandates | **HIGH** — Extend to score external jobs |
| `applications` | Internal ATS application lifecycle tracking | **MEDIUM** — Reference for application tracking |
| `job-queue` | pg-boss background queue with cron scheduling | **HIGH** — Reuse for sync workers |
| `cache` | In-memory LRU cache with TTL | **HIGH** — Cache external job results |
| `notifications` | In-app + push + email notifications | **MEDIUM** — Notify on new matching jobs |
| `search` | Full-text candidate and mandate search | **MEDIUM** — Extend for external job search |
| `publishing` | Multi-board job publishing (LinkedIn, Indeed, Naukri) | **LOW** — Outbound publishing, not inbound aggregation |
| `public-apply` | Public careers portal for unauthenticated applications | **LOW** — Different flow |
| `skills` | Master skill taxonomy | **HIGH** — Normalize extracted skills |

### 2.3 Existing Candidate Data Model

**`CandidateProfile`** (Global Candidate Identity):

| Field | Type | Matching Relevance |
|---|---|---|
| `skills` | JSON string array | **Primary** — skill-to-skill matching |
| `experienceYears` | Decimal(4,1) | **Primary** — experience range matching |
| `currentLocation` | String | **Primary** — location matching |
| `preferredLocations` | JSON array | **Primary** — location preference matching |
| `workModel` | String (Remote/Hybrid/On-site) | **Primary** — work mode matching |
| `currentCtc` | Decimal(12,2) | **Secondary** — salary range matching |
| `expectedCtc` | Decimal(12,2) | **Secondary** — salary expectation matching |
| `noticePeriodDays` | Integer | **Secondary** — availability matching |
| `preferredRoles` | JSON array | **Primary** — role title matching |
| `preferredIndustries` | JSON array | **Secondary** — industry matching |
| `currentDesignation` | String | **Secondary** — seniority matching |
| `education` | JSON array | **Tertiary** — education matching |
| `headline` | String | **Tertiary** — semantic matching |

### 2.4 Existing Mandate (Job) Data Model

**`Mandate`** fields relevant for external job normalization:

| Field | Type | External Job Equivalent |
|---|---|---|
| `title` | String | Job title |
| `description` | Markdown text | Job description |
| `mandatorySkills` | JSON string array | Required skills |
| `preferredSkills` | JSON string array | Nice-to-have skills |
| `location` | String | Office location |
| `workModel` | String | Remote/Hybrid/On-site |
| `employmentType` | String | Full-time/Part-time/Contract |
| `compensationMin` | Decimal(12,2) | Salary range min |
| `compensationMax` | Decimal(12,2) | Salary range max |
| `currency` | String (default "INR") | Salary currency |
| `requiredExperience` | String | Experience requirement |
| `numberOfOpenings` | Integer | Headcount |
| `applicationDeadline` | DateTime? | Expiry date |

### 2.5 Existing Candidate Job Discovery Flow

The candidate portal already has a mature job discovery system at `/candidate/jobs`:

1. **Browse All** — Paginated internal mandates with keyword search
2. **AI Recommended** — Gemini AI-ranked mandates via `/api/v1/ai-matching/candidate/recommendations`
3. **Saved Jobs** — Bookmark toggle stored in `SavedJob` table
4. **AI Match Modal** — 4-dimensional fit breakdown (Skills 40pts, Experience 25pts, Role 20pts, Preferences 15pts)
5. **Direct Apply** — Modal with cover letter, auto-provisions `CandidateApplication`

> [!IMPORTANT]
> The existing job discovery UI and matching engine provide an excellent foundation. External jobs can be integrated as a new tab or section alongside the existing "Browse All" and "AI Recommended" tabs.

### 2.6 Existing Infrastructure

| Component | Status | Reusable for Aggregation |
|---|---|---|
| **pg-boss Queue** | Active (resume scoring worker exists) | ✅ Add `external-jobs-sync` cron worker |
| **HotCacheService** | Active (5,000-key LRU) | ✅ Cache external API responses |
| **AiMatchingService** | Active (heuristic + Gemini dual-mode) | ✅ Extend for external job matching |
| **Skills taxonomy** | Active | ✅ Normalize extracted skills |
| **Notification system** | Active (in-app + push + email) | ✅ New job match alerts |
| **SavedJob model** | Active | ⚠️ Currently tied to mandateId — needs extension |

### 2.7 Gaps Identified

| Gap | Impact | Resolution |
|---|---|---|
| No `ExternalJob` database model | Cannot store aggregated jobs | Create new Prisma model |
| No deduplication engine | Duplicate listings across sources | URL normalization + composite hash |
| No skill extraction from free-text | Can't match unstructured JDs | Gemini AI or dictionary-based extraction |
| SavedJob tied to mandateId only | Can't bookmark external jobs | Add optional `externalJobId` field |
| Match scores are transient (memory cache) | Can't pre-compute for thousands of jobs | Pre-computed match index with pg-boss |
| No click/redirect telemetry | Can't track external apply conversions | New `ExternalJobClick` model |
| No job staleness checker | Expired external links stay visible | pg-boss cron worker for expiration |

---

## 3. Phase 2: Job Data Source Research

### 3.1 Master Comparison Table

| # | Source | Integration Method | Free? | Auth Required | India Coverage | Application Method | Recommendation |
|---|---|---|---|---|---|---|---|
| 1 | **LinkedIn Jobs** | Partner API only | ❌ Enterprise only | OAuth 2.0 Partner | Dominant | Apply with LinkedIn | ❌ Skip — closed ecosystem |
| 2 | **Naukri.com** | Enterprise ATS API | ❌ Paid only | Enterprise Key | #1 Market Leader | Redirect / One-Click | ❌ Skip — scraping illegal under IT Act |
| 3 | **Indeed** | Publisher API (dead) | ❌ Deprecated | OAuth 2.0 Partner | Very High | Indeed Apply | ❌ Skip — API shut down |
| 4 | **Foundit** | Enterprise API | ❌ Paid only | OAuth 2.0 | High | Redirect / ATS sync | ❌ Skip — enterprise contract required |
| 5 | **Internshala** | None exists | ❌ No API | N/A | #1 for Interns | On-platform only | ❌ Skip — no API, scraping forbidden |
| 6 | **Wellfound** | Legacy API dead | ❌ Shut down | Gated ATS Partner | High (startups) | Wellfound apply | ❌ Skip — API discontinued |
| 7 | **Greenhouse** | Public Board API | ✅ **100% Free** | **None (keyless)** | High (tech/unicorns) | Redirect to apply URL | ✅ **MVP Source #1** |
| 8 | **Lever** | Public Postings API | ✅ **100% Free** | **None (keyless)** | Moderate-High | Redirect / POST apply | ✅ **MVP Source #2** |
| 9 | **Ashby** | Public Board API | ✅ **100% Free** | **None (keyless)** | Rapidly Growing | Redirect to apply URL | ✅ **MVP Source #3** |
| 10 | **Arbeitnow** | Public API | ✅ Free | None | Very Low (EU focus) | Redirect | ⚠️ Low India relevance |
| 11 | **Remotive** | Public API | ✅ Free (2 req/min) | None | Moderate (remote) | Redirect | ✅ **MVP Source #5** |
| 12 | **RemoteOK** | Public JSON feed | ✅ Free | None (custom UA) | Moderate (remote) | Redirect | ✅ **MVP Source #5** |
| 13 | **JSearch (RapidAPI)** | REST API | ✅ 200 req/mo free | RapidAPI Key | **Very High** | Direct apply link | ✅ **MVP Source #4** |
| 14 | **Adzuna** | REST API | ⚠️ 14-day trial only | App ID + Key | High (`country=in`) | Redirect via tracking | ⚠️ Non-commercial on free tier |
| 15 | **The Muse** | Public API | ✅ Free (500 req/hr) | Optional key | Negligible (US only) | Redirect | ❌ Skip — no India coverage |
| 16 | **Jobicy** | Public API | ✅ **100% Free** | **None (keyless)** | Moderate (APAC remote) | Redirect | ✅ **MVP Source #5** |
| 17 | **Google for Jobs** | Indexing API (outbound) | ✅ Free (200 URLs/day) | OAuth 2.0 Service Account | Universal | Deep-link to source | ✅ **SEO Channel** |
| 18 | **Jooble** | REST API | ⚠️ 500 lifetime calls | API Key | Moderate | Redirect | ❌ Skip — lifetime cap too low |
| 19 | **Reed** | REST API | ✅ Free (1K req/day) | Basic Auth | Zero (UK only) | Redirect | ❌ Skip — no India coverage |
| 20 | **Careerjet** | Publisher API | ✅ **Free (publisher)** | Basic Auth + Client IP | **Very High** (en_IN) | Redirect via click URL | ✅ **MVP Source #4** |

### 3.2 Top 5 Recommended Sources for MVP

#### Source 1: ATS Keyless Public APIs (Greenhouse + Lever + Ashby)

**Why:** 100% free forever, no API keys, no rate limits, high data quality with full HTML descriptions, salary bands, and office locations. Thousands of top Indian tech companies and MNC GCCs use these platforms.

**Coverage:** Razorpay, Swiggy, Postman, CRED, Hasura, Zepto, Groww, PhonePe, UrbanCompany, Notion, Figma, Airtable, and 200+ more.

**Integration Pattern:**
```
Greenhouse: GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
Lever:      GET https://api.lever.co/v0/postings/{slug}?mode=json
Ashby:      GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
```

**Data Quality:** Title, full HTML description, location, departments, salary (Ashby), apply URL.

#### Source 2: Careerjet India Publisher API

**Why:** Highest-coverage free API for domestic Indian jobs across all sectors and tiers. Bridges the "Naukri gap" by indexing traditional corporate, banking, operations, and manufacturing roles in Tier 1/2/3 cities.

**Integration:** `GET https://search.api.careerjet.net/v4/query` with `locale_code=en_IN`.

**Requirements:** Free publisher registration, must forward end-user IP and User-Agent (live search only, not bulk caching).

#### Source 3: JSearch API (RapidAPI)

**Why:** Legally queries Google for Jobs, which indexes Naukri, LinkedIn, and Indeed India daily. 200 free calls/month — perfect for seeded queries like "React Developer Bangalore".

**Integration:** `GET https://jsearch.p.rapidapi.com/search` with `x-rapidapi-key`.

**Data:** Live Google for Jobs aggregated data: title, company, full description, salary, apply links.

#### Source 4: Remote Job APIs (Jobicy + Remotive + RemoteOK)

**Why:** 100% free, zero authentication, high appeal for Indian developers seeking USD/EUR remote contracts.

**Integration:**
```
Jobicy:    GET https://jobicy.com/api/v2/remote-jobs?geo=apac&count=50
Remotive:  GET https://remotive.com/api/remote-jobs?category=software-dev
RemoteOK:  GET https://remoteok.com/api (custom User-Agent required)
```

#### Source 5: Google for Jobs Indexing API (Outbound SEO)

**Why:** Two-way integration — not just aggregating jobs IN, but pushing QuestEdge jobs OUT to Google for Jobs for free candidate traffic. Embed Schema.org/JobPosting JSON-LD on every job page.

**Integration:** `POST https://indexing.googleapis.com/v3/urlNotifications:publish` with Google Cloud service account.

### 3.3 Legal & Compliance Framework

> [!CAUTION]
> **Do NOT scrape:** LinkedIn, Naukri.com, Indeed, Internshala, Foundit, or Wellfound. All explicitly prohibit automated access and have active legal enforcement programs.

**Indian Legal Pillars:**

| Law | Relevance | QuestEdge Compliance |
|---|---|---|
| IT Act 2000 (Sections 43, 66) | Unauthorized computer access / data extraction | Only use official public APIs |
| Copyright Act 1957 | Database and content protection | Display snippets, deep-link to originals |
| Indian Contract Act 1872 | Terms of Service enforceability | Respect all platform ToS |
| DPDPA 2023 | Personal data protection | Strip recruiter PII during ingestion |
| IT Intermediary Rules 2021 | Safe harbour for intermediaries | Appoint Grievance Officer, 36-hour takedown |

**Compliance Requirements:**
1. Display "Report this listing" / "Employer Takedown" link on every external job
2. Appoint Grievance Officer with public contact details
3. Strip individual PII (recruiter personal phones/emails) during ingestion
4. Maintain source attribution on all external listings
5. Deep-link candidates to original apply URL — never misrepresent job source

---

## 4. Phase 3: System Architecture

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        QuestEdge Frontend                            │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│   │ Browse All   │  │AI Recommended│  │ External Jobs (NEW TAB)  │  │
│   │ (Mandates)   │  │ (Mandates)   │  │ Greenhouse│Lever│Ashby   │  │
│   │              │  │              │  │ Careerjet │JSearch│Remote │  │
│   └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      QuestEdge Backend (NestJS)                      │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ ExternalJobsModule  │  │ Existing Modules                     │  │
│  │ (NEW)               │  │ ┌──────────┐ ┌──────────────────┐   │  │
│  │ ┌─────────────────┐ │  │ │candidate-│ │ai-matching       │   │  │
│  │ │ AggregationSvc  │ │  │ │portal    │ │(extend for ext)  │   │  │
│  │ │ NormalizerSvc   │ │  │ └──────────┘ └──────────────────┘   │  │
│  │ │ MatchPrecompSvc │ │  │ ┌──────────┐ ┌──────────────────┐   │  │
│  │ │ ConnectorMgr    │ │  │ │job-queue │ │cache             │   │  │
│  │ └─────────────────┘ │  │ │(pg-boss) │ │(HotCacheService) │   │  │
│  └─────────────────────┘  │ └──────────┘ └──────────────────┘   │  │
│                            └──────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Source Connectors (Pluggable)                    │    │
│  │  ┌───────────┐ ┌──────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ │    │
│  │  │Greenhouse │ │Lever │ │Ashby │ │Careerjet │ │JSearch   │ │    │
│  │  │Connector  │ │Conn. │ │Conn. │ │Connector │ │Connector │ │    │
│  │  └───────────┘ └──────┘ └──────┘ └──────────┘ └──────────┘ │    │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────┐                    │    │
│  │  │Jobicy     │ │Remotive  │ │RemoteOK  │                    │    │
│  │  │Connector  │ │Connector │ │Connector │                    │    │
│  │  └───────────┘ └──────────┘ └──────────┘                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Database                          │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ ┌───────────┐  │
│  │ExternalJob  │ │ExternalSaved │ │ExternalClick  │ │JobSource  │  │
│  │(aggregated) │ │Job (bookmarks│ │(apply telemetry│ │Config     │  │
│  └─────────────┘ └──────────────┘ └───────────────┘ └───────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Source Connector Architecture

Each connector implements a common interface:

```typescript
interface IJobSourceConnector {
  readonly sourceName: string;
  readonly sourceType: 'ats_board' | 'aggregator' | 'remote_board';
  
  // Fetch jobs from this source
  fetchJobs(config: SourceConfig): Promise<RawExternalJob[]>;
  
  // Check if source is healthy
  healthCheck(): Promise<boolean>;
  
  // Get rate limit status
  getRateLimitStatus(): RateLimitInfo;
}

interface RawExternalJob {
  sourceId: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  locationRaw: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  salaryRaw?: string;
  applyUrl: string;
  postedAt?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface SourceConfig {
  companySlugs?: string[];   // For ATS boards
  searchQuery?: string;      // For aggregators
  location?: string;         // For location-based search
  page?: number;
  limit?: number;
}
```

### 4.3 Job Normalization Pipeline

```
Raw Job Data (from connectors)
         │
         ▼
┌─────────────────────┐
│ 1. VALIDATE         │ — Required fields check (title, company, applyUrl)
│                     │ — URL validation and sanitization
│                     │ — HTML description sanitization (DOMPurify)
└─────────┬───────────┘
         │
         ▼
┌─────────────────────┐
│ 2. NORMALIZE        │ — Location normalization ("Bengaluru" / "Bangalore" → "Bengaluru, Karnataka, IN")
│                     │ — Work model detection from description keywords
│                     │ — Employment type standardization
│                     │ — Salary parsing (range extraction, currency detection)
└─────────┬───────────┘
         │
         ▼
┌─────────────────────┐
│ 3. SKILL EXTRACTION │ — Dictionary-based skill matching against master taxonomy
│                     │ — Gemini AI fallback for complex JDs (batched, rate-limited)
│                     │ — Normalized to existing skills[] format
└─────────┬───────────┘
         │
         ▼
┌─────────────────────┐
│ 4. DEDUPLICATE      │ — Content hash: SHA-256(normalize(title + company + location))
│                     │ — URL canonical hash: SHA-256(normalizeUrl(applyUrl))
│                     │ — Composite unique constraint: [sourceName, sourceJobId]
│                     │ — Cross-source fuzzy match: Levenshtein on title+company
└─────────┬───────────┘
         │
         ▼
┌─────────────────────┐
│ 5. PII SCRUB        │ — Strip personal recruiter phone numbers
│                     │ — Strip personal email addresses
│                     │ — Retain only corporate entity details
└─────────┬───────────┘
         │
         ▼
┌─────────────────────┐
│ 6. STORE / UPDATE   │ — Upsert into ExternalJob table
│                     │ — Mark expired jobs as inactive
│                     │ — Update lastSyncedAt timestamp
└─────────────────────┘
```

### 4.4 Candidate Job Matching Engine

**Approach:** Deterministic heuristic scoring (reusing `AiMatchingService` patterns) with optional Gemini AI enhancement for top matches.

**Scoring Dimensions (100 points total):**

| Dimension | Weight | Matching Logic |
|---|---|---|
| Skills Fit | 40 pts | Jaccard similarity: `intersection(candidateSkills, jobSkills) / union(candidateSkills, jobSkills)` × 40 |
| Experience Fit | 25 pts | Range overlap: full points if candidate years within required range, linear decay outside |
| Role & Domain Fit | 20 pts | Title similarity (Levenshtein/token overlap) + preferredRoles match + preferredIndustries match |
| Preferences Fit | 15 pts | Location match (5pts) + workModel match (5pts) + salary range overlap (3pts) + notice period fit (2pts) |

**Pre-computation Strategy:**
- pg-boss cron job runs every 6 hours
- For each active candidate with `isProfileComplete=true`:
  - Compute heuristic scores against all active external jobs
  - Store top 100 matches in `ExternalJobMatch` cache table
  - Gemini AI enhancement only for top 20 matches (rate-limited)

### 4.5 Background Processing Design

All background workers use the existing **pg-boss** infrastructure:

| Worker | Schedule | Purpose |
|---|---|---|
| `external-jobs-ats-sync` | Every 6 hours (`0 */6 * * *`) | Fetch jobs from Greenhouse/Lever/Ashby company slugs |
| `external-jobs-remote-sync` | Every 12 hours (`0 */12 * * *`) | Fetch jobs from Jobicy, Remotive, RemoteOK |
| `external-jobs-expiry-check` | Daily at 3 AM (`0 3 * * *`) | Mark jobs older than 45 days or with 404 apply URLs as expired |
| `external-jobs-match-compute` | Every 6 hours (`30 */6 * * *`) | Pre-compute heuristic match scores for active candidates |
| `external-jobs-stats` | Daily at 1 AM (`0 1 * * *`) | Aggregate click/view telemetry for analytics |

> [!NOTE]
> Careerjet and JSearch are **live search APIs** — they should be called on-demand when candidates search, NOT bulk-synced. Results are cached in HotCacheService for 1 hour.

---

## 5. Phase 4: Candidate-Side User Experience

### 5.1 Navigation Integration

Add "Explore Market" to the candidate sidebar navigation:

```
CANDIDATE PORTAL (Sidebar)
├── Dashboard
├── My Jobs           ← existing (Browse All, AI Recommended, Saved)
├── 🌐 Explore Market  ← NEW (External Job Discovery)
├── Applications
├── Referrals
└── Profile
```

### 5.2 Explore Market Page — Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🌐 Explore Market                                              │
│  Discover opportunities from top companies across the web       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search jobs by title, skill, or company...           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ │
│  │All Jobs│ │Tech Jobs │ │Remote    │ │Startups │ │By Skill│ │
│  └────────┘ └──────────┘ └──────────┘ └─────────┘ └────────┘ │
│                                                                 │
│  Filters: [Location ▼] [Work Mode ▼] [Exp Level ▼] [Salary ▼] │
│           [Source ▼]   [Posted Within ▼]                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🏢 Senior Backend Engineer              87% Match 🟢   │   │
│  │ Razorpay · Bengaluru · Hybrid · ₹25-38L               │   │
│  │ Skills: Go, Node.js, PostgreSQL, Redis                  │   │
│  │ via Greenhouse · Posted 2 days ago                      │   │
│  │                                    [Save 🔖] [View →]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💻 Full Stack Developer                  72% Match 🔵   │   │
│  │ Swiggy · Remote (India) · Full-time · ₹18-28L          │   │
│  │ Skills: React, TypeScript, Python, AWS                  │   │
│  │ via Lever · Posted 5 days ago                           │   │
│  │                                    [Save 🔖] [View →]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Load More]                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Filter System

| Filter | Options | Default |
|---|---|---|
| Location | All India, Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune, Chennai, Remote, Custom | All |
| Work Mode | All, Remote, Hybrid, On-site | All |
| Experience Level | All, Fresher (0-2), Junior (2-5), Mid (5-8), Senior (8-12), Lead (12+) | All |
| Salary Range | Any, ₹0-10L, ₹10-20L, ₹20-35L, ₹35-50L, ₹50L+ | Any |
| Source | All, Greenhouse, Lever, Ashby, Careerjet, JSearch, Remote Boards | All |
| Posted Within | Anytime, 24 hours, 3 days, 7 days, 14 days, 30 days | 30 days |
| Employment Type | All, Full-time, Part-time, Contract, Internship | All |

### 5.4 Job Detail View

Clicking a job card opens a detail panel (slide-over or modal):

```
┌──────────────────────────────────────────────┐
│ Senior Backend Engineer                       │
│ Razorpay · Bengaluru, Karnataka              │
├──────────────────────────────────────────────┤
│                                              │
│ Match Score: 87% 🟢                          │
│ ┌──────────────────────────────────────┐     │
│ │ Skills:      ████████████░░ 34/40    │     │
│ │ Experience:  █████████████░ 23/25    │     │
│ │ Role Fit:    █████████░░░░░ 18/20    │     │
│ │ Preferences: ████████████░░ 12/15    │     │
│ └──────────────────────────────────────┘     │
│                                              │
│ 📍 Bengaluru · 🏠 Hybrid · 💼 Full-time     │
│ 💰 ₹25,00,000 - ₹38,00,000 / year          │
│ 📅 Posted 2 days ago                         │
│                                              │
│ Required Skills:                             │
│ [Go] [Node.js] [PostgreSQL] [Redis] [gRPC]  │
│                                              │
│ ── Job Description ──                        │
│ (Full HTML description from source)          │
│                                              │
│ ── Source Information ──                     │
│ 🔗 via Greenhouse · razorpay.com/careers     │
│                                              │
│ [🔖 Save Job]  [🚀 Apply on Razorpay →]     │
│                                              │
│ ⚠️ This is an external listing. You will be  │
│ redirected to the company's career page.     │
└──────────────────────────────────────────────┘
```

### 5.5 Personalized Recommendations

On the "Explore Market" page, show a **"Recommended for You"** section at the top:
- Uses pre-computed match scores from `ExternalJobMatch`
- Shows top 10 highest-scoring external jobs
- Updates every 6 hours via background worker
- Requires `isProfileComplete=true`
- Empty state: "Complete your profile to get personalized job recommendations"

### 5.6 Saved External Jobs

- Bookmark button on every external job card
- Stored in `ExternalSavedJob` table (separate from internal `SavedJob`)
- Accessible from a "Saved" sub-tab on the Explore Market page
- Shows staleness indicator if job is >30 days old
- Auto-removes if job is marked expired

---

## 6. Phase 5: Application Workflow

### 6.1 Two Application Methods

Since external jobs are hosted on third-party platforms, QuestEdge supports two application flows:

#### Method A: Redirect to Original (Primary)
```
Candidate clicks "Apply on [Company] →"
         │
         ▼
Record click in ExternalJobClick table
(candidateProfileId, externalJobId, clickedAt, referrerUrl)
         │
         ▼
Open original apply URL in new tab
(e.g. https://boards.greenhouse.io/razorpay/jobs/12345)
         │
         ▼
Update job card UI: "Applied ✓ (redirected)"
Candidate completes application on external platform
```

#### Method B: Track External Application (Optional Enhancement)
```
After redirect, show "Did you apply?" prompt (24hr later)
         │
         ├── Yes → Mark as "Applied" in ExternalJobApplication
         │         Track application date
         │
         └── No / Dismiss → Keep as "Visited"
```

### 6.2 Application Tracking

Candidates can track external applications from `/candidate/applications`:

| Status | Meaning |
|---|---|
| Visited | Clicked apply link, redirected to external site |
| Applied (Self-reported) | Candidate confirmed they submitted application |
| Bookmarked | Saved but not yet applied |

> [!NOTE]
> Unlike internal QuestEdge applications where we have full pipeline visibility, external application tracking is limited to self-reported status since we don't have access to third-party ATS data.

---

## 7. Phase 6: Database & Backend Design

### 7.1 New Prisma Models

```prisma
// ============================================
// EXTERNAL JOB AGGREGATION MODELS
// ============================================

model ExternalJob {
  id                String    @id @default(uuid())
  
  // Source identification
  sourceName        String    // 'greenhouse', 'lever', 'ashby', 'careerjet', 'jsearch', 'jobicy', 'remotive', 'remoteok'
  sourceId          String    // ID from the source platform
  sourceCompanySlug String?   // ATS board slug (e.g. 'razorpay')
  sourceUrl         String?   // Original listing URL on source platform
  
  // Job details
  title             String
  companyName       String
  companyLogoUrl    String?
  
  // Location
  location          String?
  city              String?
  state             String?
  country           String    @default("IN")
  isRemote          Boolean   @default(false)
  workplaceType     String?   // 'OnSite', 'Remote', 'Hybrid'
  
  // Compensation
  salaryMin         Decimal?  @db.Decimal(12, 2)
  salaryMax         Decimal?  @db.Decimal(12, 2)
  salaryCurrency    String?   @default("INR")
  salaryPeriod      String?   // 'YEAR', 'MONTH', 'HOUR'
  salaryRaw         String?   // Original unparsed salary text
  
  // Description
  descriptionHtml   String?   @db.Text
  descriptionPlain  String?   @db.Text
  descriptionSnippet String?  // First 200 chars for card display
  
  // Categorization
  employmentType    String?   // 'FullTime', 'PartTime', 'Contract', 'Internship'
  department        String?
  team              String?
  extractedSkills   Json?     // String array of normalized skills
  tags              Json?     // String array of tags
  experienceLevel   String?   // 'Fresher', 'Junior', 'Mid', 'Senior', 'Lead'
  
  // Application
  applyUrl          String    // Direct apply URL (always redirect)
  applyType         String    @default("redirect") // 'redirect' or 'email'
  
  // Deduplication
  contentHash       String?   // SHA-256(normalize(title + company + location))
  urlHash           String?   // SHA-256(normalizeUrl(applyUrl))
  
  // Lifecycle
  isActive          Boolean   @default(true)
  postedAt          DateTime?
  expiresAt         DateTime?
  lastSyncedAt      DateTime  @default(now())
  lastVerifiedAt    DateTime? // Last time apply URL was verified as live
  
  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  savedBy           ExternalSavedJob[]
  clicks            ExternalJobClick[]
  matches           ExternalJobMatch[]
  
  // Indexes
  @@unique([sourceName, sourceId])
  @@index([isActive, postedAt(sort: Desc)])
  @@index([contentHash])
  @@index([urlHash])
  @@index([companyName])
  @@index([country, city])
  @@index([workplaceType])
  @@index([isActive, sourceName])
  
  @@map("external_jobs")
}

model ExternalSavedJob {
  id                  String   @id @default(uuid())
  candidateProfileId  String
  externalJobId       String
  savedAt             DateTime @default(now())
  
  candidateProfile    CandidateProfile @relation(fields: [candidateProfileId], references: [id], onDelete: Cascade)
  externalJob         ExternalJob      @relation(fields: [externalJobId], references: [id], onDelete: Cascade)
  
  @@unique([candidateProfileId, externalJobId])
  @@map("external_saved_jobs")
}

model ExternalJobClick {
  id                  String   @id @default(uuid())
  candidateProfileId  String
  externalJobId       String
  clickedAt           DateTime @default(now())
  selfReportedApplied Boolean  @default(false)
  appliedAt           DateTime?
  
  candidateProfile    CandidateProfile @relation(fields: [candidateProfileId], references: [id], onDelete: Cascade)
  externalJob         ExternalJob      @relation(fields: [externalJobId], references: [id], onDelete: Cascade)
  
  @@index([candidateProfileId])
  @@index([externalJobId])
  @@map("external_job_clicks")
}

model ExternalJobMatch {
  id                  String   @id @default(uuid())
  candidateProfileId  String
  externalJobId       String
  
  // Score breakdown
  totalScore          Int      // 0-100
  skillsScore         Int      // 0-40
  experienceScore     Int      // 0-25
  roleFitScore        Int      // 0-20
  preferencesScore    Int      // 0-15
  
  // Match details
  matchedSkills       Json?    // String array
  missingSkills       Json?    // String array
  
  // Lifecycle
  computedAt          DateTime @default(now())
  
  candidateProfile    CandidateProfile @relation(fields: [candidateProfileId], references: [id], onDelete: Cascade)
  externalJob         ExternalJob      @relation(fields: [externalJobId], references: [id], onDelete: Cascade)
  
  @@unique([candidateProfileId, externalJobId])
  @@index([candidateProfileId, totalScore(sort: Desc)])
  @@map("external_job_matches")
}

model JobSourceConfig {
  id              String   @id @default(uuid())
  sourceName      String   // 'greenhouse', 'lever', 'ashby'
  companySlug     String   // Board token / company slug
  companyName     String   // Display name
  companyLogoUrl  String?
  isActive        Boolean  @default(true)
  lastSyncAt      DateTime?
  lastSyncStatus  String?  // 'success', 'error', 'partial'
  lastSyncCount   Int?     // Number of jobs fetched
  errorMessage    String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([sourceName, companySlug])
  @@map("job_source_configs")
}
```

**Required additions to existing `CandidateProfile` model:**

```prisma
model CandidateProfile {
  // ... existing fields ...
  
  // NEW relations for external jobs
  externalSavedJobs   ExternalSavedJob[]
  externalJobClicks   ExternalJobClick[]
  externalJobMatches  ExternalJobMatch[]
}
```

### 7.2 Migration Strategy

> [!IMPORTANT]
> All schema changes are **additive only**. No existing tables are modified (except adding relation fields to CandidateProfile). Migration is safe to run on production.

```bash
npx prisma migrate dev --name add-external-job-aggregation
```

### 7.3 API Endpoints

#### External Jobs Controller (`/api/v1/external-jobs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/external-jobs` | `@Roles(CANDIDATE)` | List external jobs with filters, search, pagination |
| `GET` | `/api/v1/external-jobs/:id` | `@Roles(CANDIDATE)` | Get external job details |
| `GET` | `/api/v1/external-jobs/recommended` | `@Roles(CANDIDATE)` | Get personalized recommendations (pre-computed) |
| `GET` | `/api/v1/external-jobs/search` | `@Roles(CANDIDATE)` | Live search via Careerjet/JSearch (pass-through with caching) |
| `POST` | `/api/v1/external-jobs/:id/save` | `@Roles(CANDIDATE)` | Save/unsave external job |
| `POST` | `/api/v1/external-jobs/:id/click` | `@Roles(CANDIDATE)` | Record apply click (returns apply URL) |
| `PATCH` | `/api/v1/external-jobs/:id/applied` | `@Roles(CANDIDATE)` | Self-report application status |
| `GET` | `/api/v1/external-jobs/saved` | `@Roles(CANDIDATE)` | List saved external jobs |
| `GET` | `/api/v1/external-jobs/history` | `@Roles(CANDIDATE)` | List click/apply history |
| `GET` | `/api/v1/external-jobs/stats` | `@Roles(PLATFORM_ADMIN)` | Aggregation statistics dashboard |

#### Admin Endpoints (`/api/v1/admin/external-jobs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/external-jobs/sources` | `@Roles(PLATFORM_ADMIN)` | List all configured job sources |
| `POST` | `/api/v1/admin/external-jobs/sources` | `@Roles(PLATFORM_ADMIN)` | Add new company slug to sync |
| `DELETE` | `/api/v1/admin/external-jobs/sources/:id` | `@Roles(PLATFORM_ADMIN)` | Remove a job source |
| `POST` | `/api/v1/admin/external-jobs/sync` | `@Roles(PLATFORM_ADMIN)` | Trigger manual sync |

### 7.4 Backend Module Structure

```
backend/src/modules/external-jobs/
├── external-jobs.module.ts
├── external-jobs.controller.ts
├── external-jobs.service.ts
├── external-jobs-admin.controller.ts
├── connectors/
│   ├── connector.interface.ts       # IJobSourceConnector interface
│   ├── greenhouse.connector.ts
│   ├── lever.connector.ts
│   ├── ashby.connector.ts
│   ├── careerjet.connector.ts
│   ├── jsearch.connector.ts
│   ├── jobicy.connector.ts
│   ├── remotive.connector.ts
│   └── remoteok.connector.ts
├── services/
│   ├── aggregation.service.ts       # Orchestrates fetching from all connectors
│   ├── normalizer.service.ts        # Normalizes raw jobs to unified format
│   ├── deduplication.service.ts     # Content hashing, URL normalization
│   ├── skill-extractor.service.ts   # Extract skills from JD text
│   └── match-precompute.service.ts  # Pre-compute candidate-job matches
├── workers/
│   ├── ats-sync.worker.ts           # pg-boss worker for ATS sync
│   ├── remote-sync.worker.ts        # pg-boss worker for remote APIs
│   ├── expiry-check.worker.ts       # pg-boss worker for expiration
│   └── match-compute.worker.ts      # pg-boss worker for match pre-computation
├── dto/
│   ├── search-external-jobs.dto.ts
│   ├── external-job-response.dto.ts
│   └── add-source.dto.ts
└── config/
    └── seed-companies.json          # Initial 200+ company slugs
```

---

## 8. Phase 7: Frontend Design

### 8.1 New Routes

```
frontend/src/app/(protected)/candidate/
├── external-jobs/              ← NEW
│   ├── page.tsx                ← Main Explore Market page
│   └── [id]/
│       └── page.tsx            ← External job detail page (optional — could be modal)
```

### 8.2 New Components

```
frontend/src/components/external-jobs/
├── ExternalJobCard.tsx         ← Job listing card (reuse MandateCard patterns)
├── ExternalJobDetail.tsx       ← Full job detail slide-over/modal
├── ExternalJobFilters.tsx      ← Filter bar with dropdowns
├── ExternalJobSearch.tsx       ← Search input with debounce
├── ExternalJobMatchBadge.tsx   ← Match percentage badge (reuse ai-match-modal patterns)
├── ExternalJobSourceBadge.tsx  ← "via Greenhouse" / "via Lever" badge
├── ExternalSavedJobs.tsx       ← Saved jobs tab content
├── ExternalJobHistory.tsx      ← Click/apply history
└── ExternalJobSkeleton.tsx     ← Loading skeleton cards
```

### 8.3 New API Client

```
frontend/src/lib/external-jobs-api.ts
├── getExternalJobs(filters)    ← Paginated listing
├── getExternalJob(id)          ← Single job detail
├── getRecommendedJobs()        ← Pre-computed recommendations
├── searchExternalJobs(query)   ← Live search (Careerjet/JSearch)
├── saveExternalJob(id)         ← Toggle save
├── recordClick(id)             ← Record apply click
├── reportApplied(id)           ← Self-report application
├── getSavedExternalJobs()      ← List saves
├── getClickHistory()           ← List history
```

### 8.4 Sidebar Modification

In `frontend/src/components/sidebar.tsx`, add to `candidateNavSections`:

```typescript
{
  title: '',
  items: [
    // ... existing items ...
    {
      title: 'Explore Market',
      href: '/candidate/external-jobs',
      icon: Globe,  // from lucide-react
      badge: 'New',
    },
  ],
}
```

### 8.5 Design System Compliance

All new components will use:
- Existing `Card`, `Badge`, `Button`, `Input`, `Select` from `@/components/ui/`
- Existing `DataTable`, `PageHeader`, `KpiCard`, `EmptyState` from `@/components/shared/`
- Existing `MandateCard` patterns for job card layout
- Existing `AiMatchModal` patterns for match score display
- Tailwind CSS classes consistent with current theme
- Lucide React icons
- Framer Motion animations where appropriate

---

## 9. Phase 8: Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)

**Objective:** Database schema, backend module skeleton, and ATS connectors

| Task | Files | Estimate |
|---|---|---|
| Add Prisma models (ExternalJob, ExternalSavedJob, ExternalJobClick, ExternalJobMatch, JobSourceConfig) | `prisma/schema.prisma` | 2 hours |
| Run migration | — | 15 min |
| Create `ExternalJobsModule` skeleton | `modules/external-jobs/*.ts` | 2 hours |
| Implement `IJobSourceConnector` interface | `connectors/connector.interface.ts` | 1 hour |
| Build GreenhouseConnector | `connectors/greenhouse.connector.ts` | 3 hours |
| Build LeverConnector | `connectors/lever.connector.ts` | 3 hours |
| Build AshbyConnector | `connectors/ashby.connector.ts` | 3 hours |
| Create seed company slugs config (200+ companies) | `config/seed-companies.json` | 4 hours |
| Build NormalizerService | `services/normalizer.service.ts` | 4 hours |
| Build DeduplicationService | `services/deduplication.service.ts` | 3 hours |
| Build AggregationService | `services/aggregation.service.ts` | 4 hours |
| Register pg-boss ATS sync worker | `workers/ats-sync.worker.ts` | 3 hours |
| Unit tests for connectors and normalizer | `*.spec.ts` | 4 hours |

**Sprint 1 Total: ~36 hours (2 weeks at ~3hr/day)**

### Sprint 2: API & Matching (Week 3-4)

**Objective:** REST API endpoints, skill extraction, match pre-computation

| Task | Files | Estimate |
|---|---|---|
| Build ExternalJobsController (GET list, detail, saved, history) | `external-jobs.controller.ts` | 4 hours |
| Build ExternalJobsService (query, filter, paginate) | `external-jobs.service.ts` | 6 hours |
| Build SkillExtractorService (dictionary + Gemini fallback) | `services/skill-extractor.service.ts` | 5 hours |
| Extend AiMatchingService for external jobs | `ai-matching/ai-matching.service.ts` | 4 hours |
| Build MatchPrecomputeService | `services/match-precompute.service.ts` | 5 hours |
| Register match compute pg-boss worker | `workers/match-compute.worker.ts` | 3 hours |
| Build expiry check worker | `workers/expiry-check.worker.ts` | 2 hours |
| Build admin controller (source management) | `external-jobs-admin.controller.ts` | 3 hours |
| Build DTOs and validation | `dto/*.ts` | 2 hours |
| Integration tests | `*.spec.ts` | 4 hours |

**Sprint 2 Total: ~38 hours (2 weeks)**

### Sprint 3: Live Search & Remote Sources (Week 5)

**Objective:** Careerjet/JSearch live search, remote job connectors

| Task | Files | Estimate |
|---|---|---|
| Build CareerjetConnector | `connectors/careerjet.connector.ts` | 4 hours |
| Build JSearchConnector | `connectors/jsearch.connector.ts` | 3 hours |
| Build JobicyConnector | `connectors/jobicy.connector.ts` | 2 hours |
| Build RemotiveConnector | `connectors/remotive.connector.ts` | 2 hours |
| Build RemoteOKConnector | `connectors/remoteok.connector.ts` | 2 hours |
| Live search endpoint with HotCache | `external-jobs.service.ts` | 3 hours |
| Register remote sync pg-boss worker | `workers/remote-sync.worker.ts` | 2 hours |
| Rate limiting middleware for live search | `external-jobs.module.ts` | 2 hours |

**Sprint 3 Total: ~20 hours (1 week)**

### Sprint 4: Frontend (Week 6-7)

**Objective:** Complete candidate-facing UI

| Task | Files | Estimate |
|---|---|---|
| Create external-jobs API client | `lib/external-jobs-api.ts` | 3 hours |
| Build ExternalJobCard component | `components/external-jobs/ExternalJobCard.tsx` | 4 hours |
| Build ExternalJobFilters component | `components/external-jobs/ExternalJobFilters.tsx` | 4 hours |
| Build ExternalJobSearch component | `components/external-jobs/ExternalJobSearch.tsx` | 2 hours |
| Build ExternalJobDetail modal/panel | `components/external-jobs/ExternalJobDetail.tsx` | 5 hours |
| Build main Explore Market page | `app/(protected)/candidate/external-jobs/page.tsx` | 6 hours |
| Build Saved Jobs tab | `components/external-jobs/ExternalSavedJobs.tsx` | 3 hours |
| Build Click History view | `components/external-jobs/ExternalJobHistory.tsx` | 3 hours |
| Add sidebar navigation entry | `components/sidebar.tsx` | 30 min |
| Add match badge and source badge | `ExternalJobMatchBadge.tsx`, `ExternalJobSourceBadge.tsx` | 2 hours |
| Loading skeletons and empty states | `ExternalJobSkeleton.tsx` | 2 hours |
| Responsive design and mobile optimization | All components | 4 hours |

**Sprint 4 Total: ~38 hours (2 weeks)**

### Sprint 5: Polish & Launch (Week 8)

**Objective:** Testing, performance, deployment

| Task | Files | Estimate |
|---|---|---|
| End-to-end testing (all filters, search, save, click) | Manual + automated | 6 hours |
| Performance optimization (pagination, caching) | Various | 4 hours |
| Error handling and edge cases | Various | 4 hours |
| Google for Jobs Schema.org markup (outbound SEO) | Frontend job pages | 4 hours |
| Deploy database migration to production | — | 1 hour |
| Deploy backend with new module | — | 1 hour |
| Deploy frontend | — | 1 hour |
| Monitor and fix production issues | — | 4 hours |

**Sprint 5 Total: ~25 hours (1 week)**

### Total Timeline: **~157 hours across 8 weeks**

---

## 10. Phase 9: Zero-Cost Strategy

### Scenario A: Free MVP (Recommended)

| Component | Cost | Notes |
|---|---|---|
| Greenhouse API | **\$0** | Keyless, unlimited |
| Lever API | **\$0** | Keyless, unlimited |
| Ashby API | **\$0** | Keyless, unlimited |
| Jobicy API | **\$0** | Keyless, unlimited |
| Remotive API | **\$0** | Keyless, 4 calls/day limit |
| RemoteOK API | **\$0** | Keyless, poll every 1-4 hours |
| JSearch (RapidAPI) | **\$0** | 200 free requests/month |
| Careerjet Publisher | **\$0** | Free publisher registration |
| Google Indexing API | **\$0** | Free (200 URLs/day) |
| PostgreSQL (existing) | **\$0** | Already provisioned |
| pg-boss (existing) | **\$0** | Uses existing Postgres |
| Gemini AI (existing) | **\$0** | Already provisioned API key |
| **Total** | **\$0/month** | |

### Scenario B: Low-Cost Scale-Up (Future)

| Component | Cost | Trigger |
|---|---|---|
| JSearch Pro (RapidAPI) | ~\$50/month | When 200 free calls insufficient |
| Redis (Upstash free tier) | \$0-10/month | When in-memory cache insufficient |
| Adzuna API (commercial license) | ~\$100/month | For additional India coverage |
| **Total** | **~\$50-160/month** | |

### Scenario C: Enterprise-Grade (Long-term)

| Component | Cost | When |
|---|---|---|
| LinkedIn Talent Partner | \$5,000+/year | When enterprise clients demand it |
| Naukri ATS Integration | Custom pricing | When volume justifies it |
| Dedicated Redis cluster | ~\$25/month | High-traffic caching |
| **Total** | **\$5,000+/year** | |

> [!TIP]
> **Start with Scenario A (100% free).** The combination of ATS keyless APIs + Careerjet + JSearch free tier provides sufficient coverage for an MVP launch covering 70-80% of relevant Indian tech job listings.

---

## 11. Phase 10: Safety & Testing

### 11.1 Backward Compatibility

| Concern | Mitigation |
|---|---|
| Existing mandates system | Untouched — ExternalJob is a completely separate model |
| Existing candidate profiles | Only adds new relation fields (ExternalSavedJob, ExternalJobClick, ExternalJobMatch) |
| Existing applications | Untouched — ExternalJobClick is separate from CandidateApplication |
| Existing AI matching | Extended, not replaced — new method for external jobs alongside existing mandate matching |
| Existing sidebar | New entry added, existing entries unchanged |
| Database migration | Additive only — creates new tables, adds relation fields |

### 11.2 Feature Flag

Wrap the entire feature behind a feature flag for safe rollout:

```typescript
// Backend: Check feature flag
const EXTERNAL_JOBS_ENABLED = process.env.FEATURE_EXTERNAL_JOBS === 'true';

// Frontend: Conditionally render sidebar item and route
{process.env.NEXT_PUBLIC_FEATURE_EXTERNAL_JOBS === 'true' && (
  <NavItem title="Explore Market" href="/candidate/external-jobs" icon={Globe} />
)}
```

### 11.3 Rate Limiting & Circuit Breakers

| Source | Rate Limit Strategy |
|---|---|
| Greenhouse | Polite crawling: 1-2 req/s with 500ms delay between companies |
| Lever | Same as Greenhouse |
| Ashby | Same as Greenhouse |
| Careerjet | Forward real user IP; max 1 req/s per user |
| JSearch | Track usage against 200/month cap; disable when 180 reached |
| Remotive | Max 2 req/min, poll 4x/day |
| RemoteOK | Poll every 4 hours max |
| Jobicy | Polite polling every 6 hours |

**Circuit Breaker Pattern:**
```typescript
// If a source fails 3 consecutive times, disable for 30 minutes
if (consecutiveFailures >= 3) {
  source.isActive = false;
  source.reactivateAt = now() + 30 * 60 * 1000;
  logger.warn(`Circuit breaker tripped for ${source.sourceName}`);
}
```

### 11.4 Regression Testing Checklist

| Area | Test | Status |
|---|---|---|
| Candidate registration | New candidates can register without issues | ☐ |
| Candidate profile | Profile CRUD works unchanged | ☐ |
| Internal job browsing | `/candidate/jobs` Browse All works | ☐ |
| AI recommendations | Internal mandate recommendations work | ☐ |
| Saved jobs (internal) | Save/unsave internal mandates works | ☐ |
| Direct apply (internal) | Direct application to mandates works | ☐ |
| Recruiter referrals | Referral flow unchanged | ☐ |
| Assessment engine | MCQ/Coding/Video assessments work | ☐ |
| Company dashboard | All company features work | ☐ |
| External job listing | New page loads with aggregated jobs | ☐ |
| External job search | Search returns relevant results | ☐ |
| External job filters | All filter combinations work | ☐ |
| External job save | Bookmark/unbookmark works | ☐ |
| External job apply | Redirect opens correct URL | ☐ |
| External job match | Match scores display correctly | ☐ |
| Background sync | pg-boss workers execute on schedule | ☐ |
| Job expiration | Expired jobs are hidden from listings | ☐ |
| Mobile responsive | Explore Market page works on mobile | ☐ |
| Performance | Page loads in < 2 seconds | ☐ |
| Error handling | Graceful fallback when sources are down | ☐ |

### 11.5 Monitoring & Alerting

| Metric | Alert Threshold |
|---|---|
| Sync worker failures | > 3 consecutive failures per source |
| External jobs count | Drops below 50% of previous day |
| Average page load time | > 3 seconds |
| API error rate | > 5% of requests |
| JSearch API usage | > 180 calls (approaching 200 limit) |

---

## Appendix A: Seed Company Slugs (Sample)

### Greenhouse Companies (Indian Tech)
```json
[
  "razorpay", "swiggy", "postman", "cred", "hasura",
  "meesho", "groww", "lenskart", "dream11", "mpl",
  "urbancompany", "zepto", "rapido", "slice", "jupiter",
  "khatabook", "spinny", "purplle", "mamaearth", "boAt",
  "nykaa", "zomato", "paytm", "flipkart", "ola"
]
```

### Lever Companies
```json
[
  "notion", "figma", "airtable", "stripe", "datadog",
  "atlassian", "canva", "cloudflare", "coinbase", "databricks"
]
```

### Ashby Companies
```json
[
  "anthropic", "ramp", "linear", "vercel", "supabase",
  "resend", "cal", "trigger", "inngest", "dub"
]
```

> [!NOTE]
> The full seed list of 200-300 company slugs will be compiled during Sprint 1 by cross-referencing Indian unicorn/soonicorn lists, YCombinator India alumni, and top GCC employers in Bengaluru, Hyderabad, Pune, and Gurugram.

---

## Appendix B: Unified Job TypeScript Interface

```typescript
export interface UnifiedExternalJob {
  id: string;
  source: 'greenhouse' | 'lever' | 'ashby' | 'careerjet' | 'jsearch' | 'jobicy' | 'remotive' | 'remoteok';
  sourceId: string;
  title: string;
  company: {
    name: string;
    slug?: string;
    logoUrl?: string;
    website?: string;
  };
  location: {
    display: string;
    city?: string;
    state?: string;
    country: string;
    isRemote: boolean;
    workplaceType: 'OnSite' | 'Remote' | 'Hybrid';
  };
  compensation?: {
    currency: string;
    min?: number;
    max?: number;
    period: 'YEAR' | 'MONTH' | 'HOUR';
    display: string;
  };
  employmentType: 'FullTime' | 'PartTime' | 'Contract' | 'Internship';
  description: {
    html?: string;
    plain?: string;
    snippet: string;
  };
  skills: string[];
  tags: string[];
  applyUrl: string;
  postedAt: string;
  expiresAt?: string;
  isActive: boolean;
  matchScore?: number;
}
```

---

## Appendix C: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ATS company changes board slug | Low | Medium | Monitor sync failures, alert on 404s |
| Careerjet changes API terms | Low | High | Have JSearch as fallback for Indian market |
| JSearch free tier removed | Medium | Medium | Careerjet covers India; ATS APIs cover tech |
| Rate limiting by ATS APIs | Low | Low | Polite crawling with delays, circuit breakers |
| Legal complaint from employer | Low | High | Immediate takedown mechanism, Grievance Officer |
| Stale/expired job links | Medium | Medium | Daily expiry check worker, 45-day auto-expire |
| Gemini AI rate limits for skill extraction | Medium | Low | Dictionary-based extraction as primary, AI as fallback |
| Database bloat from external jobs | Medium | Low | Auto-expire after 45 days, scheduled cleanup |

---

*Document prepared for QuestEdge Technical Review. No code has been modified.*
*Next step: Review and approve this plan, then begin Sprint 1 implementation.*

