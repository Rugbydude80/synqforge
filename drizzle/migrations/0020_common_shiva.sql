CREATE TABLE "budget_reallocation_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"from_department" varchar(100) NOT NULL,
	"to_department" varchar(100) NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"approved_by" varchar(36) NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_document_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"description" text,
	"file_name" varchar(255) NOT NULL,
	"file_type" "file_type" NOT NULL,
	"file_size" integer NOT NULL,
	"file_bytes" "bytea" NOT NULL,
	"extracted_content" text,
	"template_format" json,
	"usage_count" integer DEFAULT 0,
	"created_by" varchar(36) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "department_budgets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"department_name" varchar(100) NOT NULL,
	"actions_limit" integer DEFAULT 0 NOT NULL,
	"actions_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"role" "role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "story_links" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"story_id" varchar(255) NOT NULL,
	"related_story_id" varchar(255) NOT NULL,
	"relation" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "story_refinements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"refinement_instructions" text NOT NULL,
	"original_content" text NOT NULL,
	"refined_content" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"changes_summary" json,
	"processing_time_ms" integer,
	"error_message" text,
	"ai_model_used" varchar(100),
	"ai_tokens_used" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"refinement" text,
	"user_request" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"rejected_reason" text
);
--> statement-breakpoint
CREATE TABLE "story_revisions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"revision_type" varchar(50) NOT NULL,
	"revision_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"payload" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stripe_webhook_logs_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_alerts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36),
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"metadata" json,
	"status" varchar(20) DEFAULT 'open',
	"resolved_at" timestamp,
	"resolved_by" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_state_audit" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"previous_status" varchar(20),
	"new_status" varchar(20) NOT NULL,
	"previous_plan" varchar(50),
	"new_plan" varchar(50),
	"change_reason" varchar(100),
	"changed_by" varchar(36),
	"stripe_event_id" varchar(255),
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"template_id" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"category" "template_category" NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"stories_snapshot" json NOT NULL,
	"change_summary" text,
	"changed_by" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "token_reservations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"estimated_tokens" integer NOT NULL,
	"actual_tokens" integer,
	"status" varchar(20) NOT NULL,
	"generation_type" varchar(50),
	"generation_id" varchar(36),
	"reserved_at" timestamp DEFAULT now(),
	"committed_at" timestamp,
	"released_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_usage_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"billing_period" varchar(7),
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"tokens_limit" integer DEFAULT 50000 NOT NULL,
	"docs_ingested" integer DEFAULT 0 NOT NULL,
	"docs_limit" integer DEFAULT 10 NOT NULL,
	"grace_period_active" boolean DEFAULT false,
	"grace_period_expires_at" timestamp,
	"archived_at" timestamp DEFAULT now(),
	"last_reset_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DEFAULT 'starter'::text;--> statement-breakpoint
DROP TYPE "public"."subscription_tier";--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('starter', 'core', 'pro', 'team', 'enterprise', 'admin');--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DEFAULT 'starter'::"public"."subscription_tier";--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DATA TYPE "public"."subscription_tier" USING "subscription_tier"::"public"."subscription_tier";--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "department" varchar(100);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_status_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "last_stripe_sync" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "grace_period_reminders_sent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing_anniversary" date;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "template_version_id" varchar(36);--> statement-breakpoint
ALTER TABLE "story_templates" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_usage" ADD COLUMN "rollover_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "workspace_usage" ADD COLUMN "rollover_percentage" numeric(3, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "workspace_usage" ADD COLUMN "rollover_balance" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "workspace_usage" ADD COLUMN "grace_period_active" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "workspace_usage" ADD COLUMN "grace_period_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_usage" ADD COLUMN "grace_period_started_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_realloc_org" ON "budget_reallocation_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_realloc_from" ON "budget_reallocation_log" USING btree ("from_department");--> statement-breakpoint
CREATE INDEX "idx_realloc_to" ON "budget_reallocation_log" USING btree ("to_department");--> statement-breakpoint
CREATE INDEX "idx_realloc_created" ON "budget_reallocation_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_custom_templates_org" ON "custom_document_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_custom_templates_creator" ON "custom_document_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_custom_templates_active" ON "custom_document_templates" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_dept_budgets_org" ON "department_budgets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_dept_budgets_dept" ON "department_budgets" USING btree ("department_name");--> statement-breakpoint
CREATE INDEX "idx_dept_budgets_usage" ON "department_budgets" USING btree ("organization_id","actions_used");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_department" ON "department_budgets" USING btree ("organization_id","department_name");--> statement-breakpoint
CREATE INDEX "idx_project_members_project" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_user" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_org" ON "project_members" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_project_user" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_story_links_story" ON "story_links" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_links_related" ON "story_links" USING btree ("related_story_id");--> statement-breakpoint
CREATE INDEX "idx_story_links_relation" ON "story_links" USING btree ("relation");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_story_relation" ON "story_links" USING btree ("story_id","related_story_id","relation");--> statement-breakpoint
CREATE INDEX "idx_story_refinements_story" ON "story_refinements" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_refinements_org" ON "story_refinements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_story_refinements_user" ON "story_refinements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_story_refinements_status" ON "story_refinements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_story_refinements_created" ON "story_refinements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_story_revisions_story" ON "story_revisions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_revisions_org" ON "story_revisions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_story_revisions_created" ON "story_revisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_story_revisions_type" ON "story_revisions" USING btree ("revision_type");--> statement-breakpoint
CREATE INDEX "idx_webhook_event_id" ON "stripe_webhook_logs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_status" ON "stripe_webhook_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_created_at" ON "stripe_webhook_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_alerts_org" ON "subscription_alerts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_status" ON "subscription_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_alerts_type" ON "subscription_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "idx_alerts_created" ON "subscription_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_org" ON "subscription_state_audit" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_changed_at" ON "subscription_state_audit" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_audit_new_status" ON "subscription_state_audit" USING btree ("new_status");--> statement-breakpoint
CREATE INDEX "idx_template_versions_template" ON "template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_template_versions_version" ON "template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_template_version" ON "template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "idx_token_res_org" ON "token_reservations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_token_res_status" ON "token_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_token_res_expires" ON "token_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_token_res_user" ON "token_reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_usage_history_org" ON "workspace_usage_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_usage_history_period" ON "workspace_usage_history" USING btree ("billing_period_start","billing_period_end");--> statement-breakpoint
CREATE INDEX "idx_usage_history_billing_period" ON "workspace_usage_history" USING btree ("organization_id","billing_period");--> statement-breakpoint
CREATE INDEX "idx_usage_history_archived" ON "workspace_usage_history" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "idx_templates_version" ON "story_templates" USING btree ("id","version");