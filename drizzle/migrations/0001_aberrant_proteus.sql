ALTER TABLE "stories" ADD COLUMN "organization_id" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "story_type" "story_type" DEFAULT 'feature';--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "labels" json;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "ai_validation_score" smallint;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "ai_suggestions" json;--> statement-breakpoint
CREATE INDEX "idx_stories_org" ON "stories" USING btree ("organization_id");