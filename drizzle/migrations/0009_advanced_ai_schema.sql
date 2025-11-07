CREATE TYPE "public"."agent_action_status" AS ENUM('pending', 'approved', 'rejected', 'executed');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('enabled', 'paused', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."ai_model_tier" AS ENUM('fast', 'balanced', 'quality');--> statement-breakpoint
CREATE TYPE "public"."artefact_type" AS ENUM('gherkin', 'postman', 'playwright', 'cypress', 'unit_test');--> statement-breakpoint
CREATE TYPE "public"."autopilot_job_status" AS ENUM('pending', 'processing', 'review', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."pii_type" AS ENUM('email', 'phone', 'ssn', 'credit_card', 'address', 'name');--> statement-breakpoint
CREATE TYPE "public"."validation_rule_type" AS ENUM('uk_spelling', 'atomic_criteria', 'max_ands', 'max_lines', 'required_fields');--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'backlog_autopilot';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'ac_validation';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'test_generation';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'planning_forecast';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'effort_scoring';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'impact_scoring';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'knowledge_search';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'inbox_parsing';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'repo_analysis';--> statement-breakpoint
ALTER TYPE "public"."ai_generation_type" ADD VALUE 'pr_summary';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'owner' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "ac_validation_results" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"overall_score" integer NOT NULL,
	"passed_rules" json DEFAULT '[]'::json,
	"failed_rules" json DEFAULT '[]'::json,
	"suggestions" json DEFAULT '[]'::json,
	"auto_fix_available" boolean DEFAULT false,
	"auto_fix_proposal" json,
	"applied_by" varchar(36),
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ac_validation_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"rule_type" "validation_rule_type" NOT NULL,
	"rule_config" json,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_actions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"agent_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"triggered_by" varchar(255),
	"action_type" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" varchar(36),
	"status" "agent_action_status" DEFAULT 'pending',
	"action_data" json,
	"result" json,
	"tokens_used" integer DEFAULT 0,
	"reviewed_by" varchar(36),
	"reviewed_at" timestamp,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_model_policies" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"feature_type" varchar(100) NOT NULL,
	"model_tier" "ai_model_tier" DEFAULT 'balanced',
	"model_name" varchar(255),
	"max_tokens_per_request" integer DEFAULT 10000,
	"enable_context_optimization" boolean DEFAULT true,
	"custom_instructions" text,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_usage_alerts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"threshold" integer NOT NULL,
	"triggered" boolean DEFAULT false,
	"triggered_at" timestamp,
	"notification_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_usage_metering" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"token_pool" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"tokens_remaining" integer DEFAULT 0 NOT NULL,
	"overage_tokens" integer DEFAULT 0 NOT NULL,
	"overage_charges" numeric(10, 2) DEFAULT '0' NOT NULL,
	"ai_actions_count" integer DEFAULT 0 NOT NULL,
	"heavy_jobs_count" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(36),
	"changes" json,
	"metadata" json,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "autopilot_jobs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"source_document_id" varchar(36),
	"input_text" text NOT NULL,
	"status" "autopilot_job_status" DEFAULT 'pending',
	"requires_review" boolean DEFAULT true,
	"generated_epic_ids" json DEFAULT '[]'::json,
	"generated_story_ids" json DEFAULT '[]'::json,
	"detected_duplicates" json DEFAULT '[]'::json,
	"detected_dependencies" json DEFAULT '[]'::json,
	"tokens_used" integer DEFAULT 0,
	"processing_time_ms" integer,
	"error_message" text,
	"reviewed_by" varchar(36),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "effort_scores" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"suggested_points" integer NOT NULL,
	"confidence" integer NOT NULL,
	"reasoning" text,
	"similar_story_ids" json DEFAULT '[]'::json,
	"approved_by" varchar(36),
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "git_integrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"project_id" varchar(36),
	"provider" varchar(50) NOT NULL,
	"repository_url" varchar(500) NOT NULL,
	"access_token" text,
	"webhook_secret" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "impact_scores" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"reach" integer,
	"impact" integer,
	"confidence" integer,
	"effort" integer,
	"rice_score" numeric(10, 2),
	"wsjf_score" numeric(10, 2),
	"reasoning" text,
	"locked_by" varchar(36),
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inbox_parsing" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"raw_content" text NOT NULL,
	"extracted_decisions" json DEFAULT '[]'::json,
	"extracted_actions" json DEFAULT '[]'::json,
	"extracted_risks" json DEFAULT '[]'::json,
	"proposed_stories" json DEFAULT '[]'::json,
	"pii_detected" boolean DEFAULT false,
	"pii_redacted" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_embeddings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"embedding" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_searches" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"query" text NOT NULL,
	"results" json,
	"result_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_seats" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"included_seats" integer DEFAULT 0 NOT NULL,
	"addon_seats" integer DEFAULT 0 NOT NULL,
	"active_seats" integer DEFAULT 0 NOT NULL,
	"pending_invites" integer DEFAULT 0 NOT NULL,
	"last_seat_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pii_detections" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(36) NOT NULL,
	"pii_type" "pii_type" NOT NULL,
	"detected_value" text,
	"masked_value" text,
	"position" json,
	"handled_by" varchar(36),
	"handled_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pr_summaries" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"story_id" varchar(36),
	"git_integration_id" varchar(36) NOT NULL,
	"pr_number" integer NOT NULL,
	"pr_url" varchar(500),
	"pr_title" varchar(255),
	"summary" text,
	"files_changed" integer,
	"lines_added" integer,
	"lines_removed" integer,
	"status" varchar(50),
	"linked_story_ids" json DEFAULT '[]'::json,
	"drift_detected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sprint_forecasts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"forecast_date" timestamp NOT NULL,
	"average_velocity" numeric(8, 2),
	"suggested_capacity" integer,
	"spillover_probability" integer,
	"confidence_50_date" date,
	"confidence_75_date" date,
	"confidence_90_date" date,
	"forecast_data" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'member',
	"invited_by" varchar(36) NOT NULL,
	"status" "invitation_status" DEFAULT 'pending',
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_artefacts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"artefact_type" "artefact_type" NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"linked_ac_ids" json DEFAULT '[]'::json,
	"metadata" json,
	"generated_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "token_balances" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"purchased_tokens" integer DEFAULT 0 NOT NULL,
	"used_tokens" integer DEFAULT 0 NOT NULL,
	"bonus_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"last_purchase_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "token_balances_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_agents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"agent_name" varchar(255) NOT NULL,
	"description" text,
	"status" "agent_status" DEFAULT 'enabled',
	"trigger_event" varchar(100) NOT NULL,
	"scope" json,
	"rate_limit_per_hour" integer DEFAULT 60,
	"token_cap_per_action" integer DEFAULT 5000,
	"requires_approval" boolean DEFAULT true,
	"action_config" json,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DEFAULT 'free'::text;--> statement-breakpoint
DROP TYPE "public"."subscription_tier";--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'team', 'business', 'enterprise');--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DEFAULT 'free'::"public"."subscription_tier";--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "subscription_tier" SET DATA TYPE "public"."subscription_tier" USING "subscription_tier"::"public"."subscription_tier";--> statement-breakpoint
ALTER TABLE "stripe_subscriptions" ADD COLUMN "billing_interval" "billing_interval" DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "stripe_subscriptions" ADD COLUMN "included_seats" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "stripe_subscriptions" ADD COLUMN "addon_seats" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "idx_ac_validation_story" ON "ac_validation_results" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_ac_validation_org" ON "ac_validation_results" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ac_validation_score" ON "ac_validation_results" USING btree ("overall_score");--> statement-breakpoint
CREATE INDEX "idx_ac_rules_org" ON "ac_validation_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ac_rules_type" ON "ac_validation_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "idx_ac_rules_active" ON "ac_validation_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_agent_actions_agent" ON "agent_actions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_actions_org" ON "agent_actions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_agent_actions_status" ON "agent_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_model_policies_org" ON "ai_model_policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_model_policies_feature" ON "ai_model_policies" USING btree ("feature_type");--> statement-breakpoint
CREATE INDEX "idx_usage_alerts_org" ON "ai_usage_alerts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_usage_alerts_triggered" ON "ai_usage_alerts" USING btree ("triggered");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_org" ON "ai_usage_metering" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_period" ON "ai_usage_metering" USING btree ("billing_period_start","billing_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_org_period" ON "ai_usage_metering" USING btree ("organization_id","billing_period_start");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_autopilot_org" ON "autopilot_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_autopilot_project" ON "autopilot_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_autopilot_status" ON "autopilot_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_autopilot_user" ON "autopilot_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_effort_scores_story" ON "effort_scores" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_effort_scores_org" ON "effort_scores" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_git_integrations_org" ON "git_integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_git_integrations_project" ON "git_integrations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_git_integrations_active" ON "git_integrations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_impact_scores_story" ON "impact_scores" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_impact_scores_org" ON "impact_scores" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_impact_scores_rice" ON "impact_scores" USING btree ("rice_score");--> statement-breakpoint
CREATE INDEX "idx_inbox_org" ON "inbox_parsing" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_inbox_user" ON "inbox_parsing" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_inbox_type" ON "inbox_parsing" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_knowledge_org" ON "knowledge_embeddings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_source" ON "knowledge_embeddings" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_searches_org" ON "knowledge_searches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_searches_user" ON "knowledge_searches" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_org_seats_org" ON "organization_seats" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_pii_org" ON "pii_detections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_pii_resource" ON "pii_detections" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_pii_type" ON "pii_detections" USING btree ("pii_type");--> statement-breakpoint
CREATE INDEX "idx_pr_summaries_org" ON "pr_summaries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_pr_summaries_story" ON "pr_summaries" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_pr_summaries_integration" ON "pr_summaries" USING btree ("git_integration_id");--> statement-breakpoint
CREATE INDEX "idx_pr_summaries_drift" ON "pr_summaries" USING btree ("drift_detected");--> statement-breakpoint
CREATE INDEX "idx_forecasts_project" ON "sprint_forecasts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_forecasts_org" ON "sprint_forecasts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_forecasts_date" ON "sprint_forecasts" USING btree ("forecast_date");--> statement-breakpoint
CREATE INDEX "idx_invitations_org" ON "team_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_invitations_email" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invitations_token" ON "team_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_invitations_status" ON "team_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invitations_expires" ON "team_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_test_artefacts_story" ON "test_artefacts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_test_artefacts_org" ON "test_artefacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_test_artefacts_type" ON "test_artefacts" USING btree ("artefact_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_token_balances_org" ON "token_balances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_agents_org" ON "workflow_agents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_agents_status" ON "workflow_agents" USING btree ("status");