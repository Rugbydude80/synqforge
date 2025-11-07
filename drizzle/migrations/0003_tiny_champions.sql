CREATE TYPE "public"."digest_frequency" AS ENUM('real_time', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('pdf', 'docx', 'txt', 'md');--> statement-breakpoint
CREATE TYPE "public"."notification_entity" AS ENUM('story', 'epic', 'sprint', 'comment', 'project');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('story_assigned', 'comment_mention', 'sprint_starting', 'story_blocked', 'epic_completed', 'comment_reply');--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"comment_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"emoji" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" varchar(36) PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true,
	"in_app_enabled" boolean DEFAULT true,
	"notify_on_mention" boolean DEFAULT true,
	"notify_on_assignment" boolean DEFAULT true,
	"notify_on_sprint_changes" boolean DEFAULT true,
	"digest_frequency" "digest_frequency" DEFAULT 'real_time'
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"type" "notification_type" NOT NULL,
	"entity_type" "notification_entity" NOT NULL,
	"entity_id" varchar(36) NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false,
	"action_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"project_id" varchar(36) NOT NULL,
	"uploaded_by" varchar(36) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" "file_type" NOT NULL,
	"file_size" integer NOT NULL,
	"file_bytes" "bytea" NOT NULL,
	"extracted_content" text,
	"generated_story_ids" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sprint_analytics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"sprint_id" varchar(36) NOT NULL,
	"day_number" smallint NOT NULL,
	"remaining_points" integer NOT NULL,
	"completed_points" integer NOT NULL,
	"scope_changes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "story_comments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"story_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"content" text NOT NULL,
	"parent_comment_id" varchar(36),
	"mentions" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "planned_points" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "completed_points" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "velocity" integer;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "completion_percentage" smallint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "source_document_id" varchar(36);--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "ai_confidence_score" smallint;--> statement-breakpoint
CREATE INDEX "idx_reactions_comment" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_user" ON "comment_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_reaction" ON "comment_reactions" USING btree ("comment_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_project_docs_project" ON "project_documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_docs_uploader" ON "project_documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_project_docs_type" ON "project_documents" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "idx_analytics_sprint" ON "sprint_analytics" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_day" ON "sprint_analytics" USING btree ("sprint_id","day_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_sprint_day" ON "sprint_analytics" USING btree ("sprint_id","day_number");--> statement-breakpoint
CREATE INDEX "idx_comments_story" ON "story_comments" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_comments_user" ON "story_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "story_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "idx_comments_created" ON "story_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_stories_source_doc" ON "stories" USING btree ("source_document_id");