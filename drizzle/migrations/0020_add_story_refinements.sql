CREATE TABLE IF NOT EXISTS "story_refinements" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"refinement" text NOT NULL,
	"user_request" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"rejected_reason" text,
	"ai_model_used" varchar(100),
	"ai_tokens_used" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"applied_changes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_refinements" ADD CONSTRAINT "fk_story_refinements_story" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_refinements" ADD CONSTRAINT "fk_story_refinements_org" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_refinements" ADD CONSTRAINT "fk_story_refinements_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_refinements_story" ON "story_refinements"("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_refinements_org" ON "story_refinements"("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_refinements_user" ON "story_refinements"("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_refinements_status" ON "story_refinements"("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_refinements_created" ON "story_refinements"("created_at");

