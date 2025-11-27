-- Create enum for webhook delivery status
DO $$ BEGIN
 CREATE TYPE "webhook_delivery_status" AS ENUM('pending', 'success', 'failed', 'retrying');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Create api_keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36),
	"key_hash" text NOT NULL,
	"key_prefix" varchar(8) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_service_key" boolean DEFAULT false NOT NULL,
	"scopes" jsonb DEFAULT '["read","write"]' NOT NULL,
	"rate_limit_per_hour" integer
);
--> statement-breakpoint
-- Create webhooks table
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"organization_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_triggered_at" timestamp,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"headers" jsonb
);
--> statement-breakpoint
-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"webhook_id" varchar(36) NOT NULL,
	"event_id" varchar(36) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"response_status" integer,
	"response_body" text,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"delivered_at" timestamp,
	"next_retry_at" timestamp,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create indexes for api_keys
CREATE INDEX IF NOT EXISTS "idx_api_keys_org" ON "api_keys" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_user" ON "api_keys" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_prefix" ON "api_keys" ("key_prefix");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_active" ON "api_keys" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_created" ON "api_keys" ("created_at");--> statement-breakpoint
-- Create indexes for webhooks
CREATE INDEX IF NOT EXISTS "idx_webhooks_org" ON "webhooks" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhooks_user" ON "webhooks" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhooks_active" ON "webhooks" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhooks_created" ON "webhooks" ("created_at");--> statement-breakpoint
-- Create indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_webhook" ON "webhook_deliveries" ("webhook_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_event" ON "webhook_deliveries" ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_status" ON "webhook_deliveries" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_next_retry" ON "webhook_deliveries" ("next_retry_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_created" ON "webhook_deliveries" ("created_at");--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "fk_api_keys_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "fk_api_keys_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhooks" ADD CONSTRAINT "fk_webhooks_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhooks" ADD CONSTRAINT "fk_webhooks_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "fk_webhook_deliveries_webhook" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

