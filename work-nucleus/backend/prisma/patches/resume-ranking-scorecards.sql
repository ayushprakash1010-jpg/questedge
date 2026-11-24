BEGIN;

-- CreateTable
CREATE TABLE "resume_ranking_scorecards" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "mandate_id" UUID,
    "fingerprint" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_ranking_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_ranking_runs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" "RankingStatus" NOT NULL DEFAULT 'PROCESSING',
    "result" JSONB,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_ranking_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_ranking_scorecards_org_id_fingerprint_key" ON "resume_ranking_scorecards"("org_id", "fingerprint");

-- CreateIndex
CREATE INDEX "quick_ranking_runs_expires_at_idx" ON "quick_ranking_runs"("expires_at");

-- AddForeignKey
ALTER TABLE "resume_ranking_scorecards" ADD CONSTRAINT "resume_ranking_scorecards_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_ranking_scorecards" ADD CONSTRAINT "resume_ranking_scorecards_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "mandates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_ranking_runs" ADD CONSTRAINT "quick_ranking_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_ranking_runs" ADD CONSTRAINT "quick_ranking_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
