ALTER TABLE "stories" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "status" SET DEFAULT 'backlog'::text;--> statement-breakpoint
DROP TYPE "public"."story_status";--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('backlog', 'ready', 'in_progress', 'review', 'done', 'blocked');--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "status" SET DEFAULT 'backlog'::"public"."story_status";--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "status" SET DATA TYPE "public"."story_status" USING "status"::"public"."story_status";