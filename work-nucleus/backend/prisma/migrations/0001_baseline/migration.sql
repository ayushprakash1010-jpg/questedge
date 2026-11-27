-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR', 'HIRING_MANAGER', 'INTERVIEWER', 'VIEWER', 'SUPPORT_REP', 'SUPPORT_ADMIN');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('TECHNICAL', 'LEADERSHIP', 'BEHAVIOURAL', 'COMMUNICATION', 'DOMAIN');

-- CreateEnum
CREATE TYPE "HiringPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SkillPriority" AS ENUM ('MUST_HAVE', 'NICE_TO_HAVE');

-- CreateEnum
CREATE TYPE "JdStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('SCREENING', 'TECHNICAL', 'HR', 'LEADERSHIP', 'CULTURAL', 'OFFER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('REFERRAL', 'JOB_BOARD', 'DIRECT', 'AGENCY', 'INTERNAL', 'RECRUITER_DIRECT');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'SELECTED', 'REJECTED', 'ON_HOLD', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StageOutcome" AS ENUM ('PASSED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrainingCategory" AS ENUM ('JD_FORMAT', 'INTERVIEWING_SKILLS', 'FEEDBACK_GUIDELINES', 'HIRING_PROCESS');

-- CreateEnum
CREATE TYPE "PublishChannel" AS ENUM ('LINKEDIN', 'INDEED', 'NAUKRI', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED', 'REMOVED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('TECHNICAL', 'BILLING', 'FEATURE_REQUEST', 'BUG_REPORT', 'ONBOARDING', 'BGV_DISCREPANCY', 'GENERAL');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('L1', 'L2', 'L3', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('SHADOW', 'IMPERSONATE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ESignProvider" AS ENUM ('DIGIO', 'LEEGALITY');

-- CreateEnum
CREATE TYPE "ESignStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "JoiningStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DOCUMENTS_PENDING', 'READY_TO_JOIN', 'JOINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BgvProfileStatus" AS ENUM ('NOT_STARTED', 'CONSENT_PENDING', 'IN_PROGRESS', 'NEEDS_REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BgvCheckType" AS ENUM ('PAN', 'AADHAAR', 'PASSPORT', 'EDUCATION', 'EMPLOYMENT_HISTORY', 'ADDRESS_CURRENT', 'ADDRESS_PERMANENT', 'CRIMINAL_COURT', 'POLICE_VERIFICATION', 'CREDIT_CHECK', 'GLOBAL_DATABASE', 'DRUG_TEST', 'REFERENCE');

-- CreateEnum
CREATE TYPE "BgvCheckStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BgvFinding" AS ENUM ('PENDING', 'CLEAR', 'DISCREPANCY', 'UNABLE_TO_VERIFY');

-- CreateEnum
CREATE TYPE "BgvRiskScore" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "BgvVendor" AS ENUM ('AUTHBRIDGE', 'ONGRID', 'IDFY', 'SPRINGVERIFY');

-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('MID_YEAR', 'ANNUAL', 'PROBATION', 'SPECIAL');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'GOAL_SETTING', 'SELF_ASSESSMENT', 'MANAGER_REVIEW', 'PEER_FEEDBACK', 'CALIBRATION', 'COMMUNICATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('OKR', 'KRA', 'COMPETENCY', 'VALUE', 'STRETCH');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'AGREED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'NOT_MET', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('SELF', 'MANAGER', 'SKIP_LEVEL');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'FINALISED', 'REOPENED');

-- CreateEnum
CREATE TYPE "PeerRelationship" AS ENUM ('PEER', 'REPORT', 'MANAGER', 'SKIP_LEVEL', 'CROSS_FUNCTIONAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "FeedbackRequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'LOCKED', 'DISTRIBUTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('DRAFT', 'MANAGER_REVIEW', 'DIRECTOR_APPROVAL', 'CHRO_APPROVAL', 'CEO_APPROVAL', 'APPROVED', 'LOCKED', 'COMMUNICATED');

-- CreateEnum
CREATE TYPE "CompLetterStatus" AS ENUM ('PENDING', 'RENDERED', 'DELIVERED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('HIRING', 'APPLICATIONS', 'APPRAISAL', 'COMPENSATION', 'BGV', 'ATTRITION');

-- CreateEnum
CREATE TYPE "ReportVisualization" AS ENUM ('TABLE', 'BAR', 'LINE', 'FUNNEL', 'HEATMAP');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_FAILED', 'ACCESS_GRANTED', 'ACCESS_DENIED', 'ROLE_CHANGED', 'SECRET_ACCESSED', 'DATA_EXPORTED', 'CONFIG_CHANGED');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('CANDIDATE', 'RECRUITER', 'COMPANY_ADMIN', 'COMPANY_USER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MandateParticipationType" AS ENUM ('OPEN', 'LIMITED', 'APPROVAL_BASED', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING_CONSENT', 'CONSENT_REQUESTED', 'CANDIDATE_ACCEPTED', 'CANDIDATE_DECLINED', 'ACTIVATED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'HIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('DIRECT_APPLICATION', 'RECRUITER_REFERRAL', 'EMPLOYEE_REFERRAL', 'PLATFORM_SOURCING', 'INTERNAL_SOURCING', 'RECRUITER_SELF_APPLY');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('POTENTIAL', 'ELIGIBLE', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DISPUTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "StatusCheckResponse" AS ENUM ('HIRED', 'IN_PROCESS', 'REJECTED', 'NOT_INTERESTED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "BypassRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('TRUSTED', 'STANDARD', 'FLAGGED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "HiringAssessmentType" AS ENUM ('QUIZ', 'CODING', 'VIDEO_INTERVIEW');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SUBJECTIVE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'TIMED_OUT', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CodeSubmissionStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'PARTIAL', 'FAILED', 'ERROR', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "VideoInterviewStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RankingStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "auth0_sub" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "user_type" "UserType" NOT NULL DEFAULT 'COMPANY_USER',
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo_account" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "industry" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_plans" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "total_roles" INTEGER NOT NULL,
    "filled_roles" INTEGER NOT NULL DEFAULT 0,
    "status" "HiringPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "budget_min" DECIMAL(12,2) NOT NULL,
    "budget_max" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "hiring_manager_id" UUID NOT NULL,
    "reporting_manager_name" TEXT NOT NULL,
    "hod_name" TEXT NOT NULL,
    "team_size" INTEGER,
    "team_levels" TEXT,
    "designation" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hiring_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_plan_skills" (
    "id" UUID NOT NULL,
    "hiring_plan_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "priority" "SkillPriority" NOT NULL,
    "min_proficiency" INTEGER NOT NULL,

    CONSTRAINT "hiring_plan_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL,
    "hiring_plan_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL DEFAULT '{}',
    "fitment_mapping" JSONB NOT NULL DEFAULT '{}',
    "evaluation_parameters" JSONB NOT NULL DEFAULT '{}',
    "generated_by_ai" BOOLEAN NOT NULL DEFAULT true,
    "ai_prompt_used" TEXT,
    "status" "JdStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL,
    "hiring_plan_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "stage_type" "StageType" NOT NULL,
    "max_duration_days" INTEGER,
    "skills_to_evaluate" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mandate_id" UUID,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stage_interviewers" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pipeline_stage_interviewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resume_url" TEXT,
    "source" "CandidateSource" NOT NULL,
    "current_company" TEXT,
    "current_role" TEXT,
    "experience_years" DECIMAL(4,1),
    "expected_ctc" DECIMAL(12,2),
    "notice_period_days" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_applications" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "hiring_plan_id" UUID NOT NULL,
    "current_stage_id" UUID,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage_entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "selection_notes" TEXT,
    "cover_letter" TEXT,
    "total_score" DECIMAL(5,2),
    "ai_summary" TEXT,
    "ai_match_score" DECIMAL(5,2),
    "ai_match_summary" TEXT,
    "mandate_id" UUID,
    "candidate_profile_id" UUID,
    "source_type" "SourceType",
    "referral_id" UUID,

    CONSTRAINT "candidate_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_stage_history" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exited_at" TIMESTAMP(3),
    "outcome" "StageOutcome",

    CONSTRAINT "candidate_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_feedbacks" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "interviewer_id" UUID NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "recommendation" "Recommendation" NOT NULL,
    "qualitative_notes" TEXT,
    "strengths" TEXT,
    "concerns" TEXT,
    "duration_minutes" INTEGER,
    "is_submitted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_skill_ratings" (
    "id" UUID NOT NULL,
    "feedback_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "feedback_skill_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selection_decisions" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "decision" "DecisionType" NOT NULL,
    "decided_by_id" UUID NOT NULL,
    "decision_notes" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "offer_ctc" DECIMAL(12,2),
    "offer_designation" TEXT,
    "joining_date" TIMESTAMP(3),
    "communication_draft" JSONB,
    "communication_sent" BOOLEAN NOT NULL DEFAULT false,
    "communication_sent_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selection_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_modules" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "category" "TrainingCategory" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "estimated_minutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_completions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "action_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_settings" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_publishings" (
    "id" UUID NOT NULL,
    "job_description_id" UUID NOT NULL,
    "hiring_plan_id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "channel" "PublishChannel" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "external_job_id" TEXT,
    "external_url" TEXT,
    "public_slug" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_publishings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_health_metrics" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "metric_date" TIMESTAMP(3) NOT NULL,
    "active_users" INTEGER NOT NULL,
    "hiring_plan_count" INTEGER NOT NULL,
    "open_roles" INTEGER NOT NULL,
    "fill_rate" DECIMAL(5,2) NOT NULL,
    "avg_time_to_hire" INTEGER,
    "health_score" INTEGER NOT NULL,
    "risk_flags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" "TicketCategory" NOT NULL DEFAULT 'GENERAL',
    "assignee_id" UUID,
    "reported_by" TEXT NOT NULL,
    "sla_deadline" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_notes" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_escalations" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "level" "EscalationLevel" NOT NULL,
    "reason" TEXT NOT NULL,
    "escalated_by_id" UUID NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_sessions" (
    "id" UUID NOT NULL,
    "support_user_id" UUID NOT NULL,
    "target_org_id" UUID NOT NULL,
    "target_user_id" UUID,
    "session_type" "SessionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "actions_log" JSONB NOT NULL DEFAULT '[]',
    "ip_address" TEXT,

    CONSTRAINT "support_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_templates" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "branding_json" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "compensation_id" UUID,
    "generated_doc_url" TEXT,
    "signed_doc_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "first_viewed_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "approval_chain" JSONB NOT NULL DEFAULT '[]',
    "negotiation_log" JSONB NOT NULL DEFAULT '[]',
    "candidate_token" TEXT,
    "created_by_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_doc_versions" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "rendered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_doc_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensations" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "fixed_annual" DECIMAL(12,2) NOT NULL,
    "variable_annual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "joining_bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retention_bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "esop_units" INTEGER DEFAULT 0,
    "esop_vesting" JSONB,
    "breakup" JSONB NOT NULL DEFAULT '{}',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esign_requests" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "provider" "ESignProvider" NOT NULL DEFAULT 'DIGIO',
    "provider_req_id" TEXT NOT NULL,
    "signer_email" TEXT NOT NULL,
    "signer_phone" TEXT,
    "status" "ESignStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "audit_trail_url" TEXT,
    "webhook_events" JSONB NOT NULL DEFAULT '[]',
    "last_polled_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esign_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "joining_checklists" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "joining_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_joinings" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL,
    "status" "JoiningStatus" NOT NULL DEFAULT 'PENDING',
    "submissions" JSONB NOT NULL DEFAULT '{}',
    "buddy_user_id" UUID,
    "reporting_mgr_id" UUID,
    "candidate_token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_joinings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bgv_profiles" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "offer_id" UUID,
    "status" "BgvProfileStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "vendor" "BgvVendor" NOT NULL DEFAULT 'AUTHBRIDGE',
    "vendor_ref_id" TEXT,
    "consented_at" TIMESTAMP(3),
    "consent_ip_hash" TEXT,
    "consent_doc_url" TEXT,
    "consent_token" TEXT NOT NULL,
    "consent_otp" TEXT,
    "consent_otp_exp" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "final_report_url" TEXT,
    "risk_score" "BgvRiskScore",
    "ai_summary" JSONB,
    "retention_days" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bgv_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bgv_checks" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "type" "BgvCheckType" NOT NULL,
    "status" "BgvCheckStatus" NOT NULL DEFAULT 'QUEUED',
    "vendor_ref_id" TEXT,
    "request" JSONB NOT NULL DEFAULT '{}',
    "response" JSONB,
    "finding" "BgvFinding" NOT NULL DEFAULT 'PENDING',
    "report_url" TEXT,
    "cost_in_paise" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bgv_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_cycles" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CycleType" NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "goal_setting_deadline" TIMESTAMP(3) NOT NULL,
    "self_assessment_deadline" TIMESTAMP(3) NOT NULL,
    "manager_review_deadline" TIMESTAMP(3) NOT NULL,
    "calibration_deadline" TIMESTAMP(3) NOT NULL,
    "rating_scale" JSONB NOT NULL DEFAULT '[]',
    "weights" JSONB NOT NULL DEFAULT '{}',
    "eligibility_rules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appraisal_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_goals" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "parent_id" UUID,
    "owner_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT,
    "target" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "aligned_to_org_goal_id" UUID,
    "type" "GoalType" NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metrics" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "self_rating" INTEGER,
    "manager_rating" INTEGER,
    "self_comment" TEXT,
    "manager_comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_assessments" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "form_data" JSONB NOT NULL DEFAULT '{}',
    "competency_ratings" JSONB NOT NULL DEFAULT '{}',
    "goals_rollup" JSONB NOT NULL DEFAULT '{}',
    "final_rating" DECIMAL(3,2),
    "rating_label" TEXT,
    "self_summary" TEXT,
    "manager_summary" TEXT,
    "ai_summary" JSONB,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "finalised_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appraisal_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_feedback_requests" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "subject_user_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "relationship" "PeerRelationship" NOT NULL,
    "status" "FeedbackRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "form_data" JSONB,
    "reviewer_token" TEXT NOT NULL,
    "declined_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peer_feedback_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_sessions" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "group_name" TEXT NOT NULL,
    "facilitator_id" UUID NOT NULL,
    "participant_user_ids" UUID[],
    "scope" JSONB NOT NULL DEFAULT '{}',
    "target_distribution" JSONB NOT NULL DEFAULT '{}',
    "decision_log" JSONB NOT NULL DEFAULT '[]',
    "status" "CalibrationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "locked_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calibration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_budgets" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "hike_pool_inr" DECIMAL(14,2) NOT NULL,
    "bonus_pool_inr" DECIMAL(14,2) NOT NULL,
    "splits" JSONB NOT NULL DEFAULT '[]',
    "matrix" JSONB NOT NULL DEFAULT '{}',
    "bonus_matrix" JSONB NOT NULL DEFAULT '{}',
    "market_correction" JSONB NOT NULL DEFAULT '[]',
    "retention_rules" JSONB NOT NULL DEFAULT '[]',
    "hike_cap_pct" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appraisal_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_revisions" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "current_fixed" DECIMAL(12,2) NOT NULL,
    "current_variable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "computed_hike_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "computed_hike_inr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "computed_bonus_inr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_hike_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_hike_inr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_bonus_inr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "new_fixed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "new_variable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "manager_comment" TEXT,
    "override_reason" TEXT,
    "approval_chain" JSONB NOT NULL DEFAULT '[]',
    "retention_tier" TEXT,
    "scope_key" TEXT,
    "letter_url" TEXT,
    "letter_status" "CompLetterStatus" NOT NULL DEFAULT 'PENDING',
    "letter_issued_at" TIMESTAMP(3),
    "one_on_one_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensation_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_snapshots" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compensation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "data_source" "ReportSource" NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "group_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "visualization" "ReportVisualization" NOT NULL DEFAULT 'TABLE',
    "schedule_cron" TEXT,
    "schedule_targets" JSONB NOT NULL DEFAULT '[]',
    "created_by_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_prefs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "user_id" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "template_key" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_id" TEXT,
    "cost_in_paise" INTEGER,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "event_type" "SecurityEventType" NOT NULL,
    "user_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "prev_hash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" UUID NOT NULL,
    "orgId" UUID,
    "agent_name" TEXT NOT NULL,
    "model_used" TEXT NOT NULL,
    "tokens_input" INTEGER,
    "tokens_output" INTEGER,
    "cost_in_paise" INTEGER,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_insights" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "generated_by" UUID NOT NULL,
    "insights" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL,
    "auth0_sub" TEXT,
    "email" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "phone" TEXT,
    "phone_hash" TEXT,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "current_company" TEXT,
    "current_designation" TEXT,
    "experience_years" DECIMAL(4,1),
    "skills" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "projects" JSONB NOT NULL DEFAULT '[]',
    "current_location" TEXT,
    "preferred_locations" JSONB NOT NULL DEFAULT '[]',
    "current_ctc" DECIMAL(12,2),
    "expected_ctc" DECIMAL(12,2),
    "notice_period_days" INTEGER,
    "preferred_roles" JSONB NOT NULL DEFAULT '[]',
    "preferred_industries" JSONB NOT NULL DEFAULT '[]',
    "work_model" TEXT,
    "resume_url" TEXT,
    "profile_links" JSONB NOT NULL DEFAULT '{}',
    "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo_account" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_profiles" (
    "id" UUID NOT NULL,
    "auth0_sub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "portfolio_url" TEXT,
    "avatar_url" TEXT,
    "specializations" JSONB NOT NULL DEFAULT '[]',
    "experience_years" INTEGER,
    "linkedin_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo_account" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandates" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "description" TEXT NOT NULL,
    "required_experience" TEXT,
    "education_requirement" TEXT,
    "mandatory_skills" JSONB NOT NULL DEFAULT '[]',
    "preferred_skills" JSONB NOT NULL DEFAULT '[]',
    "number_of_openings" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "work_model" TEXT,
    "employment_type" TEXT,
    "compensation_min" DECIMAL(12,2),
    "compensation_max" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "notice_period_pref" TEXT,
    "interview_process" JSONB NOT NULL DEFAULT '[]',
    "expected_timeline" TEXT,
    "hiring_manager_name" TEXT,
    "hiring_manager_title" TEXT,
    "hiring_manager_phone" TEXT,
    "team_description" TEXT,
    "application_deadline" TIMESTAMP(3),
    "accepts_direct_apply" BOOLEAN NOT NULL DEFAULT true,
    "accepts_referrals" BOOLEAN NOT NULL DEFAULT true,
    "participation_type" "MandateParticipationType" NOT NULL DEFAULT 'OPEN',
    "referral_reward_amount" DECIMAL(12,2),
    "referral_reward_type" TEXT,
    "ownership_period_days" INTEGER NOT NULL DEFAULT 180,
    "status" "MandateStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "filled_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandate_participations" (
    "id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mandate_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING_CONSENT',
    "recruiter_note" TEXT,
    "consent_token" TEXT NOT NULL,
    "consent_requested_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "ai_summary" TEXT,
    "ai_match_score" DECIMAL(5,2),
    "ai_match_summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "last_checked_at" TIMESTAMP(3),
    "status_check_count" INTEGER NOT NULL DEFAULT 0,
    "candidate_reported_hire" BOOLEAN NOT NULL DEFAULT false,
    "bypass_risk_score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_consents" (
    "id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consent_token" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_scopes" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "referral_id" UUID,
    "source_type" "SourceType" NOT NULL,
    "owned_by_recruiter_id" UUID,
    "status" "OwnershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownership_starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownership_expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_tracking" (
    "id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "reward_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "RewardStatus" NOT NULL DEFAULT 'POTENTIAL',
    "hired_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "eligible_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payment_ref" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_jobs" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_status_checks" (
    "id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "check_type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" "StatusCheckResponse",
    "response_details" TEXT,
    "responded_at" TIMESTAMP(3),
    "check_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_status_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_trust_scores" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "response_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "hire_report_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_response_days" INTEGER NOT NULL DEFAULT 0,
    "total_referrals" INTEGER NOT NULL DEFAULT 0,
    "reported_hires" INTEGER NOT NULL DEFAULT 0,
    "dispute_count" INTEGER NOT NULL DEFAULT 0,
    "trust_level" "TrustLevel" NOT NULL DEFAULT 'STANDARD',
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_trust_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hire_bypass_flags" (
    "id" UUID NOT NULL,
    "referral_id" UUID,
    "mandate_id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "risk_level" "BypassRiskLevel" NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "signals" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hire_bypass_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_assessments" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "HiringAssessmentType" NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 100,
    "passing_percentage" INTEGER NOT NULL DEFAULT 60,
    "shuffle_questions" BOOLEAN NOT NULL DEFAULT false,
    "shuffle_options" BOOLEAN NOT NULL DEFAULT false,
    "show_results" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "mandate_id" UUID,
    "pipeline_stage_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hiring_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "type" "QuestionType" NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coding_challenges" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "constraints" TEXT,
    "sample_test_cases" JSONB NOT NULL DEFAULT '[]',
    "hidden_test_cases" JSONB NOT NULL DEFAULT '[]',
    "supported_languages" JSONB NOT NULL DEFAULT '["python","javascript","java","cpp"]',
    "starter_code" JSONB NOT NULL DEFAULT '{}',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "time_limit_seconds" INTEGER NOT NULL DEFAULT 5,
    "memory_limit_kb" INTEGER NOT NULL DEFAULT 262144,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "candidate_id" UUID,
    "application_id" UUID,
    "access_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "tab_switch_count" INTEGER NOT NULL DEFAULT 0,
    "fullscreen_exits" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_options" JSONB,
    "text_answer" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "time_taken_ms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_submissions" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "source_code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "language_id" INTEGER NOT NULL,
    "status" "CodeSubmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "test_cases_passed" INTEGER NOT NULL DEFAULT 0,
    "total_test_cases" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "execution_time_ms" DECIMAL(10,2),
    "memory_used_kb" INTEGER,
    "stdout" TEXT,
    "stderr" TEXT,
    "compile_output" TEXT,
    "test_case_results" JSONB,
    "is_final_submit" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_interviews" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "room_name" TEXT NOT NULL,
    "candidate_id" UUID,
    "application_id" UUID,
    "interviewer_id" UUID NOT NULL,
    "pipeline_stage_id" UUID,
    "mandate_id" UUID,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "status" "VideoInterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "technical_score" INTEGER,
    "communication_score" INTEGER,
    "culture_fit_score" INTEGER,
    "leadership_score" INTEGER,
    "overall_rating" INTEGER,
    "recommendation" TEXT,
    "notes" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "candidate_access_token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_jobs" (
    "id" UUID NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_company_slug" TEXT,
    "source_url" TEXT,
    "title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_logo_url" TEXT,
    "location" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "is_remote" BOOLEAN NOT NULL DEFAULT false,
    "workplace_type" TEXT,
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "salary_currency" TEXT DEFAULT 'INR',
    "salary_period" TEXT,
    "salary_raw" TEXT,
    "description_html" TEXT,
    "description_plain" TEXT,
    "description_snippet" TEXT,
    "employment_type" TEXT,
    "department" TEXT,
    "team" TEXT,
    "extracted_skills" JSONB DEFAULT '[]',
    "tags" JSONB DEFAULT '[]',
    "experience_level" TEXT,
    "required_experience" TEXT,
    "apply_url" TEXT NOT NULL,
    "apply_type" TEXT NOT NULL DEFAULT 'redirect',
    "content_hash" TEXT,
    "url_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "posted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_saved_jobs" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "external_job_id" UUID NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_job_clicks" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "external_job_id" UUID NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "self_reported_applied" BOOLEAN NOT NULL DEFAULT false,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "external_job_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_job_matches" (
    "id" UUID NOT NULL,
    "candidate_profile_id" UUID NOT NULL,
    "external_job_id" UUID NOT NULL,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "skills_score" INTEGER NOT NULL DEFAULT 0,
    "experience_score" INTEGER NOT NULL DEFAULT 0,
    "role_fit_score" INTEGER NOT NULL DEFAULT 0,
    "preferences_score" INTEGER NOT NULL DEFAULT 0,
    "matched_skills" JSONB DEFAULT '[]',
    "missing_skills" JSONB DEFAULT '[]',
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_job_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_source_configs" (
    "id" UUID NOT NULL,
    "source_name" TEXT NOT NULL,
    "company_slug" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_status" TEXT,
    "last_sync_count" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_source_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_ranking_sessions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "status" "RankingStatus" NOT NULL DEFAULT 'PROCESSING',
    "candidate_count" INTEGER NOT NULL,
    "custom_weights" JSONB,
    "pool_summary" TEXT,
    "ai_model" TEXT,
    "processing_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "resume_ranking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_ranking_results" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "candidate_id" UUID,
    "referral_id" UUID,
    "candidate_name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "total_score" DECIMAL(5,2) NOT NULL,
    "verdict" TEXT NOT NULL,
    "score_breakdown" JSONB NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "standout_factors" JSONB NOT NULL DEFAULT '[]',
    "comparison_note" TEXT,
    "recommendation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_ranking_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0_sub_key" ON "users"("auth0_sub");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_auth0_sub_idx" ON "users"("auth0_sub");

-- CreateIndex
CREATE INDEX "users_orgId_is_active_idx" ON "users"("orgId", "is_active");

-- CreateIndex
CREATE INDEX "hiring_plans_orgId_idx" ON "hiring_plans"("orgId");

-- CreateIndex
CREATE INDEX "hiring_plans_status_idx" ON "hiring_plans"("status");

-- CreateIndex
CREATE INDEX "hiring_plans_hiring_manager_id_idx" ON "hiring_plans"("hiring_manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_plan_skills_hiring_plan_id_skill_id_key" ON "hiring_plan_skills"("hiring_plan_id", "skill_id");

-- CreateIndex
CREATE INDEX "job_descriptions_hiring_plan_id_idx" ON "job_descriptions"("hiring_plan_id");

-- CreateIndex
CREATE INDEX "job_descriptions_status_idx" ON "job_descriptions"("status");

-- CreateIndex
CREATE INDEX "pipeline_stages_hiring_plan_id_idx" ON "pipeline_stages"("hiring_plan_id");

-- CreateIndex
CREATE INDEX "pipeline_stages_mandate_id_idx" ON "pipeline_stages"("mandate_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stage_interviewers_stage_id_user_id_key" ON "pipeline_stage_interviewers"("stage_id", "user_id");

-- CreateIndex
CREATE INDEX "candidates_orgId_idx" ON "candidates"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_orgId_email_key" ON "candidates"("orgId", "email");

-- CreateIndex
CREATE INDEX "candidate_applications_hiring_plan_id_idx" ON "candidate_applications"("hiring_plan_id");

-- CreateIndex
CREATE INDEX "candidate_applications_current_stage_id_idx" ON "candidate_applications"("current_stage_id");

-- CreateIndex
CREATE INDEX "candidate_applications_mandate_id_idx" ON "candidate_applications"("mandate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_applications_candidate_id_hiring_plan_id_key" ON "candidate_applications"("candidate_id", "hiring_plan_id");

-- CreateIndex
CREATE INDEX "candidate_stage_history_application_id_idx" ON "candidate_stage_history"("application_id");

-- CreateIndex
CREATE INDEX "interview_feedbacks_application_id_idx" ON "interview_feedbacks"("application_id");

-- CreateIndex
CREATE INDEX "interview_feedbacks_interviewer_id_idx" ON "interview_feedbacks"("interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_feedbacks_application_id_stage_id_interviewer_id_key" ON "interview_feedbacks"("application_id", "stage_id", "interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_skill_ratings_feedback_id_skill_id_key" ON "feedback_skill_ratings"("feedback_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "selection_decisions_application_id_key" ON "selection_decisions"("application_id");

-- CreateIndex
CREATE INDEX "selection_decisions_application_id_idx" ON "selection_decisions"("application_id");

-- CreateIndex
CREATE INDEX "training_modules_orgId_idx" ON "training_modules"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "training_completions_user_id_module_id_key" ON "training_completions"("user_id", "module_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_orgId_idx" ON "notifications"("orgId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_idx" ON "audit_logs"("orgId");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "org_settings_orgId_key" ON "org_settings"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "job_publishings_public_slug_key" ON "job_publishings"("public_slug");

-- CreateIndex
CREATE INDEX "job_publishings_hiring_plan_id_idx" ON "job_publishings"("hiring_plan_id");

-- CreateIndex
CREATE INDEX "job_publishings_public_slug_idx" ON "job_publishings"("public_slug");

-- CreateIndex
CREATE INDEX "org_health_metrics_orgId_idx" ON "org_health_metrics"("orgId");

-- CreateIndex
CREATE INDEX "org_health_metrics_metric_date_idx" ON "org_health_metrics"("metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "org_health_metrics_orgId_metric_date_key" ON "org_health_metrics"("orgId", "metric_date");

-- CreateIndex
CREATE INDEX "support_tickets_orgId_idx" ON "support_tickets"("orgId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_assignee_id_idx" ON "support_tickets"("assignee_id");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_tickets_sla_deadline_idx" ON "support_tickets"("sla_deadline");

-- CreateIndex
CREATE INDEX "support_notes_ticket_id_idx" ON "support_notes"("ticket_id");

-- CreateIndex
CREATE INDEX "support_escalations_ticket_id_idx" ON "support_escalations"("ticket_id");

-- CreateIndex
CREATE INDEX "support_sessions_support_user_id_idx" ON "support_sessions"("support_user_id");

-- CreateIndex
CREATE INDEX "support_sessions_target_org_id_idx" ON "support_sessions"("target_org_id");

-- CreateIndex
CREATE INDEX "support_sessions_started_at_idx" ON "support_sessions"("started_at");

-- CreateIndex
CREATE INDEX "offer_templates_orgId_is_active_idx" ON "offer_templates"("orgId", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "offers_application_id_key" ON "offers"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_compensation_id_key" ON "offers"("compensation_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_candidate_token_key" ON "offers"("candidate_token");

-- CreateIndex
CREATE INDEX "offers_orgId_status_idx" ON "offers"("orgId", "status");

-- CreateIndex
CREATE INDEX "offer_doc_versions_offer_id_idx" ON "offer_doc_versions"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_doc_versions_offer_id_version_key" ON "offer_doc_versions"("offer_id", "version");

-- CreateIndex
CREATE INDEX "compensations_orgId_idx" ON "compensations"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "esign_requests_offer_id_key" ON "esign_requests"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "esign_requests_provider_req_id_key" ON "esign_requests"("provider_req_id");

-- CreateIndex
CREATE INDEX "esign_requests_status_idx" ON "esign_requests"("status");

-- CreateIndex
CREATE INDEX "joining_checklists_orgId_is_default_idx" ON "joining_checklists"("orgId", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_joinings_offer_id_key" ON "candidate_joinings"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_joinings_candidate_token_key" ON "candidate_joinings"("candidate_token");

-- CreateIndex
CREATE INDEX "candidate_joinings_status_idx" ON "candidate_joinings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bgv_profiles_offer_id_key" ON "bgv_profiles"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "bgv_profiles_consent_token_key" ON "bgv_profiles"("consent_token");

-- CreateIndex
CREATE INDEX "bgv_profiles_orgId_status_idx" ON "bgv_profiles"("orgId", "status");

-- CreateIndex
CREATE INDEX "bgv_profiles_candidate_id_idx" ON "bgv_profiles"("candidate_id");

-- CreateIndex
CREATE INDEX "bgv_checks_profile_id_status_idx" ON "bgv_checks"("profile_id", "status");

-- CreateIndex
CREATE INDEX "bgv_checks_type_idx" ON "bgv_checks"("type");

-- CreateIndex
CREATE INDEX "appraisal_cycles_orgId_status_idx" ON "appraisal_cycles"("orgId", "status");

-- CreateIndex
CREATE INDEX "org_goals_orgId_cycle_id_idx" ON "org_goals"("orgId", "cycle_id");

-- CreateIndex
CREATE INDEX "goals_cycle_id_employee_id_idx" ON "goals"("cycle_id", "employee_id");

-- CreateIndex
CREATE INDEX "goals_manager_id_idx" ON "goals"("manager_id");

-- CreateIndex
CREATE INDEX "appraisal_assessments_cycle_id_status_idx" ON "appraisal_assessments"("cycle_id", "status");

-- CreateIndex
CREATE INDEX "appraisal_assessments_manager_id_idx" ON "appraisal_assessments"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "appraisal_assessments_cycle_id_employee_id_type_key" ON "appraisal_assessments"("cycle_id", "employee_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedback_requests_reviewer_token_key" ON "peer_feedback_requests"("reviewer_token");

-- CreateIndex
CREATE INDEX "peer_feedback_requests_cycle_id_status_idx" ON "peer_feedback_requests"("cycle_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedback_requests_cycle_id_subject_user_id_reviewer_us_key" ON "peer_feedback_requests"("cycle_id", "subject_user_id", "reviewer_user_id");

-- CreateIndex
CREATE INDEX "calibration_sessions_cycle_id_status_idx" ON "calibration_sessions"("cycle_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "appraisal_budgets_cycle_id_key" ON "appraisal_budgets"("cycle_id");

-- CreateIndex
CREATE INDEX "appraisal_budgets_orgId_status_idx" ON "appraisal_budgets"("orgId", "status");

-- CreateIndex
CREATE INDEX "compensation_revisions_orgId_status_idx" ON "compensation_revisions"("orgId", "status");

-- CreateIndex
CREATE INDEX "compensation_revisions_budget_id_idx" ON "compensation_revisions"("budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "compensation_revisions_cycle_id_employee_id_key" ON "compensation_revisions"("cycle_id", "employee_id");

-- CreateIndex
CREATE INDEX "compensation_snapshots_budget_id_idx" ON "compensation_snapshots"("budget_id");

-- CreateIndex
CREATE INDEX "report_definitions_orgId_idx" ON "report_definitions"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_prefs_user_id_event_type_channel_key" ON "user_notification_prefs"("user_id", "event_type", "channel");

-- CreateIndex
CREATE INDEX "notification_logs_orgId_createdAt_idx" ON "notification_logs"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "security_logs_orgId_createdAt_idx" ON "security_logs"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "security_logs_hash_idx" ON "security_logs"("hash");

-- CreateIndex
CREATE INDEX "ai_call_logs_orgId_createdAt_idx" ON "ai_call_logs"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_call_logs_agent_name_idx" ON "ai_call_logs"("agent_name");

-- CreateIndex
CREATE INDEX "dashboard_insights_orgId_generated_at_idx" ON "dashboard_insights"("orgId", "generated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_auth0_sub_key" ON "candidate_profiles"("auth0_sub");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_email_key" ON "candidate_profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_email_hash_key" ON "candidate_profiles"("email_hash");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_phone_hash_key" ON "candidate_profiles"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_profiles_auth0_sub_key" ON "recruiter_profiles"("auth0_sub");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_profiles_email_key" ON "recruiter_profiles"("email");

-- CreateIndex
CREATE INDEX "recruiter_profiles_is_verified_is_active_createdAt_idx" ON "recruiter_profiles"("is_verified", "is_active", "createdAt");

-- CreateIndex
CREATE INDEX "mandates_orgId_status_idx" ON "mandates"("orgId", "status");

-- CreateIndex
CREATE INDEX "mandates_status_idx" ON "mandates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mandate_participations_mandate_id_recruiter_id_key" ON "mandate_participations"("mandate_id", "recruiter_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_consent_token_key" ON "referrals"("consent_token");

-- CreateIndex
CREATE INDEX "referrals_recruiter_id_idx" ON "referrals"("recruiter_id");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_mandate_id_candidate_profile_id_key" ON "referrals"("mandate_id", "candidate_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_consents_referral_id_key" ON "candidate_consents"("referral_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_consents_consent_token_key" ON "candidate_consents"("consent_token");

-- CreateIndex
CREATE INDEX "candidate_consents_candidate_profile_id_idx" ON "candidate_consents"("candidate_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "claim_scopes_referral_id_key" ON "claim_scopes"("referral_id");

-- CreateIndex
CREATE INDEX "claim_scopes_orgId_idx" ON "claim_scopes"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_scopes_candidate_profile_id_mandate_id_key" ON "claim_scopes"("candidate_profile_id", "mandate_id");

-- CreateIndex
CREATE UNIQUE INDEX "reward_tracking_referral_id_key" ON "reward_tracking"("referral_id");

-- CreateIndex
CREATE INDEX "reward_tracking_recruiter_id_status_idx" ON "reward_tracking"("recruiter_id", "status");

-- CreateIndex
CREATE INDEX "reward_tracking_orgId_idx" ON "reward_tracking"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_jobs_candidate_profile_id_mandate_id_key" ON "saved_jobs"("candidate_profile_id", "mandate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_status_checks_check_token_key" ON "candidate_status_checks"("check_token");

-- CreateIndex
CREATE INDEX "candidate_status_checks_referral_id_idx" ON "candidate_status_checks"("referral_id");

-- CreateIndex
CREATE INDEX "candidate_status_checks_check_token_idx" ON "candidate_status_checks"("check_token");

-- CreateIndex
CREATE UNIQUE INDEX "company_trust_scores_orgId_key" ON "company_trust_scores"("orgId");

-- CreateIndex
CREATE INDEX "hire_bypass_flags_orgId_is_resolved_idx" ON "hire_bypass_flags"("orgId", "is_resolved");

-- CreateIndex
CREATE INDEX "hire_bypass_flags_mandate_id_idx" ON "hire_bypass_flags"("mandate_id");

-- CreateIndex
CREATE INDEX "hire_bypass_flags_risk_level_is_resolved_idx" ON "hire_bypass_flags"("risk_level", "is_resolved");

-- CreateIndex
CREATE INDEX "hiring_assessments_orgId_idx" ON "hiring_assessments"("orgId");

-- CreateIndex
CREATE INDEX "hiring_assessments_mandate_id_idx" ON "hiring_assessments"("mandate_id");

-- CreateIndex
CREATE INDEX "hiring_assessments_orgId_type_idx" ON "hiring_assessments"("orgId", "type");

-- CreateIndex
CREATE INDEX "assessment_questions_assessment_id_idx" ON "assessment_questions"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_questions_orgId_category_idx" ON "assessment_questions"("orgId", "category");

-- CreateIndex
CREATE INDEX "coding_challenges_assessment_id_idx" ON "coding_challenges"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_access_token_key" ON "assessment_attempts"("access_token");

-- CreateIndex
CREATE INDEX "assessment_attempts_access_token_idx" ON "assessment_attempts"("access_token");

-- CreateIndex
CREATE INDEX "assessment_attempts_candidate_id_idx" ON "assessment_attempts"("candidate_id");

-- CreateIndex
CREATE INDEX "assessment_attempts_application_id_idx" ON "assessment_attempts"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_assessment_id_candidate_id_key" ON "assessment_attempts"("assessment_id", "candidate_id");

-- CreateIndex
CREATE INDEX "assessment_responses_attempt_id_idx" ON "assessment_responses"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_responses_attempt_id_question_id_key" ON "assessment_responses"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "code_submissions_attempt_id_idx" ON "code_submissions"("attempt_id");

-- CreateIndex
CREATE INDEX "code_submissions_challenge_id_idx" ON "code_submissions"("challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_interviews_room_name_key" ON "video_interviews"("room_name");

-- CreateIndex
CREATE UNIQUE INDEX "video_interviews_candidate_access_token_key" ON "video_interviews"("candidate_access_token");

-- CreateIndex
CREATE INDEX "video_interviews_orgId_idx" ON "video_interviews"("orgId");

-- CreateIndex
CREATE INDEX "video_interviews_candidate_id_idx" ON "video_interviews"("candidate_id");

-- CreateIndex
CREATE INDEX "video_interviews_scheduled_at_idx" ON "video_interviews"("scheduled_at");

-- CreateIndex
CREATE INDEX "video_interviews_mandate_id_idx" ON "video_interviews"("mandate_id");

-- CreateIndex
CREATE INDEX "external_jobs_is_active_posted_at_idx" ON "external_jobs"("is_active", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "external_jobs_content_hash_idx" ON "external_jobs"("content_hash");

-- CreateIndex
CREATE INDEX "external_jobs_url_hash_idx" ON "external_jobs"("url_hash");

-- CreateIndex
CREATE INDEX "external_jobs_company_name_idx" ON "external_jobs"("company_name");

-- CreateIndex
CREATE INDEX "external_jobs_country_city_idx" ON "external_jobs"("country", "city");

-- CreateIndex
CREATE INDEX "external_jobs_workplace_type_idx" ON "external_jobs"("workplace_type");

-- CreateIndex
CREATE INDEX "external_jobs_is_active_source_name_idx" ON "external_jobs"("is_active", "source_name");

-- CreateIndex
CREATE UNIQUE INDEX "external_jobs_source_unique" ON "external_jobs"("source_name", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_saved_jobs_candidate_profile_id_external_job_id_key" ON "external_saved_jobs"("candidate_profile_id", "external_job_id");

-- CreateIndex
CREATE INDEX "external_job_clicks_candidate_profile_id_idx" ON "external_job_clicks"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "external_job_clicks_external_job_id_idx" ON "external_job_clicks"("external_job_id");

-- CreateIndex
CREATE INDEX "external_job_matches_candidate_profile_id_total_score_idx" ON "external_job_matches"("candidate_profile_id", "total_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "external_job_matches_candidate_profile_id_external_job_id_key" ON "external_job_matches"("candidate_profile_id", "external_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_source_config_unique" ON "job_source_configs"("source_name", "company_slug");

-- CreateIndex
CREATE INDEX "resume_ranking_sessions_org_id_mandate_id_idx" ON "resume_ranking_sessions"("org_id", "mandate_id");

-- CreateIndex
CREATE INDEX "resume_ranking_sessions_created_at_idx" ON "resume_ranking_sessions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "resume_ranking_results_session_id_rank_idx" ON "resume_ranking_results"("session_id", "rank");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_plans" ADD CONSTRAINT "hiring_plans_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_plans" ADD CONSTRAINT "hiring_plans_hiring_manager_id_fkey" FOREIGN KEY ("hiring_manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_plans" ADD CONSTRAINT "hiring_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_plan_skills" ADD CONSTRAINT "hiring_plan_skills_hiring_plan_id_fkey" FOREIGN KEY ("hiring_plan_id") REFERENCES "hiring_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_plan_skills" ADD CONSTRAINT "hiring_plan_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_hiring_plan_id_fkey" FOREIGN KEY ("hiring_plan_id") REFERENCES "hiring_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_hiring_plan_id_fkey" FOREIGN KEY ("hiring_plan_id") REFERENCES "hiring_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stage_interviewers" ADD CONSTRAINT "pipeline_stage_interviewers_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stage_interviewers" ADD CONSTRAINT "pipeline_stage_interviewers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_hiring_plan_id_fkey" FOREIGN KEY ("hiring_plan_id") REFERENCES "hiring_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedbacks" ADD CONSTRAINT "interview_feedbacks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedbacks" ADD CONSTRAINT "interview_feedbacks_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedbacks" ADD CONSTRAINT "interview_feedbacks_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_skill_ratings" ADD CONSTRAINT "feedback_skill_ratings_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "interview_feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_skill_ratings" ADD CONSTRAINT "feedback_skill_ratings_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selection_decisions" ADD CONSTRAINT "selection_decisions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selection_decisions" ADD CONSTRAINT "selection_decisions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selection_decisions" ADD CONSTRAINT "selection_decisions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_modules" ADD CONSTRAINT "training_modules_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "training_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_publishings" ADD CONSTRAINT "job_publishings_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_publishings" ADD CONSTRAINT "job_publishings_hiring_plan_id_fkey" FOREIGN KEY ("hiring_plan_id") REFERENCES "hiring_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_publishings" ADD CONSTRAINT "job_publishings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_health_metrics" ADD CONSTRAINT "org_health_metrics_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_notes" ADD CONSTRAINT "support_notes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_notes" ADD CONSTRAINT "support_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_escalations" ADD CONSTRAINT "support_escalations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_escalations" ADD CONSTRAINT "support_escalations_escalated_by_id_fkey" FOREIGN KEY ("escalated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_support_user_id_fkey" FOREIGN KEY ("support_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_target_org_id_fkey" FOREIGN KEY ("target_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_templates" ADD CONSTRAINT "offer_templates_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_templates" ADD CONSTRAINT "offer_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "offer_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_compensation_id_fkey" FOREIGN KEY ("compensation_id") REFERENCES "compensations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_doc_versions" ADD CONSTRAINT "offer_doc_versions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esign_requests" ADD CONSTRAINT "esign_requests_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joining_checklists" ADD CONSTRAINT "joining_checklists_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_joinings" ADD CONSTRAINT "candidate_joinings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_joinings" ADD CONSTRAINT "candidate_joinings_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "joining_checklists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_joinings" ADD CONSTRAINT "candidate_joinings_buddy_user_id_fkey" FOREIGN KEY ("buddy_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_joinings" ADD CONSTRAINT "candidate_joinings_reporting_mgr_id_fkey" FOREIGN KEY ("reporting_mgr_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_profiles" ADD CONSTRAINT "bgv_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_profiles" ADD CONSTRAINT "bgv_profiles_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_profiles" ADD CONSTRAINT "bgv_profiles_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_checks" ADD CONSTRAINT "bgv_checks_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "bgv_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_goals" ADD CONSTRAINT "org_goals_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_goals" ADD CONSTRAINT "org_goals_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "appraisal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_goals" ADD CONSTRAINT "org_goals_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_goals" ADD CONSTRAINT "org_goals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "appraisal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_aligned_to_org_goal_id_fkey" FOREIGN KEY ("aligned_to_org_goal_id") REFERENCES "org_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_assessments" ADD CONSTRAINT "appraisal_assessments_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "appraisal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_assessments" ADD CONSTRAINT "appraisal_assessments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_assessments" ADD CONSTRAINT "appraisal_assessments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_feedback_requests" ADD CONSTRAINT "peer_feedback_requests_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "appraisal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_feedback_requests" ADD CONSTRAINT "peer_feedback_requests_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_feedback_requests" ADD CONSTRAINT "peer_feedback_requests_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_feedback_requests" ADD CONSTRAINT "peer_feedback_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "appraisal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_budgets" ADD CONSTRAINT "appraisal_budgets_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_budgets" ADD CONSTRAINT "appraisal_budgets_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_revisions" ADD CONSTRAINT "compensation_revisions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_revisions" ADD CONSTRAINT "compensation_revisions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "appraisal_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_revisions" ADD CONSTRAINT "compensation_revisions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_snapshots" ADD CONSTRAINT "compensation_snapshots_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "appraisal_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_prefs" ADD CONSTRAINT "user_notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_insights" ADD CONSTRAINT "dashboard_insights_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_insights" ADD CONSTRAINT "dashboard_insights_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandate_participations" ADD CONSTRAINT "mandate_participations_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandate_participations" ADD CONSTRAINT "mandate_participations_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_consents" ADD CONSTRAINT "candidate_consents_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_consents" ADD CONSTRAINT "candidate_consents_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_scopes" ADD CONSTRAINT "claim_scopes_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_tracking" ADD CONSTRAINT "reward_tracking_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_tracking" ADD CONSTRAINT "reward_tracking_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiter_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_status_checks" ADD CONSTRAINT "candidate_status_checks_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_status_checks" ADD CONSTRAINT "candidate_status_checks_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_trust_scores" ADD CONSTRAINT "company_trust_scores_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hire_bypass_flags" ADD CONSTRAINT "hire_bypass_flags_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_assessments" ADD CONSTRAINT "hiring_assessments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_assessments" ADD CONSTRAINT "hiring_assessments_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_assessments" ADD CONSTRAINT "hiring_assessments_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "hiring_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coding_challenges" ADD CONSTRAINT "coding_challenges_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "hiring_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "hiring_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_submissions" ADD CONSTRAINT "code_submissions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_submissions" ADD CONSTRAINT "code_submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "coding_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "candidate_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_interviews" ADD CONSTRAINT "video_interviews_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_saved_jobs" ADD CONSTRAINT "external_saved_jobs_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_saved_jobs" ADD CONSTRAINT "external_saved_jobs_external_job_id_fkey" FOREIGN KEY ("external_job_id") REFERENCES "external_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_job_clicks" ADD CONSTRAINT "external_job_clicks_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_job_clicks" ADD CONSTRAINT "external_job_clicks_external_job_id_fkey" FOREIGN KEY ("external_job_id") REFERENCES "external_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_job_matches" ADD CONSTRAINT "external_job_matches_candidate_profile_id_fkey" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_job_matches" ADD CONSTRAINT "external_job_matches_external_job_id_fkey" FOREIGN KEY ("external_job_id") REFERENCES "external_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_ranking_sessions" ADD CONSTRAINT "resume_ranking_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_ranking_sessions" ADD CONSTRAINT "resume_ranking_sessions_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_ranking_sessions" ADD CONSTRAINT "resume_ranking_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_ranking_results" ADD CONSTRAINT "resume_ranking_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "resume_ranking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

