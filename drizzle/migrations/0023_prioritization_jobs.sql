-- Enum additions
DO $$ BEGIN
  CREATE TYPE "prioritization_job_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "score_provenance" AS ENUM ('auto', 'ai', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add provenance column
ALTER TABLE "story_prioritization_scores"
  ADD COLUMN IF NOT EXISTS "provenance" score_provenance DEFAULT 'auto';

-- Create jobs table
CREATE TABLE IF NOT EXISTS "prioritization_jobs" (
  "id" varchar(36) PRIMARY KEY,
  "project_id" varchar(36) NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "framework" prioritization_framework NOT NULL,
  "status" prioritization_job_status NOT NULL DEFAULT 'pending',
  "report_id" varchar(36),
  "error" text,
  "generated_by" varchar(36) NOT NULL REFERENCES "users"("id"),
  "request_payload" json,
  "created_at" timestamp DEFAULT now(),
  "started_at" timestamp,
  "completed_at" timestamp,
  "duration_ms" integer
);

CREATE INDEX IF NOT EXISTS "idx_prioritization_jobs_project" ON "prioritization_jobs" ("project_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_prioritization_jobs_status" ON "prioritization_jobs" ("status");
