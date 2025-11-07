ALTER TYPE "public"."subscription_tier" ADD VALUE 'solo' BEFORE 'team';--> statement-breakpoint
ALTER TYPE "public"."subscription_tier" ADD VALUE 'pro' BEFORE 'business';--> statement-breakpoint
CREATE TABLE "workspace_usage" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"tokens_limit" integer DEFAULT 50000 NOT NULL,
	"docs_ingested" integer DEFAULT 0 NOT NULL,
	"docs_limit" integer DEFAULT 10 NOT NULL,
	"last_reset_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "epics" ADD COLUMN "total_stories" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "epics" ADD COLUMN "completed_stories" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "epics" ADD COLUMN "total_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "epics" ADD COLUMN "completed_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "epics" ADD COLUMN "progress_pct" numeric(5, 1) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan" text DEFAULT 'solo' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan_cycle" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "seats_included" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "projects_included" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stories_per_month" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ai_tokens_included" integer DEFAULT 50000 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "advanced_ai" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "exports_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "templates_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "rbac_level" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "audit_level" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sso_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "support_tier" text DEFAULT 'community' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "fair_use" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "docs_per_month" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "throughput_spm" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "bulk_story_limit" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "max_pages_per_upload" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_status" text DEFAULT 'inactive' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_renewal_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "velocity_cached" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "done_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_workspace_usage_org" ON "workspace_usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_usage_period" ON "workspace_usage" USING btree ("billing_period_start","billing_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_org_period" ON "workspace_usage" USING btree ("organization_id","billing_period_start");--> statement-breakpoint
CREATE INDEX "idx_epics_progress" ON "epics" USING btree ("progress_pct");--> statement-breakpoint
CREATE INDEX "idx_epics_org_status" ON "epics" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_organizations_stripe_subscription" ON "organizations" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_sprints_velocity" ON "sprints" USING btree ("project_id","velocity_cached");--> statement-breakpoint
CREATE INDEX "idx_stories_done_at" ON "stories" USING btree ("done_at");--> statement-breakpoint
CREATE INDEX "idx_stories_sprint_done" ON "stories" USING btree ("organization_id","done_at","status");