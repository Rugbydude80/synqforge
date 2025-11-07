CREATE TYPE "public"."template_category" AS ENUM('authentication', 'crud', 'payments', 'notifications', 'admin', 'api', 'custom');--> statement-breakpoint
CREATE TABLE "story_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"category" "template_category" NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_by" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_stories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"template_id" varchar(36) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"acceptance_criteria" json,
	"story_points" smallint,
	"story_type" "story_type" DEFAULT 'feature',
	"tags" json,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_templates_org" ON "story_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_templates_category" ON "story_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_templates_public" ON "story_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_templates_creator" ON "story_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_template_stories_template" ON "template_stories" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_template_stories_order" ON "template_stories" USING btree ("template_id","order");