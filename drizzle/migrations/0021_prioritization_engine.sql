-- Prioritization Engine schema
DO $$ BEGIN
  CREATE TYPE "prioritization_framework" AS ENUM ('WSJF', 'RICE', 'MoSCoW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "moscow_category" AS ENUM ('Must', 'Should', 'Could', 'Wont');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "strategic_goals" (
  "id" varchar(36) PRIMARY KEY,
  "project_id" varchar(36) NOT NULL,
  "goal_name" varchar(255) NOT NULL,
  "description" text,
  "quarter" varchar(10),
  "related_story_tags" json,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_goal_per_quarter" ON "strategic_goals" ("project_id","goal_name","quarter");
CREATE INDEX IF NOT EXISTS "idx_goals_project_quarter" ON "strategic_goals" ("project_id","quarter");

CREATE TABLE IF NOT EXISTS "story_prioritization_scores" (
  "id" varchar(36) PRIMARY KEY,
  "story_id" varchar(36) NOT NULL,
  "project_id" varchar(36) NOT NULL,
  "framework" prioritization_framework NOT NULL,
  "business_value" integer,
  "time_criticality" integer,
  "risk_reduction" integer,
  "job_size" integer,
  "wsjf_score" numeric(10,2),
  "reach" integer,
  "impact" numeric(10,2),
  "confidence" numeric(3,2),
  "effort" integer,
  "rice_score" numeric(10,2),
  "moscow_category" moscow_category,
  "calculated_at" timestamp DEFAULT now(),
  "calculated_by" varchar(36),
  "is_manual_override" boolean DEFAULT false,
  "reasoning" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_story_framework" ON "story_prioritization_scores" ("story_id","framework");
CREATE INDEX IF NOT EXISTS "idx_scores_project_framework" ON "story_prioritization_scores" ("project_id","framework");
CREATE INDEX IF NOT EXISTS "idx_scores_wsjf" ON "story_prioritization_scores" ("wsjf_score");
CREATE INDEX IF NOT EXISTS "idx_scores_rice" ON "story_prioritization_scores" ("rice_score");

CREATE TABLE IF NOT EXISTS "backlog_analysis_reports" (
  "id" varchar(36) PRIMARY KEY,
  "project_id" varchar(36) NOT NULL,
  "framework_used" prioritization_framework NOT NULL,
  "generated_at" timestamp DEFAULT now(),
  "generated_by" varchar(36) NOT NULL,
  "strategic_focus" text,
  "market_segment" text,
  "competitive_pressure" varchar(50),
  "budget_constraint" numeric(12,2),
  "strategic_alignment" json,
  "priority_conflicts" json,
  "capacity_analysis" json,
  "confidence_levels" json,
  "executive_summary" text,
  "ranked_stories" json
);

CREATE INDEX IF NOT EXISTS "idx_reports_project_generated_at" ON "backlog_analysis_reports" ("project_id","generated_at");
