# QuestEdge: Consolidated AWS Migration Review and Plan

**Review date:** 15 November 2026  
**Region evaluated:** AWS Asia Pacific (Mumbai), ap-south-1  
**Source reviewed:** repository working tree at commit 96669a9956f273f03b6d29e168e790fd58e10096; backend source relevant to this review is unchanged from the reports' cited 8ad1c590 baseline.  
**Inputs compared:** the attached “QuestEdge – Complete Architecture Audit & AWS Migration Blueprint” (Report A) and repository file AWS_MIGRATION_ARCHITECTURE_AND_COST_REPORT.md (Report B).  
**Scope:** read-only code and document review, official public AWS pricing references, and a migration design. No production console, database, cloud account, environment secret, or infrastructure was accessed. No application code or infrastructure was changed.

## Executive decision

Neither report is a sufficient basis for approving a production migration as written. Report A is too optimistic about readiness, migration effort, and the $53.50–$78 monthly budget. Report B correctly calls out important code and operational risks, but its early-stage $480–$1,410 range is not supported by a transparent, consistent SKU model and may assume more capacity and controls than the business has approved.

**Recommendation:** if QuestEdge has a business reason to move now, target ECS Fargate, an Application Load Balancer, private Multi-AZ RDS for PostgreSQL, and private S3 buckets in ap-south-1. Keep Auth0 and the existing external AI, email, SMS, background-check, and e-sign providers until a measured reason exists to replace them. Use GitHub Actions with OIDC for image publishing and deployment. Do not add Redis, SQS, Aurora, EKS, or a separate worker service until source usage, scaling needs, or a tested operational requirement justifies them. Use two NAT gateways for zonal egress resilience in the recommended topology; they are a material fixed cost.

This is a **target architecture recommendation, not a launch-readiness approval**. The inspected source has a critical public code-execution fallback, incomplete ORM-level tenant protection, production-shaped mock fallbacks, and storage client configuration that is not compatible with ECS task-role credentials as written. These are application risks, not problems AWS infrastructure can solve. Close and independently validate them before public production cutover. Also establish a reversible schema migration process and test data restore/cutover. The review cannot certify live service health or provider configuration.

For the recommended early-stage topology, reserve **about $350–$650/month (approximately ₹33,000–₹61,000/month)** for AWS infrastructure, before GST/tax, support plan, one-time migration work, engineering/on-call labor, and external API charges. This is a planning range, not a quote; actual cost depends heavily on RDS class, egress, logs, storage, task utilization, and the Mumbai price list. Obtain a saved AWS Pricing Calculator estimate before approval. A practical initial AWS budget cap would be **$650/month (about ₹61,200)** with billing alerts below that cap.

## 1. How to read this review

| Label | Meaning |
|---|---|
| **Verified in source** | Directly confirmed in the current repository. This establishes code/config behavior, not that a cloud provider is running it. |
| **Report claim** | Stated in Report A or B, but not independently confirmed through the relevant provider console or production system. |
| **Inference** | A likely operational consequence of source/config; it needs a test or owner confirmation. |
| **Unknown** | Requires authorized access to provider dashboards, billing, DNS, database, or operational records. |

The repository is evidence for implementation. It does not prove what is deployed, which environment variables are set, which provider plan is paid, or whether a third-party integration is currently active. The report text and prior screenshots are useful context but do not replace current console evidence.

## 2. Independent comparison of the two proposals

| Topic | Report A | Report B | Principal review |
|---|---|---|---|
| Existing hosting and regions | Says Vercel, Render, Neon, and provider regions are verified, including latency claims. | Treats much of hosting and provider configuration as documented or screenshot-based and lists dashboard facts still needed. | B is more appropriately cautious. This review did not access Vercel, Render, Neon, Auth0, DNS, or storage dashboards. The Oregon/Ohio locations, Vercel point of presence, actual plans, and measured cross-region latency remain unverified here. The claimed latency improvements are not benchmarks. |
| FastAPI AI service | Concludes the service is not deployed or called in production. | Says use/deployment is uncertain and source has readiness defects. | Source paths inspected use the Node Gemini SDK; configured aiServiceUrl fields were not found in service call sites. That supports “no call found in inspected backend source,” not “not deployed.” Production deployment/traffic remains unknown. The Python service has a required Gemini key, a default development internal key, and a health handler referencing a setting not declared in Settings. |
| Redis | Says Redis is unnecessary for the checked cache and jobs. | Recommends verifying docs/runtime use and not adding Redis until needed. | Both are directionally right for inspected paths. HotCacheService is in-process memory and pg-boss is PostgreSQL-backed. No evidence found that Redis is necessary to these active paths. That does not prove no other deployment component uses Upstash; inspect runtime configuration before canceling it. |
| S3/task role | Says AWS SDK support means zero code changes. | Flags explicit credentials and startup bucket creation as a task-role risk. | B is right. FileUploadService passes explicit credentials and defaults them to MinIO credentials, so the AWS SDK default task-role provider chain is bypassed. OfferRenderService separately defaults to localhost MinIO and static credentials. |
| Tenant isolation | Claims TenantSafetyNet prevents cross-tenant leaks. | Says it catches selected undefined-org filters but does not add scope. | B is materially correct. PrismaService checks for orgId: undefined in selected query shapes; it does not inject an org predicate or establish full tenant isolation. |
| Database schema deployment | Says npm start:prod runs db push at boot and has no migration directory. | Notes no checked-in migration history and cites deployment documentation. | Both raise a real schema-governance risk, but the execution claim needs qualification. backend/package.json start:prod includes prisma db push; backend/Dockerfile starts node dist/main directly. Which command the live Render service uses is unknown. Do not run db push automatically in production. |
| Coding assessment | Does not identify the fallback as a critical exposure. | Correctly flags local child-process execution as dangerous. | B found a verified high-severity issue. The code-run route is marked Public and falls back to spawnSync of Python/Node when Judge0 is absent or fails. This executes submitted code in the API container's security context. The route's token is an access control mechanism, but it is not an execution sandbox. Treat public exposure as a cutover blocker until disabled or isolated and tested. |
| Cost | Gives $53.50–$78 for a tiny three-task ECS/RDS/ALB setup and $61.86 as a baseline. | Gives much wider figures, including $480–$1,410 early-stage for a balanced profile. | Neither number is an approved estimate. A's figure assumes tiny unreplicated tasks and omits/understates public IPv4, Mumbai-specific pricing validation, and workload-driven costs. B's component minima in its early balanced table total about $520 while the stated low end is $480; its wide bands do not identify reproducible task counts/SKUs. Both need an AWS Calculator model based on actual usage. |
| Migration / rollback | Describes a five-minute delta sync and DNS rollback. | Gives a safer parallel plan, but some cost and timing assumptions remain open. | A's “delta sync” is not supplied by pg_dump/pg_restore. A DNS reversal does not reverse writes already committed to the AWS database or files. A real rollback needs write freeze, reconciliation/reverse replication, or an explicit point at which data loss is accepted. DNS propagation is not guaranteed to finish in five minutes. |
| Architecture complexity | Avoids NAT by putting public-IP tasks in public subnets. | Proposes private tasks, ALB, RDS, and NAT, with options. | Neither is universally correct. Public tasks with security groups restricted to ALB ingress can work, but all tasks are directly addressed and egress/credential exposure needs careful controls. Private tasks with NAT improve segmentation but add a persistent bill and NAT failure/cross-AZ concerns. The recommendation below includes two NATs and budgets for them. |

### Specific cost and design corrections

1. Report A uses a $20 Lightsail 4 GB example. AWS currently lists the Linux bundle with public IPv4 at **$24/month for 4 GB** and **$44/month for 8 GB**. This is a direct mismatch with the published list price, not a regional estimate. The bundle includes instance SSD and transfer allowance; snapshots and excess transfer can still add cost. See [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/) and [bundle details](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html).
2. Report A's ALB, RDS, S3, and Fargate line items are not shown as a reproducible ap-south-1 calculator export. Its ALB hourly rate and S3 per-GB rates must not be labeled Mumbai prices without checking the selected region. AWS pricing pages explicitly direct customers to select region and usage in the [AWS Pricing Calculator](https://calculator.aws/).
3. An ALB with tasks in public subnets does not make all public IPv4 use free. AWS bills public IPv4 at **$0.005/address-hour**, about $3.65 per address in a 730-hour month. ECS Fargate task public IPv4 and ALB addresses can add charges; exact count varies with deployment and scaling. Conversely, private tasks using NAT also incur NAT hourly, per-GB, public-IP, and sometimes cross-AZ costs. See [VPC pricing](https://aws.amazon.com/vpc/pricing/) and [Fargate pricing](https://aws.amazon.com/fargate/pricing/).
4. The VPC pricing page's well-known $0.045/hour and $0.045/GB NAT example is explicitly for its example region; it is not a verified Mumbai quote. Use the ap-south-1 calculator rate. A pair of NAT gateways is a substantial fixed monthly item even at zero traffic.
5. Report A's 0.25 vCPU / 0.5 GB task size is not demonstrated by measurement. It may start successfully, but there is no benchmark proving it can safely run the Next.js SSR and NestJS API paths under load or build pressure. The claim that 512 MB is guaranteed to OOM is also not demonstrated. Use load tests and container memory/CPU telemetry to decide sizing.
6. The $168.20 “10,000+ users” forecast in A is not a defensible capacity model. User count by itself does not determine concurrency, document downloads, AI calls, database load, log volume, or egress. Report B's larger bands are also not quote-quality without measured workload and explicit resources.
7. Neither report may treat account free tiers, CloudFront allowances, temporary credits, or new-account promotions as guaranteed recurring savings. Price the plan as if no promotional credit applies. CloudFront and Route 53 are optional, and caching authenticated responses or private documents incorrectly can expose tenant data.

## 3. Source-grounded QuestEdge architecture

### 3.1 Runtime components and dependencies

| Component | Verified implementation and role | Main dependencies / failure impact |
|---|---|---|
| Customer frontend | Next.js App Router application under work-nucleus/frontend. Handles candidate, employer, recruiter, and marketplace UI. Talks to the Nest API; Auth0 session/token behavior also appears in the application. | Node runtime/build configuration, API origin, Auth0 domains/callbacks, external assets. If unavailable, customer-facing workflows fail. Actual Vercel project/build settings remain unknown. |
| Support admin | Next.js app under work-nucleus/support-admin. Support routes proxy through Next route handlers to Nest support endpoints. | Nest support API, Auth0 identity/role claims, secrets and cache behavior. A compromise has cross-organization impact. Production deployment and mock-gate behavior must be checked in its actual deployed build. |
| Backend API and workers | NestJS/TypeScript application under work-nucleus/backend. Prisma-backed REST API, authentication/authorization, support, marketplace, hiring, application, assessment, file and integration modules. | PostgreSQL is required. Auth0 JWKS/token configuration and external APIs are operational dependencies. pg-boss workers and scheduled jobs are initialized in the Nest process. If the backend stops, API and in-process worker execution stop. |
| PostgreSQL | Prisma schema at work-nucleus/backend/prisma/schema.prisma; source uses PostgreSQL. The schema is large (about 74 models/64 enums per checked schema). pg-boss uses PostgreSQL. | API and workers depend on it; a database outage stops core transactions and queued jobs. The production host/version, extensions, size, backup/PITR/CDC settings, and database region are unknown. No checked-in Prisma migrations directory was found. |
| Job processing | pg-boss service under work-nucleus/backend/src/modules/job-queue/job-queue.service.ts. Worker classes include resume scoring, hire detection, e-sign polling, and external-jobs synchronization. Schedules and workers initialize from Nest modules. | PostgreSQL connectivity, job idempotency, retries, provider availability, and process shutdown. There is no verified standalone worker entrypoint in the repository. Multiple API replicas may each initialize worker registrations and schedules; validate pg-boss deduplication and application idempotency before scaling replicas. |
| Cache | HotCacheService uses in-process memory; health reports cache as in-memory. This cache is not shared across replicas and is lost on restart. | No Redis deployment is required for the inspected cache or pg-boss path. If a feature depends on cross-instance cache consistency, add a deliberate shared store only after call-graph validation. |
| Resume/object storage | FileUploadService uses S3Client, accepts PDF/DOC/DOCX up to 10 MB, performs basic magic-byte checking, and creates signed URLs. A separate OfferRenderService writes HTML offer artifacts to a distinct bucket. | Object storage provider, bucket names, regions, encryption, policy, inventory, and retention are deployment unknowns. Source defaults and explicit credentials need correction/configuration for AWS. An upload configuration check in the health endpoint is not a real read/write probe. |
| Python AI service | FastAPI code under work-nucleus/ai-service with Gemini agents and DB initialization. Its Settings requires GEMINI_API_KEY and defaults INTERNAL_API_KEY to a development value. Its health endpoint references CLAUDE_MODEL, which is not declared in Settings (GEMINI_MODEL is declared). | Source usage by current Nest services was not found in the inspected call sites; several services instead use @google/genai directly. Deployment or traffic is unknown. Do not provision it merely because it exists; if required, fix configuration/readiness and prove backend call paths first. |
| Identity | Backend Auth0 JWT strategy and frontend Auth0 integration. Admin/role enforcement exists in source. | Auth0 tenant settings, MFA, callback/logout URLs, audience/issuer, user status, and plan are not visible in the repository. A migration requires callback/origin updates, not an identity-provider rewrite. |
| AI and external integrations | Node backend has direct Gemini SDK integrations. Source also includes SendGrid and Resend email paths, Twilio messaging, public-job aggregation/URL checking, BGV and e-sign flows/webhooks. | Credentials, quotas, provider allowlists, sandbox vs production status, and failure policy are external unknowns. AI/vendor costs remain after hosting moves. Some code paths have mock/fallback behavior; exercise each with production-equivalent settings. |
| Support admin monitoring | Health endpoint at backend/src/health/health.controller.ts checks PostgreSQL with SELECT 1, reports cache as in-memory, and reports storage configured based on environment presence. | It does not verify S3 operation, Redis availability, background queue lag, AI providers, or user-visible workflow health. cron-job.org pinging a health URL is not a synthetic end-to-end test and does not replace alerts. |

### 3.2 Architecture diagram (source-level, not proof of deployment)

~~~mermaid
flowchart LR
  B[Browser: candidate / employer / admin] --> FE[Next.js customer frontend]
  B --> SA[Next.js support admin]
  FE -->|HTTPS API + Auth0 token| API[NestJS API]
  SA -->|Next route handlers / HTTPS| API
  B <--> AUTH[Auth0]
  API --> DB[(PostgreSQL via Prisma)]
  API --> JOB[pg-boss workers and schedules]
  JOB --> DB
  API --> S3[(S3-compatible resume bucket)]
  API --> OFFERS[(Separate offer artifact bucket)]
  API --> GEM[Gemini API]
  API --> MAIL[Email / SMS providers]
  API --> EXT[BGV / e-sign / job sources]
  PY[FastAPI AI service: deployment/use unknown] -. call path not found in inspected source .-> API
~~~

The source includes backend app and job code; it does not show an authoritative live service map. Verify actual deployment settings, public domains, process start commands, storage provider, database, and webhooks with their owners before migration planning is baselined.

## 4. Current hosting: verified facts and unknowns

| Item | What can be said now | Evidence needed to call it verified |
|---|---|---|
| Vercel | Report A and prior screenshots describe frontend and support-admin deployments. Not checked in a Vercel account during this review. | Project IDs, regions, build/runtime settings, environment-variable names, domains, branch auto-deploy, edge cache behavior, plans/invoices. |
| Render | Reports and user screenshots describe a Nest backend and an external health cron. Current Render plan, region, start command, scaling, and deployment state were not inspected. | Render service settings, start command (especially npm run start:prod vs Docker CMD), health check, plan/region, deployment history, logs, autoscaling. |
| PostgreSQL / Neon | Neon is claimed in reports. No live connection or dashboard access; provider, region, version, size, extensions, backups/PITR, and current billing unknown. | Owner-provided dashboard/export and sanitized DB inventory; no secret values needed in the report. |
| Redis / Upstash | Source cache path is in-memory; deployment docs reportedly mention Upstash. Whether a live integration uses it was not checked in provider dashboards. | Environment variable names and call graph, sanitized settings, account usage/billing, service logs. |
| Object storage | User says resume storage is configured; Report A claims S3-compatible configuration. This review did not inspect the storage account or env values. | Provider/region, separate buckets, versioning, encryption, public-access settings, lifecycle, data volume, object count, checksums, signed URL policy. |
| DNS/TLS | Existing custom domains are visible in prior user screenshots; registrar/zone authority and records are not independently confirmed. | Current authoritative zone records, TTLs, apex alias support, cert validation, webhook and OAuth callback hosts. |
| CI/CD | Repository contains CI configuration; provider-side auto-deployment and production branch behavior are unknown. | GitHub branch protection, required checks, Vercel/Render deployment hooks, credentials, artifact provenance, rollback runbook. |
| Secrets | No secret values or environment files were read. | Inventory secret names/owners/rotation needs; transfer using approved secret manager, never via report or Git. |
| cron-job.org | User previously showed a 10-minute external health ping. Current enabled state, endpoint history, response checking, and account configuration were not verified now. | Current job status and execution history. Keep-alive does not prove worker or customer-flow health. |

## 5. Launch-impact application and security findings

### Blockers before public AWS cutover

1. **Unisolated user code execution in the assessment engine — critical.** In work-nucleus/backend/src/modules/assessment-engine/assessment-engine.controller.ts, candidate-facing code-run and submit routes are marked Public and accept an assessment token. In work-nucleus/backend/src/modules/assessment-engine/coding/coding.service.ts, Judge0 absence or error falls back to local spawnSync execution of submitted Python/Node code. The child process inherits the API container's operating-system permissions and environment by default; timeout and output caps are not a security sandbox. A valid candidate attempt can therefore execute code in the API task's trust boundary. Fail closed if the isolated execution provider is unavailable, or use a separately isolated execution environment with no app secrets, network egress, or database/IAM access. Demonstrate escape tests and resource limits before enabling the routes publicly.
2. **Tenant isolation is not proven by TenantSafetyNet.** work-nucleus/backend/src/prisma/prisma.service.ts looks for undefined orgId in top-level where and limited relation filters. It does not add organization scope to queries with no orgId condition and it does not constitute a general tenant policy. Review every tenant-sensitive service/controller; add cross-tenant negative tests for reads, writes, exports, background jobs, admin/support paths, and object access. Consider database-level row security only after a careful schema/session design, not as an automatic quick fix.
3. **Mock/fallback data can look like successful production work.** Report A points to source paths such as resume-scoring.worker.ts, job-descriptions.service.ts, and whatsapp.service.ts where missing credentials/provider errors can return fabricated output or success-shaped results; verify each exact branch and whether it persists before release. Do not silently persist synthetic AI scores or content, and do not report an undelivered message as delivered. Production behavior should return an explicit unavailable/error state and emit a metric/alert. Admin mock-mode guards do not disable backend fallbacks.
4. **S3 access is not ready for ECS IAM roles as written.** file-upload.service.ts always supplies explicit credentials, with a MinIO fallback, to S3Client; this prevents normal SDK credential-chain use of the ECS task role. It may also attempt CreateBucketCommand at startup after a failed HeadBucket, granting the runtime broad provisioning rights if policy permits. offer-render.service.ts independently defaults to localhost:9000, minioadmin credentials, and path-style access. Configure both clients for task-role credential resolution, pre-create both buckets via infrastructure, and use narrowly scoped Get/Put permissions. Verify upload, signed download, expiration, and cross-tenant authorization from the browser and API.
5. **Schema changes lack a reviewed migration history.** No prisma/migrations directory was found in the inspected tree. backend/package.json defines start:prod as db push followed by node dist/main, but backend/Dockerfile's CMD is node dist/main. A Render dashboard start command could override that; it is unknown. The ambiguity itself is a release risk. Never assume db push runs, and never run it as an automatic production startup step. Establish a baseline/reviewed Prisma migration process, test it on a copy, and prove forward/rollback behavior for additive and destructive schema changes.

### High-priority readiness gaps

- **Job lifecycle and replica safety:** worker modules register on Nest initialization and schedule recurring work. Validate repeated schedule registration, pg-boss version behavior, job idempotency, shutdown draining, retry policy, and duplicate side effects with two backend tasks. No dedicated worker process mode is verified. Separate worker compute is not a no-code switch if process startup cannot select worker-only behavior.
- **Health semantics:** /api/v1/health executes SELECT 1 for DB but storage is configured based on env presence; it does not prove S3 read/write or queue processing. Add operational probes/alerts outside this report before using it as an all-system readiness gate. Avoid making health checks depend on optional vendors in a way that restarts healthy services during vendor outages.
- **Python service:** FastAPI requires Gemini configuration at import and health refers to an undeclared setting. If it is deployed, this likely fails readiness; if it is not a live dependency, exclude it from initial AWS scope. Validate usage through logs and deployment inventory before decommissioning anything.
- **Production build and CI coverage:** inspect the actual GitHub workflow and provider build settings. The earlier report found backend/frontend type checks and builds but gaps around Python, support-admin production build, container build, migration rehearsal, image scanning, deploy verification, and smoke tests. Verify the current workflow before gating release. CI success alone does not certify runtime integrations or tenant boundaries.
- **Secrets and container identity:** ensure production containers run non-root where feasible, no development MinIO/internal API defaults reach deployed tasks, and task roles are least privilege. Do not bake credentials into images or use long-lived AWS access keys in GitHub.
- **Privacy and retention:** resumes, offer files, candidate data, and audit logs require data classification, retention/deletion rules, backup encryption, restore controls, access logging, and a reviewed privacy/legal basis for cross-region transfer. No legal/compliance certification is inferred here.

## 6. Recommended AWS target architecture

### 6.1 Chosen design

Adopt ECS Fargate with a public ALB and private application tasks across two Availability Zones, private Multi-AZ RDS PostgreSQL, S3, and two NAT gateways. Begin with three ECS services: customer Next.js, support-admin Next.js, and NestJS API. Start with two tasks per service at a measured initial size (0.5 vCPU / 1 GiB is a budget assumption to load-test, not a proven requirement). Keep the existing Nest worker modules with the API service only after multi-task queue/schedule behavior is proven; otherwise run a single API task temporarily or make a deliberate worker-mode code change. Do not budget an extra worker service before that decision.

Use an ALB for HTTPS and host/path routing. The ALB is public; ECS tasks and RDS stay private. Put a NAT gateway in each application AZ for outbound Auth0/Gemini/email/SMS/webhook calls, and obtain a saved-region cost model for NAT processing and cross-AZ traffic. Add an S3 gateway VPC endpoint to avoid sending S3 data through NAT. Keep database security groups limited to the backend service. Do not allow public database access.

Use two private buckets or equivalent isolated prefixes for resumes and offer artifacts, with S3 Block Public Access, bucket policy, encryption, access logging as appropriate, versioning/retention chosen with data owners, and task-role permissions. Prefer SSE-S3 unless a compliance decision requires a customer-managed KMS key; CMK has key and request charges. The code must not create buckets at runtime.

Use GitHub Actions with AWS OIDC to build immutable images and publish to ECR. Use Parameter Store for ordinary configuration and Secrets Manager or encrypted parameters for actual secrets, selected deliberately. CloudWatch logs/metrics/alarms need explicit retention and spend alerts. Retain the existing DNS provider if it can safely point apex/subdomains to the chosen ALB/CloudFront target; Route 53 is optional. Add CloudFront only after testing cache behavior for authenticated pages, APIs, and private files. It is not required for a functional first cutover.

Keep Auth0, Gemini, email/SMS, BGV, e-sign and external job providers during the host migration. Confirm callback URLs, webhooks, signing secrets, retries, provider IP allowlists, and production credentials. Do not migrate identity or queue technology just to use AWS.

### 6.2 Target diagram

~~~mermaid
flowchart TB
  U[Browser users] --> DNS[Existing DNS or Route 53]
  DNS --> ALB[HTTPS Application Load Balancer in two public AZs]
  ALB --> FE[ECS Fargate customer web service: 2 tasks]
  ALB --> ADM[ECS Fargate support admin: 2 tasks]
  ALB --> API[ECS Fargate Nest API: 2 tasks; pg-boss behavior gated by test]
  subgraph VPC[QuestEdge VPC, ap-south-1]
    subgraph Public[Public subnets in two AZs]
      ALB
      NAT1[NAT gateway AZ-a]
      NAT2[NAT gateway AZ-b]
    end
    subgraph Private[Private application subnets in two AZs]
      FE
      ADM
      API
    end
    subgraph Data[Private database subnets]
      RDS[(RDS PostgreSQL Multi-AZ)]
    end
  end
  API --> RDS
  API --> S3[(Private S3 resume + offer buckets)]
  API -->|AZ route table| NAT1
  API -->|AZ route table| NAT2
  API -. S3 gateway endpoint route .-> S3
  API --> EXT[Auth0 / Gemini / email / SMS / BGV / e-sign]
  ECR[ECR images] --> FE
  ECR --> ADM
  ECR --> API
  CW[CloudWatch logs, metrics, alarms] -. observes .-> FE
  CW -. observes .-> ADM
  CW -. observes .-> API
~~~

This topology buys app task replacement, AZ distribution, private DB access, managed database failover, and operational consistency. It is not “zero downtime”: a deployment, database failover, bad migration, DNS issue, vendor outage, or application defect can still interrupt user journeys. Multi-AZ RDS failover and task replacement must be measured in rehearsal.

### 6.3 Services deliberately omitted at first

| Service/pattern | Decision and reason |
|---|---|
| ElastiCache Redis | Do not add based on current source: inspected cache is in-process and jobs use PostgreSQL. Reconsider only if a measured feature needs shared cache semantics. |
| SQS | Keep pg-boss initially; it is integrated with PostgreSQL. SQS would require job model, retry, idempotency, and transaction changes. |
| Aurora Serverless / read replicas | Not justified without DB load/HA/scale measurements. RDS PostgreSQL is the lower-complexity managed starting point. |
| EKS | No Kubernetes need shown; adds control-plane and operations complexity. |
| App Runner | Viable for some web services, but ECS better centralizes the multiple Next/Nest services, routing, private networking, task roles, and rollout controls here. Re-evaluate if a smaller service footprint or simpler operational model is preferred. |
| AWS WAF / Shield Advanced | Do not buy by default. Decide WAF based on threat model, security review, and budget; Shield Advanced is not an early-stage default. ALB security groups, application rate limiting, and monitoring remain required. |
| RDS Proxy | Defer unless measured connection pressure or failover behavior justifies it. |
| Mandatory CloudFront / Route 53 | Defer. Keep existing DNS if viable; add CloudFront for measured static delivery or edge needs with explicit no-cache rules for authenticated/private content. |
| Separate worker task | Do not add as an infrastructure-only decision; current workers are registered in Nest. Verify multi-replica behavior or implement a distinct process mode first. |

## 7. Cost model and hosting alternatives

### 7.1 Price date, assumptions, and limits

Prices checked 15 November 2026 from public AWS pages. INR conversion uses the latest available RBI reference page observed for **₹94.1997 per USD on 13 November 2026**; actual card conversion, AWS invoice conversion, tax, and FX can differ. Use USD for AWS budgeting and treat INR as planning conversion. See [RBI reference rates](https://www.rbi.org.in/?Id=94).

The estimate assumes 730 hours/month and on-demand Linux Fargate; six always-on 0.5 vCPU / 1 GiB tasks as an initial web/admin/API profile; ALB across two AZs; private tasks with two NAT gateways; RDS PostgreSQL Multi-AZ sized within a small-to-medium starting band; roughly 20–100 GB initial database/storage allocation and modest early traffic; S3 gateway endpoint; bounded logs; and limited public egress. Task sizes, DB tier, NAT regional rate, and actual use need validation in the calculator. Prices exclude external vendors, taxes, engineering, support plans, migration parallel-run charges, data egress from the old provider, and one-time transfer/restore work.

Official AWS pages give billing dimensions but do not provide a fixed bill independent of region/usage. The final quote must be saved from the [AWS Pricing Calculator](https://calculator.aws/) with ap-south-1, exact SKUs, hours, backup retention, data transfer, NAT GB, and public IPv4 count.

### 7.2 Recommended early-stage recurring estimate

| Cost component | Early planning range, USD/month | What drives it / caveat |
|---|---:|---|
| ECS Fargate compute | $85–$140 | Six continuously running tasks at initial size, plus deployment/headroom allowance. The size is not validated; API/workers may need more CPU/RAM. Fargate bills CPU, memory, storage, and task runtime. |
| ALB + LCU + public IPv4 | $30–$65 | ALB hourly, capacity units, and public IPv4 charges. LCU use varies with connections, bytes, rules, and TLS. |
| RDS PostgreSQL Multi-AZ, storage and backup allowance | $70–$150 | Instance class, provisioned storage, backup beyond included allowance, snapshots, and PITR retention determine cost. Must size after DB inventory/load test. |
| Two NAT gateways, IPv4 and processing allowance | $75–$140 | Persistent hourly fee, address fees, GB processed, and cross-AZ route/transfer. Mumbai rate must come from the calculator; S3 gateway endpoint reduces S3 NAT processing. |
| S3 storage, requests, versioning and modest document transfer | $10–$50 | Object count/size, GET/PUT, version retention and downloads dominate. Candidate document egress can exceed this allowance. |
| CloudWatch logs, metrics, alarms | $20–$60 | Ingestion, custom metrics, dashboards, alarms and retention; set retention explicitly. Free-tier eligibility is not assumed. |
| ECR, DNS, Parameter Store/Secrets, KMS and inter-AZ allowance | $15–$45 | Image storage, DNS queries/hosted zone if moved, secret count/type, KMS keys/requests, and internal transfer. |
| **Planning total including uncertainty reserve** | **$350–$650** | Rounded budget range; line items are not a bill guarantee. Extra egress, DB growth, or vendor allowlisting needs can exceed it. |

At ₹94.1997/USD the total is approximately **₹32,970–₹61,230**; rounded for planning to **₹33,000–₹61,000/month**. A two-NAT topology is intentionally more expensive than Report A's public-task/no-NAT topology. If management chooses one NAT, subtract roughly one gateway's hourly/address baseline plus processing, but accept an AZ egress single point of failure and cross-AZ routing risk. If it chooses public tasks to avoid NAT, obtain a written security review and price every task public IP.

### 7.3 Scenario ranges (planning only)

User counts are scenarios requested for planning, not claims about QuestEdge traffic. A team must replace these ranges with traffic and storage measurements.

| Scenario | Illustrative AWS range/month | Approx. INR/month | Assumption |
|---|---:|---:|---|
| Early stage: 100–500 users | **$350–$650** | **₹33k–₹61k** | Recommended managed baseline; limited egress and log volume, small-to-medium DB, 6 initial tasks, Multi-AZ DB and two NATs. |
| Growing: 1,000–5,000 users | **$700–$1,800** | **₹66k–₹1.70 lakh** | Larger/added tasks, more DB capacity, higher file/AI request volume, logs, and transfer. Requires load profile before sizing. |
| Scaling: 10,000+ users | **$1,500–$5,000+** | **₹1.41–₹4.71 lakh+** | Multiple workload pools, larger database, more egress/storage/logs, and potentially CDN/WAF/connection pooling. User count alone cannot select capacity. |

Do not approve these scenario totals without a workbook/export identifying every SKU and expected bytes/requests. These are order-of-magnitude envelopes, not precise quotes.

### 7.4 Is one EC2/Docker Compose host genuinely cheaper?

**On AWS cash invoice alone, usually yes at steady low utilization. On total cost and availability, not automatically.** A single VM can consolidate idle capacity, avoid ALB/NAT, and keep a predictable low bill. But an instance failure, host patch/reboot, disk issue, OOM, deploy, or Docker daemon failure can take down the entire application. If PostgreSQL is also on that host, it shares the failure domain and database operations/backups become the team's responsibility. If PostgreSQL is moved to RDS, database risk improves but the application still has one host and deployments may cause downtime.

| Option | Approximate cash profile | Main trade-off |
|---|---|---|
| Lightsail single VM + Compose + self-managed PostgreSQL | Lightsail 4 GB is currently $24/month; 8 GB is $44/month. Add snapshots, S3, monitoring, and any excess transfer. A sensible whole-stack envelope might be **$50–$120/month** before engineering time, but the correct size and extras are unmeasured. | Lowest predictable cash floor; all services and possibly data share one failure domain. Snapshots are not a substitute for a tested database-consistent restore. Lightsail CPU burst baseline also matters; see [CPU baseline behavior](https://docs.aws.amazon.com/lightsail/latest/userguide/baseline-cpu-performance.html). |
| Single EC2 Compose + managed RDS Single-AZ + S3 | EC2 line can be lower than Fargate at full-time utilization, but EBS, public IPv4 (~$3.65/month), snapshots, egress, RDS, and NAT/route choices are separate. Budget only after SKU selection; no false precision here. | Cheaper than replicated ECS in many low-load cases; still one application host and manual OS/container patching. Add the operator's time and outage risk to compare total cost. |
| Recommended ECS + ALB + Multi-AZ RDS + S3 | **$350–$650/month** early planning. | Higher idle AWS bill, but managed task replacement, deployment rollback controls, private segmentation, and DB failover. Not highly available by declaration; rehearse failover and verify each service's two-task behavior. |

Thus Report A is right that a VM's raw bill can be lower, but wrong to present $24.50 as production-equivalent to managed ECS or to claim an 8 GB/4 GB configuration fits without benchmarks. Report B is right that a VM raises operational risk, but its early-stage ECS budget is too broad and its component minima do not reconcile with its own stated total. The missing variable is not only cloud compute: it is engineer/on-call cost and the business cost of an outage or data loss. AWS invoice comparison alone does not establish “more economical.”

### 7.5 Recurring charges commonly missed

- Public IPv4 per address-hour, including addresses on resources; NAT gateway public addresses and ALB/task addresses can accumulate.
- NAT gateway hourly and per-GB processing; cross-AZ transfer when tasks use a gateway in another AZ; internet data transfer out.
- ALB hourly, LCU-hours, public IPv4, and increased capacity with traffic.
- RDS instance hours, Multi-AZ standby, storage, I/O where applicable, snapshots/PITR beyond included backup storage, and cross-AZ/data transfer.
- S3 current and previous object versions, PUT/GET/LIST requests, retrieval, lifecycle transitions, replication if enabled, and user downloads. CloudFront may change transfer economics but has request/transfer/feature dimensions and cache invalidation behavior.
- CloudWatch log ingestion, archived storage, custom metrics, dashboards, alarms, traces, and retention. Set retention deliberately; do not assume a free tier forever.
- ECR image storage and old untagged image accumulation; lifecycle policy required.
- Secrets Manager per-secret/month and requests, KMS customer-managed keys/requests, SSM advanced parameters if used, Route 53 zone/query fees, backup policy/storage, support plan/tax.
- Temporary double running costs while Render/Vercel and AWS run in parallel, data egress from the old provider, database export/transfer, and migration engineering.

### 7.6 External costs that remain

Auth0, Gemini, Resend/SendGrid, Twilio or other messaging, background verification, e-signature, external job sources, cron-job.org, and any observability vendor remain separately billed unless deliberately replaced. Their prices depend on volume, region, and contracts and are excluded. Neon/Upstash/Render/Vercel costs stop only after successful migration and service cancellation; current invoices were not inspected.

## 8. Compatibility and application change estimate

| Area | Finding | Migration treatment |
|---|---|---|
| Next.js apps | Self-hosting is supported, but current Vercel build and cache behavior are unknown. Report A suggests standalone output as necessary; it is an optimization for container packaging, not inherently required for every Next container. | Configuration/build review, runtime env mapping, health endpoint, cache headers and Auth0 callback/origin updates. Verify actual output mode and image size. |
| NestJS Docker | Dockerfile builds Node 20 Alpine and runs node dist/main. It copies Prisma artifacts. No production AWS image execution was performed. | Build and run the exact production image in staging. Add non-root/runtime filesystem review and container health behavior. Validate ARM64 if choosing Graviton; native dependencies must build for target architecture. |
| Prisma/PostgreSQL | PostgreSQL is portable in principle, but live extension/version/size and source compatibility unknown. Production start command ambiguity and absence of checked-in migrations are material. | Baseline schema, reviewed migrations, backup/restore and migration rehearsal. Do not use automatic db push at startup. A database migration may require an outage unless supported CDC/replication is verified. |
| pg-boss | Uses PostgreSQL; no need to change to SQS solely for AWS. Workers/schedulers run inside Nest modules. | Verify queue schema, advisory locks/cron schedule uniqueness, retries/idempotency, connection limits, and graceful shutdown with target task counts. Separate worker mode may require code/config work. |
| Redis | Current inspected cache is local memory. | No Redis migration or ElastiCache required for source paths reviewed. Validate any external Upstash use before cancellation. |
| S3 | AWS SDK present, but current clients explicitly construct static MinIO credentials and one defaults endpoint to localhost. | Small but required code/config change for task-role auth; separate bucket policies and task role. Verify all file upload/download and offer rendering workflows. No access keys in ECS task definition. |
| Auth0 | Existing identity integration should remain. | Configuration change: callbacks, allowed origins/logout, API audience/issuer, HTTPS domains; confirm production tenant settings and MFA. |
| Python AI | Runtime dependency not demonstrated. It has missing/unsafe defaults and failing-looking health property. | External deployment inventory first. If unused, do not migrate it. If used, small/medium config and readiness fixes plus dependency/secret tests. |
| Email/webhooks | Multiple providers/paths are present. | Configuration and endpoint overlap; test signature verification, replay, retries and idempotency. Keep external vendors. |
| AWS security identity | SDK support alone does not make task-role usage correct because explicit credentials are supplied. | Small service configuration/refactor; least-privilege task role and bucket policy. |
| Data/job behavior | Background side effects and persisted fallbacks require operational validation. | Small-to-significant change depending on affected flows; replace fake success with explicit errors, alert, and reconcile production records if fabricated values exist. |

**Expected application effort:** not zero. The coding-execution issue can require significant remediation and security testing; tenant enforcement and mock/fallback cleanup may also require broad changes. Storage and deployment configuration are smaller. Without code changes, do not claim ECS task roles, safe code execution, robust tenant isolation, zero-downtime database change, or production-ready readiness probes.

## 9. Migration roadmap with gates, validation, and rollback

The phases below are sequential gates, not a promise of zero downtime. Keep Render/Vercel live and authoritative until cutover is explicitly approved. A realistic planning window is **several engineering weeks plus a 7–14 day soak**, dependent on remediation scope, team staffing, data volume, provider access, and test results. Do not commit to Report A's 3–4 days without reducing scope and accepting explicit risks.

| Phase | Objective and tasks | Validation / exit criteria | Rollback and cost note |
|---|---|---|---|
| 0. Audit and decisions | Obtain current Vercel/Render/Neon/storage/Auth0/DNS/provider inventory, monthly invoices, data size, logs, traffic/concurrency, webhook sources, and RTO/RPO. Record exact production start command and whether FastAPI/Upstash are live. | Signed source-of-truth inventory; no secret values in docs; owners assigned; target SLO/RPO/RTO, region/data rules, cost ceiling approved. | No production change. Engineering/audit cost only. Stop migration if service map or data owner is unknown. |
| 1. Security and application readiness | Resolve/disable local candidate code execution; review all tenant-sensitive routes/jobs/files; remove persisted mock/success-shaped outcomes; fix both S3 clients; establish production migration workflow; clarify FastAPI and health semantics. | Negative cross-tenant tests; malicious code cannot reach app env/network/DB; missing providers return explicit errors; S3 task-role tests pass; production image has no development defaults. Independent security sign-off. | Keep old production unchanged. Do not progress to traffic cutover while critical security gates fail. |
| 2. AWS account and foundations | Select production/staging accounts, IAM roles, GitHub OIDC, budgets/alerts, CloudTrail, KMS strategy, ECR repositories, SSM/Secrets, tagging and access policy. | No static AWS keys in GitHub; least-privilege access reviewed; budget alert test delivered; audit log retained; image scan and immutable tag policy pass. | Revoke new roles/secrets and destroy unneeded staging resources; no application data moved yet. |
| 3. Network and compute staging | Build VPC in ap-south-1, two AZs, public ALB subnets, private task subnets, private DB subnets, two NAT gateways and S3 gateway endpoint, security groups. Build frontend/admin/API images, deploy staging tasks. | Internet can reach only ALB; tasks and DB have no public address; only API SG reaches DB; outbound vendor tests pass from both AZs; health/readiness/startup and stop signals behave correctly. Fargate task sizing and target ARM64/x86 build measured. | Remove staging tasks/ALB/NAT if no longer needed; preserve logs; no live DNS change. NAT resources accrue while provisioned. |
| 4. Database target and restore rehearsal | Create encrypted RDS PostgreSQL Multi-AZ and storage. Create schema baseline and migration pipeline. Take full source backup, restore into an isolated staging target, compare extensions/schema/data. | Restore completes; counts and checksums on agreed critical tables match; constraints/indexes valid; Prisma client and migrations work; app smoke tests pass; backup/PITR restore drill meets approved target. | Drop isolated target after evidence or preserve for repeat. Production DB remains source. Do not claim rollback based on DNS. |
| 5. File/object rehearsal | Inventory source buckets; copy to private S3 while preserving keys, metadata, versions/tags where needed; keep source objects available for read comparison. | Compare object count, bytes, key manifest and checksums; sample resume and offer downloads/uploads; test signed URL expiry, authorization, deletion/retention, separate bucket policies. Confirm DB references still resolve. | Keep source bucket untouched; reverse/copy back only after new writes are frozen and manifests reconciled. |
| 6. Integration and job validation | Configure Auth0 callbacks, Gemini/email/SMS/BGV/e-sign sandbox credentials, webhook overlap, queue schedules/workers, and outbound allowlists. Run two API tasks to assess pg-boss behavior. | Login/logout, candidate/employer/admin workflows, webhooks/signatures/replay, AI provider errors, notification delivery, queue retries, duplicate schedule prevention, shutdown/drain and queue lag alerts pass. | Disable new webhook destinations and stop staging workers; old endpoints remain primary. Never send real customer notifications from staging. |
| 7. CI/CD and rollback practice | GitHub Actions OIDC builds/scans/pushes images and deploys staging then production with approval; create immutable task definitions, deployment circuit breaker, migration-before-app procedure and rollback runbook. | Automated deploy, failed health check rollback, prior image redeploy, no secrets in logs/artifacts, database backward compatibility tested. | Re-deploy previous task definition; database rollback requires compatible migration/recovery plan, not just app redeploy. |
| 8. Production parallel validation | Deploy production services and DB in parallel but keep old platform as authoritative. Use synthetic traffic and internal pilot; do not dual-write production business records. | Auth and role matrix, cross-org isolation, file access, background jobs, support admin, API, rate limits, logs/alarms, backup and restore, failover, cost dashboards, latency and load targets signed off. | Route test users to old stack; stop AWS application tasks if unsafe; preserve RDS/S3 for diagnosis. |
| 9. Final data sync and cutover | Choose maintenance window. Freeze source writes and stop source workers/webhooks; take final source backup. Restore final DB or perform rehearsed CDC/final synchronization if source supports it; copy final object delta; validate counts/checksums; deploy AWS with new DB/bucket; point DNS. | Source remains read-only. Verify health, authentication, tenant-scoped workflows, queues, uploads, webhooks, error rate, DB query alarms, and reconciliation before reopening writes. Record exact cutover timestamp and baseline counts. | If before AWS writes: route back to old host. If AWS has accepted writes: do not simply point DNS back. Freeze both sides and reconcile AWS DB/object deltas to source or use tested reverse replication; otherwise rollback entails an explicitly approved data-loss window. |
| 10. Soak and retirement | Keep old platform available read-only/rollback-capable through 7–14 days or an approved longer period. Monitor AWS spend, data drift, queue outcomes, external provider callbacks and restores. | No unresolved data/object divergence; backup restore and task rollback proven; business owners sign off; all routes/webhooks have moved; AWS bill matches approved model; retain archived final source backup. | Cancel Render/Vercel/Neon/storage only after sign-off and rollback window close. Keep old data export per retention/legal policy. |

### 9.1 Database safety and rollback details

- Inventory PostgreSQL version, extensions, collation/timezone, roles/grants, sequences, large objects, schema ownership, connection limit, pg-boss tables, and every consumer before selecting migration method.
- Take a consistent full backup and restore it into a non-production RDS target. Measure dump, transfer, restore, indexes, sequence repair, and validation time at production data size. A logical backup is not a “delta sync.”
- Establish a migration baseline from the live schema and use reviewed forward migrations. Test each release against a production-like copy. Avoid destructive schema changes until old and new application versions can both operate safely.
- If business requires low downtime, verify source-provider logical replication/CDC support, extensions, permissions and lag behavior with the source provider. Do not assume Neon supports the exact replication path or that DMS will be plug-and-play. Rehearse initial load, replication lag, final stop-writes, final sync, and failback.
- Reconcile row counts and key aggregates by tenant for critical entities; compare deterministic checksums for tables/objects where feasible; verify sequence values, constraints, indexes, and application-level references. Include job tables and prevent duplicate jobs from executing during cutover.
- For final cutover, fence writes on the old app and pause scheduled workers/webhooks before final sync. Never allow both databases to accept writes without a designed conflict-resolution system.
- Rollback after AWS has accepted writes requires reverse synchronization or a controlled export/replay. DNS alone only changes where new requests go; it does not merge database state or files. Declare a rollback cutoff and data-loss decision before the window.

### 9.2 File/resume migration requirements

Map each source key to destination key without changing DB references unless necessary. Inventory object versions, content type, metadata, tags, size, checksums, access policy, retention, and signed URL patterns. Preserve object ownership and permissions through bucket policy and application authorization rather than public ACLs. Copy existing objects in bulk and run a final delta after uploads are frozen; compare manifest and checksums; test a representative sample and edge cases. Keep original storage readable through the rollback window. aws s3 sync alone does not establish correctness for all versions, tags, metadata, ACLs, and permissions; decide and verify each required property.

## 10. Security, reliability, and operations controls

- **Identity/IAM:** separate human roles and task execution/task roles; GitHub OIDC trust scoped to repository and branch/environment. Execution role pulls images and writes logs; application role only accesses named buckets/secrets. No broad administrator permissions on runtime tasks.
- **Network:** public ALB only; app tasks private; RDS private; SG chains ALB → app service → DB. Restrict outbound where practical; document vendor destinations. NAT gateway per AZ is billed and must be alarmed. S3 gateway endpoint avoids NAT for S3.
- **Files:** S3 Block Public Access; encryption at rest; HTTPS/TLS; short-lived signed links; authorization before signed URL issuance; lifecycle/retention/deletion rules; object access logs and backup strategy. Verify URL expiry and cross-tenant references.
- **Database:** private access, encryption, TLS, least-privilege DB users, connection pool limits, automated backups/PITR, snapshot copy/retention policy, restore drills, and reviewed schema migrations. Multi-AZ does not protect against bad writes/deletes; backups do not replace restore tests.
- **Containers:** pin base images/dependencies, scan images, run as non-root where possible, use read-only filesystem where compatible, limit task CPU/memory, redact logs, avoid secrets in environment dumps, and isolate code execution from API tasks.
- **Application:** enforce tenant authorization at service/data access, validate webhook signatures and replay windows, rate-limit public and admin endpoints, and make retries idempotent. Establish alert ownership and incident runbooks.
- **Observability:** structured logs, request/trace IDs, latency/error metrics, DB connections/CPU/storage, task restarts/OOM, ALB 4xx/5xx/target health, NAT bytes/errors, queue age/failures, S3 upload failures, webhook delivery, and billing alerts. Keep logs finite and access controlled.
- **Recovery:** agree RTO/RPO by business owner; use independent backup retention and restore drills; document region outage recovery. A single Mumbai region does not protect against a regional AWS event. Cross-region DR is an additional architecture and cost decision, not assumed in this estimate.
- **Privacy and compliance:** confirm data residency, candidate consent/retention/deletion, processor terms, and whether resumes/offer documents may be replicated or transferred. AWS deployment does not itself create compliance certification.

## 11. CI/CD recommendation

Use protected GitHub main/staging environments with required checks, branch review, and OIDC roles. Build separate immutable images for customer frontend, support admin, and backend; include a Python image only after dependency verification. Run TypeScript/Python checks and tests, all production builds, container build and scan, migration validation against PostgreSQL, secret scan, and integration contract tests. Publish versioned images to ECR; deploy staging automatically; require an approval gate for production. Deploy using ECS rolling updates with health checks/circuit breaker and retain the prior task definition/image for rollback.

Database change sequence: review additive/backward-compatible migration, snapshot/backup, apply migration as a controlled release job, verify, then deploy app. Destructive schema cleanup follows a later release after old code is retired. CI must not run prisma db push against production. Post-deploy smoke checks should cover auth, API/database health, S3 operations, tenant separation, and queue status without mutating customer data. Deployment should fail closed if smoke checks fail. Keep staging and production accounts or strong environment boundaries separate.

## 12. Management approvals required

1. Is the business reason to migrate now worth a higher managed-AWS baseline, or should current Render/Vercel remain until a measurable performance, reliability, security, or contractual need exists?
2. What are approved monthly AWS limits for staging and production, and what alert/stop thresholds are required? Approve the initial planning range only after calculator output.
3. What are the required availability target, maintenance window, RTO and RPO? Approve Multi-AZ RDS and two NAT gateways, or explicitly accept single-AZ database/egress failure risk and recovery time.
4. Is Mumbai the required data region? Are cross-region backups/DR, candidate data residency, retention and deletion obligations required?
5. Is customer-facing coding assessment execution in scope for launch? If yes, approve a secure isolated execution design and testing budget; otherwise approve disabling the public feature until ready.
6. Who owns security sign-off for tenant isolation, S3 object authorization, Auth0 admin access/MFA, webhook signing, and incident response?
7. Which external providers stay, who owns each credential/contract/allowlist, and which flows are sandbox versus production?
8. What source database/storage outage window is acceptable? Approve maintenance freeze versus funding/testing CDC for minimized downtime.
9. Who is authorized to approve cutover, data reconciliation, rollback, and eventual cancellation of Render/Vercel/Neon/storage?
10. Who is on call for AWS, and is the team prepared to operate ECS, VPC/NAT costs, RDS failover, secrets rotation, alarms, and restore drills?

## 13. Final recommendation and answers

| Decision question | Principal architect answer |
|---|---|
| Which architecture should QuestEdge adopt if moving to AWS? | ECS Fargate + ALB + private Multi-AZ RDS PostgreSQL + private S3, with two-AZ private tasks and two NAT gateways; Auth0 and existing external services retained. |
| Why this instead of one EC2/Lightsail host? | A single host is cheaper on invoice but is an app failure/deploy/patch single point of failure. ECS/RDS cost more but remove host management and isolate database and app failure domains. The value depends on outage cost and team capacity. |
| What is realistic monthly cost? | Early managed baseline about $350–$650 (₹33k–₹61k) before external APIs, taxes, support, staffing and migration parallel run; use AWS Calculator for approval. |
| What is the cheapest safe setup? | A single EC2 Compose host with managed RDS Single-AZ and S3 can reduce fixed cloud costs, but it is not highly available. Lightsail bundle gives predictable compute/transfer but collocating PostgreSQL with app containers is not recommended for business records without accepted outage/data risk and tested independent backups. |
| Which services remain external? | Auth0, Gemini, email/SMS, BGV/e-sign, job sources and current DNS/monitoring unless a separate cost or risk analysis supports migration. |
| Biggest risks? | Public local code execution, tenant data boundary, fabricated persisted fallback data, S3 credentials/policies, uncontrolled schema changes, duplicate or lost jobs, database/file divergence, unverified provider settings and underpriced network egress. |
| How much code change? | Nonzero and not reliably “small overall.” Code execution isolation may be significant; tenant enforcement and fallback removal may span services; S3 task-role and migration/startup behavior are smaller but required. |
| How long? | Several engineering weeks plus a 7–14 day soak is a reasonable planning allowance; refine after remediation inventory, data restore timing and staffing. |
| What first? | Close security blockers and obtain provider/database/storage inventory; then baseline migrations and rehearse restores before AWS production buildout. |
| When cancel Render/Vercel? | After cutover, data/file reconciliation, callbacks/jobs, restore and rollback are proven through the approved soak; never on a fixed seventh day without sign-off. |

## 14. Official references

### AWS pricing and service behavior

- [AWS Pricing Calculator](https://calculator.aws/) — save the region-specific bill of materials.
- [AWS Lightsail pricing](https://aws.amazon.com/lightsail/pricing/) and [Lightsail instance bundles](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html).
- [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/), [ECS pricing](https://aws.amazon.com/ecs/pricing/), and [ECS task IAM roles](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html).
- [Amazon RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/) — instance hours, storage, backups, deployment mode, and transfer.
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/) and [NAT gateway pricing guidance](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html).
- [Elastic Load Balancing pricing](https://aws.amazon.com/elasticloadbalancing/pricing/) — ALB hours and LCUs.
- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/), [CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/), [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/), [ECR pricing](https://aws.amazon.com/ecr/pricing/).
- [Route 53 pricing](https://aws.amazon.com/route53/pricing/), [Secrets Manager pricing](https://aws.amazon.com/secretsmanager/pricing/), [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html), [AWS Backup pricing](https://aws.amazon.com/backup/pricing/).
- [RBI reference rates](https://www.rbi.org.in/?Id=94) — latest rate available at review was ₹94.1997/USD at 1 p.m. on 13 November 2026.

### Implementation references

- [AWS ECS deployment circuit breaker](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html).
- [AWS DMS PostgreSQL source considerations](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html) — CDC must be validated against actual provider capabilities.
- [GitHub Actions OIDC with AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html).
- [Next.js self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) — standalone output is a deployment option, not proof of current Vercel settings.

---

**Conclusion:** The architectural direction is clear, but an AWS bill and container deployment will not by themselves make the current platform production-ready. First close the code-level security and correctness blockers, prove database and file recovery, establish the live hosting inventory, and make management decisions on cost and availability. Then build the parallel AWS environment and cut over only after the exact validation gates in this plan pass.
