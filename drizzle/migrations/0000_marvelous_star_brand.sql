DO $$ BEGIN
 CREATE TYPE "public"."ai_generation_type" AS ENUM('story_generation', 'story_validation', 'epic_creation', 'requirements_analysis');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."epic_status" AS ENUM('draft', 'planned', 'in_progress', 'completed', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."generation_status" AS ENUM('pending', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."processing_status" AS ENUM('uploaded', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'on_hold', 'completed', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('admin', 'member', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sprint_status" AS ENUM('planning', 'active', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."story_status" AS ENUM('backlog', 'ready', 'in_progress', 'review', 'done', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."story_type" AS ENUM('feature', 'bug', 'task', 'spike');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'pro', 'enterprise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transaction_type" AS ENUM('purchase', 'usage', 'refund', 'bonus');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"project_id" varchar(36),
	"user_id" varchar(36) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(36) NOT NULL,
	"old_values" json,
	"new_values" json,
	"metadata" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" "ai_generation_type" NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt_text" text NOT NULL,
	"response_text" text,
	"tokens_used" integer,
	"cost_usd" numeric(10, 4),
	"processing_time_ms" integer,
	"status" "generation_status" DEFAULT 'pending',
	"error_message" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"description" varchar(255) NOT NULL,
	"ai_generation_id" varchar(36),
	"stripe_transaction_id" varchar(255),
	"balance_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"uploaded_by" varchar(36) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"storage_path" varchar(500) NOT NULL,
	"processing_status" "processing_status" DEFAULT 'uploaded',
	"extracted_text" text,
	"ai_analysis" json,
	"generated_stories_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "epics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"goals" text,
	"color" varchar(7) DEFAULT '#a855f7',
	"status" "epic_status" DEFAULT 'draft',
	"priority" "priority" DEFAULT 'medium',
	"ai_generated" boolean DEFAULT false,
	"ai_generation_prompt" text,
	"created_by" varchar(36) NOT NULL,
	"assigned_to" varchar(36),
	"start_date" date,
	"target_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"settings" json,
	"subscription_tier" "subscription_tier" DEFAULT 'free',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"key" varchar(10) NOT NULL,
	"description" text,
	"slug" varchar(100) NOT NULL,
	"status" "project_status" DEFAULT 'planning',
	"owner_id" varchar(36) NOT NULL,
	"settings" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprint_metrics" (
	"sprint_id" varchar(36) PRIMARY KEY NOT NULL,
	"total_stories" integer DEFAULT 0,
	"completed_stories" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"completed_points" integer DEFAULT 0,
	"completion_percentage" numeric(5, 2) DEFAULT '0',
	"velocity" numeric(8, 2) DEFAULT '0',
	"last_calculated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprint_stories" (
	"sprint_id" varchar(36) NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"added_at" timestamp DEFAULT now(),
	"added_by" varchar(36),
	CONSTRAINT "sprint_stories_sprint_id_story_id_pk" PRIMARY KEY("sprint_id","story_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprints" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"goal" text,
	"status" "sprint_status" DEFAULT 'planning',
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"capacity_points" integer,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"epic_id" varchar(36),
	"project_id" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"acceptance_criteria" json,
	"story_points" smallint,
	"priority" "priority" DEFAULT 'medium',
	"status" "story_status" DEFAULT 'backlog',
	"tags" json,
	"ai_generated" boolean DEFAULT false,
	"ai_prompt" text,
	"ai_model_used" varchar(100),
	"created_by" varchar(36) NOT NULL,
	"assignee_id" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"project_id" varchar(36),
	"session_token" varchar(255) NOT NULL,
	"last_activity" timestamp DEFAULT now(),
	"metadata" json,
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password" varchar(255),
	"avatar" text,
	"organization_id" varchar(36) NOT NULL,
	"role" "role" DEFAULT 'member',
	"is_active" boolean DEFAULT true,
	"preferences" json,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activities_org" ON "activities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activities_project" ON "activities" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activities_user" ON "activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activities_resource" ON "activities" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activities_created" ON "activities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_org" ON "ai_generations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_user" ON "ai_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_type" ON "ai_generations" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_created" ON "ai_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_cost_tracking" ON "ai_generations" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_org" ON "credit_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_user" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_type" ON "credit_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credits_created" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_docs_org" ON "documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_docs_user" ON "documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_docs_status" ON "documents" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_epics_project" ON "epics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_epics_org" ON "epics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_epics_status" ON "epics" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_epics_assignee" ON "epics" USING btree ("assigned_to");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_org_slug" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_org_tier" ON "organizations" USING btree ("subscription_tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_projects_org" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_project_slug" ON "projects" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metrics_calculated" ON "sprint_metrics" USING btree ("last_calculated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sprint_stories_story" ON "sprint_stories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sprints_project" ON "sprints" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sprints_status" ON "sprints" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sprints_dates" ON "sprints" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_epic" ON "stories" USING btree ("epic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_project" ON "stories" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_status" ON "stories" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_assignee" ON "stories" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_priority" ON "stories" USING btree ("project_id","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_org" ON "user_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sessions_token" ON "user_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_activity" ON "user_sessions" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_org" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" USING btree ("organization_id","role");